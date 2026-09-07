import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { evaluateResilience } from '../core/risk-engine.mjs';
import { advanceWorkOrder, buildOccurrence, duplicateCandidates, nearestStreet, triageOccurrence } from '../core/operation-core.mjs';
import { assessICI, ALLOWED_MEDIA_TYPES, decodeEvidenceBase64, extensionForMediaType, sanitizeFilename, sha256 } from '../core/evidence-core.mjs';
import { bearerToken, cpfFingerprint, hasPermission, hashPassword, issueAccessToken, normalizeCpf, normalizeEmail, redactUser, requirePermission, verifyAccessToken, verifyPassword } from '../core/security-core.mjs';
import { activeAlerts, createEvaluation, createValidatedScore, dashboardSummary, inferPriority, publicOccurrence, quarterKey, rankingForQuarter, validateFieldTransition, warrantyMatches } from '../core/business-core.mjs';
import { occurrencesCsv, occurrencesXlsx, simplePdfReport } from '../core/reporting-core.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(__dirname,'..');
const VERSION='0.5.0-alpha.1';
const PORT=Number(process.env.URBIS_PORT??3100);
const HOST=process.env.URBIS_HOST??'127.0.0.1';
const LOOPBACK=new Set(['127.0.0.1','localhost','::1']).has(HOST);
const DEMO_PASSWORD=process.env.URBIS_DEMO_PASSWORD??'UrbisLocal!2026';
const TOKEN_SECRET=process.env.URBIS_TOKEN_SECRET??(LOOPBACK?'URBIS_LOCAL_ALPHA_TOKEN_SECRET_CHANGE_BEFORE_DEPLOYMENT_2026':null);
const PII_SECRET=process.env.URBIS_PII_HMAC_SECRET??(LOOPBACK?'URBIS_LOCAL_PII_HMAC_SECRET_CHANGE_BEFORE_DEPLOYMENT_2026':null);
if(!TOKEN_SECRET) throw new Error('URBIS_TOKEN_SECRET is required outside loopback mode');if(!PII_SECRET) throw new Error('URBIS_PII_HMAC_SECRET is required outside loopback mode');

const csv=fs.readFileSync(path.join(root,'data/territorial/ceps_parauapebas_2025.csv'),'utf8').split(/\r?\n/);
const header=csv[0].split(',');
function parseCsvLine(line){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){out.push(cur);cur='';}else cur+=c;}out.push(cur);return Object.fromEntries(header.map((h,i)=>[h,out[i]??'']));}
const cepIndex=new Map();
for(const line of csv.slice(1)){if(!line.trim())continue;const r=parseCsvLine(line);if(!cepIndex.has(r.cep))cepIndex.set(r.cep,[]);cepIndex.get(r.cep).push(r);}

const streetsPath=path.join(root,'data/territorial/logradouros_parauapebas_2025.operational.geojson');
const streets=JSON.parse(fs.readFileSync(streetsPath,'utf8'));
const streetMeta=JSON.parse(fs.readFileSync(path.join(root,'data/territorial/logradouros_parauapebas_2025.metadata.json'),'utf8'));
const operationalFeatures=streets.features;
const evidenceRoot=path.join(root,'storage/evidence');
fs.mkdirSync(evidenceRoot,{recursive:true});

const state={occurrences:[],workOrders:[],events:[],evidence:[],users:[],evaluations:[],scores:[],alerts:[],contracts:[],notifications:[],devices:[],teams:[],teamMembers:[],privacyRequests:[],protocolSeq:1};
const wsClients=new Set();
const sseClients=new Set();
const requestDurations=[];
const requestCounts=new Map();
const LOCAL_RATE_LIMIT_PER_MINUTE=Math.max(600,Number(process.env.URBIS_RATE_LIMIT_PER_MINUTE??12000));
function seedUser(email,displayName,roles){const user={id:crypto.randomUUID(),email:normalizeEmail(email),displayName,roles,passwordHash:hashPassword(DEMO_PASSWORD),createdAt:new Date().toISOString()};state.users.push(user);return user;}
const citizenDemo=seedUser('citizen@urbis.local','Cidadão Demonstração',['CITIZEN']);
const operatorDemo=seedUser('operator@urbis.local','Operador URBIS',['OPERATOR']);
const fieldDemo=seedUser('field@urbis.local','Equipe de Campo',['FIELD_AGENT']);
const managerDemo=seedUser('manager@urbis.local','Gestor URBIS',['MANAGER']);
const adminDemo=seedUser('admin@urbis.local','Administrador URBIS',['ADMIN']);
const demoTeam={id:crypto.randomUUID(),code:'FIELD-DEMO',name:'Equipe de Campo Demonstração',organizationCode:'URBIS_FIELD_PROOF',active:true};state.teams.push(demoTeam);state.teamMembers.push({teamId:demoTeam.id,userId:fieldDemo.id,active:true});

function protocol(){return `URB-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${String(state.protocolSeq++).padStart(7,'0')}`;}
function event(topic,entityType,entityId,payload){const e={topic,entityType,entityId,payload,at:new Date().toISOString()};state.events.push(e);for(const sock of wsClients)sendWs(sock,JSON.stringify(e));return e;}
function publicEvent(topic,payload){const e={topic,payload,at:new Date().toISOString()};for(const res of sseClients){try{res.write(`event: ${topic}\ndata: ${JSON.stringify(e)}\n\n`);}catch{sseClients.delete(res);}}return e;}
function queueNotification(userId,templateCode,payload={},occurrenceId=null){const n={id:crypto.randomUUID(),userId,occurrenceId,channel:'IN_APP',templateCode,payload,status:'PENDING',createdAt:new Date().toISOString()};state.notifications.push(n);return n;}
function securityHeaders(){return {'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','permissions-policy':'camera=(self), geolocation=(self)','content-security-policy':"default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; script-src 'self'"};}
function corsHeaders(){return {'access-control-allow-origin':'*','access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,POST,PUT,OPTIONS'};}
function send(res,code,obj,extra={}){const body=JSON.stringify(obj,null,2);res.writeHead(code,{'content-type':'application/json; charset=utf-8',...corsHeaders(),...securityHeaders(),...extra});res.end(body);}
function sendBinary(res,code,body,contentType,filename){res.writeHead(code,{'content-type':contentType,'content-disposition':`attachment; filename=\"${filename}\"`,'content-length':body.length,...corsHeaders(),...securityHeaders()});res.end(body);}
function sendFile(res,file,contentType){res.writeHead(200,{'content-type':contentType,...corsHeaders(),...securityHeaders(),'cache-control':'no-store'});fs.createReadStream(file).pipe(res);}
function bodyJson(req){return new Promise((resolve,reject)=>{let body='';const limit=14_000_000;req.on('data',c=>{body+=c;if(body.length>limit){reject(new Error('body_too_large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'));}catch{reject(new Error('invalid_json'));}});req.on('error',reject);});}
function currentUser(req){const token=bearerToken(req.headers);if(!token)return null;const claims=verifyAccessToken(token,{secret:TOKEN_SECRET});const user=state.users.find(u=>u.id===claims.sub);if(!user||user.active===false)return null;return {...redactUser(user),roles:claims.roles};}
function authorized(req,permission){const user=currentUser(req);requirePermission(user,permission);return user;}
function canReadOccurrence(user,o){return hasPermission(user,'occurrence:read:any')||(hasPermission(user,'occurrence:read:self')&&o.reporterUserId===user.id)||(hasPermission(user,'occurrence:read:assigned')&&assignedToOccurrence(user,o));}
function assignedToOccurrence(user,o){const teamIds=state.teamMembers.filter(m=>m.userId===user.id&&m.active).map(m=>m.teamId);return state.workOrders.some(w=>w.occurrenceId===o.id&&teamIds.includes(w.teamId));}
function canUploadEvidence(user,o){return hasPermission(user,'evidence:upload:any')||(hasPermission(user,'evidence:upload:self')&&o.reporterUserId===user.id)||(hasPermission(user,'evidence:upload:assigned')&&assignedToOccurrence(user,o));}

function eachCoord(geom,fn){if(!geom)return;const c=geom.coordinates;if(geom.type==='MultiLineString')for(const line of c)for(const p of line)fn(p);else if(geom.type==='LineString')for(const p of c)fn(p);}
function featureBounds(ft){let b=[180,90,-180,-90];eachCoord(ft.geometry,([x,y])=>{b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);});return b;}
const features=operationalFeatures.map(ft=>({ft,bbox:featureBounds(ft)}));
function intersects(a,b){return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
function parseBbox(v){if(!v)return null;const p=v.split(',').map(Number);return p.length===4&&p.every(Number.isFinite)?p:null;}
function summary(){return {...dashboardSummary(state),evidence:state.evidence.length,websocketClients:wsClients.size,sseClients:sseClients.size,eventCount:state.events.length,notifications:state.notifications.length};}
function p95(){if(!requestDurations.length)return 0;const a=[...requestDurations].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*0.95))];}
function territoryFor(lon,lat){const n=nearestStreet(operationalFeatures,lon,lat,120);if(!n)return {matched:false};const p=n.feature.properties;return {matched:true,streetSegmentSourceIndex:p._source_index??null,streetName:p.nom_novo??p.logradouro??null,streetType:p.tipo_log??null,cep:p.cep??null,neighborhood:p.bairro??null,zone:p.Zona??null,distanceM:Number(n.distanceM.toFixed(3)),source:'Logradouros 2025'};}
function getOccurrence(id){return state.occurrences.find(o=>o.id===id);}
function getWorkOrder(id){return state.workOrders.find(w=>w.id===id);}
function evidenceForOccurrence(id){return state.evidence.filter(e=>e.occurrenceId===id);}
function corroborationCount(o){const d=duplicateCandidates(state.occurrences.filter(x=>x.id!==o.id),o,{radiusM:35,windowHours:24});return d.length;}
function recomputeICI(o,e,user){const ici=assessICI({occurrence:o,evidence:e,user,corroborationCount:corroborationCount(o),authorityValidated:Boolean(e.authorityValidated)});e.ici=ici;o.ici=ici;o.updatedAt=new Date().toISOString();return ici;}

function createEvidence(o,b,user){
  if(!canUploadEvidence(user,o))throw new Error('forbidden');
  const mediaType=String(b.mediaType??'').toLowerCase();
  if(!ALLOWED_MEDIA_TYPES.has(mediaType))throw new Error('unsupported_media_type');
  const buffer=decodeEvidenceBase64(b.dataBase64,{maxBytes:8*1024*1024});
  const digest=sha256(buffer),ext=extensionForMediaType(mediaType),dir=path.join(evidenceRoot,digest.slice(0,2));fs.mkdirSync(dir,{recursive:true});
  const localPath=path.join(dir,`${digest}${ext}`);if(!fs.existsSync(localPath))fs.writeFileSync(localPath,buffer,{flag:'wx'});
  const lat=b.latitude==null?null:Number(b.latitude),lon=b.longitude==null?null:Number(b.longitude);
  if((lat!=null&&!Number.isFinite(lat))||(lon!=null&&!Number.isFinite(lon)))throw new Error('invalid_evidence_coordinates');
  const purpose=['REPORT','BEFORE','AFTER','FIELD'].includes(String(b.purpose??'REPORT').toUpperCase())?String(b.purpose??'REPORT').toUpperCase():'REPORT';const e={id:crypto.randomUUID(),occurrenceId:o.id,purpose,originalFilename:sanitizeFilename(b.filename??`evidence${ext}`),mediaType,byteLength:buffer.length,sha256:digest,hashVerified:sha256(fs.readFileSync(localPath))===digest,objectKey:path.relative(root,localPath).replaceAll('\\','/'),capturedAt:b.capturedAt??null,latitude:lat,longitude:lon,uploadedBy:user.id,authorityValidated:false,validatedBy:null,createdAt:new Date().toISOString()};
  recomputeICI(o,e,user);state.evidence.push(e);o.evidenceState='EVIDENCE_VALIDATED';event('evidence.created','evidence',e.id,{occurrenceId:o.id,sha256:e.sha256,byteLength:e.byteLength,ici:e.ici});return e;
}

const panelDir=path.join(root,'apps/panel-gis-proof');
const citizenDir=path.join(root,'apps/citizen-web-proof');
const fieldDir=path.join(root,'apps/field-web-proof');
const publicDir=path.join(root,'apps/public-web-proof');
const server=http.createServer(async(req,res)=>{
  const started=process.hrtime.bigint();res.on('finish',()=>{const ms=Number(process.hrtime.bigint()-started)/1e6;requestDurations.push(ms);if(requestDurations.length>2000)requestDurations.shift();});
  const ip=req.socket.remoteAddress??'local',bucket=Math.floor(Date.now()/60000),rk=`${ip}:${bucket}`;requestCounts.set(rk,(requestCounts.get(rk)??0)+1);if((requestCounts.get(rk)??0)>LOCAL_RATE_LIMIT_PER_MINUTE)return send(res,429,{error:'rate_limit_exceeded'});
  const u=new URL(req.url||'/',`http://${HOST}:${PORT}`);
  if(req.method==='OPTIONS'){res.writeHead(204,corsHeaders());return res.end();}
  try{
    if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{status:'ok',service:'urbis-local-probe',version:VERSION,street_features:operationalFeatures.length,auth:'RBAC-HS256-local-proof',storage:'content-addressed-local-proof',...summary()});

    if(req.method==='POST'&&u.pathname==='/v1/auth/login'){
      const b=await bodyJson(req);let user=null;if(b.cpf){const h=cpfFingerprint(b.cpf,{secret:PII_SECRET});user=state.users.find(x=>x.cpfHash===h);}else{const email=normalizeEmail(b.email);user=state.users.find(x=>x.email===email);}
      if(!user||!verifyPassword(String(b.password??''),user.passwordHash))return send(res,401,{error:'invalid_credentials'});
      const accessToken=issueAccessToken(user,{secret:TOKEN_SECRET,ttlSeconds:3600});return send(res,200,{accessToken,tokenType:'Bearer',expiresIn:3600,user:redactUser(user)});
    }
    if(req.method==='POST'&&u.pathname==='/v1/auth/register'){
      const b=await bodyJson(req),email=normalizeEmail(b.email);if(state.users.some(x=>x.email===email))return send(res,409,{error:'email_already_exists'});const cpfHash=b.cpf?cpfFingerprint(b.cpf,{secret:PII_SECRET}):null;if(cpfHash&&state.users.some(x=>x.cpfHash===cpfHash))return send(res,409,{error:'cpf_already_exists'});
      const user={id:crypto.randomUUID(),email,cpfHash,displayName:String(b.displayName??'Cidadão').trim().slice(0,120)||'Cidadão',roles:['CITIZEN'],passwordHash:hashPassword(b.password),active:true,createdAt:new Date().toISOString()};state.users.push(user);
      const accessToken=issueAccessToken(user,{secret:TOKEN_SECRET,ttlSeconds:3600});return send(res,201,{accessToken,tokenType:'Bearer',expiresIn:3600,user:redactUser(user)});
    }
    if(req.method==='GET'&&u.pathname==='/v1/auth/me'){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});return send(res,200,user);}


    if(req.method==='GET'&&u.pathname==='/metrics'){
      const sm=summary();const body=[
        '# HELP urbis_http_request_p95_ms Local proof HTTP request p95 latency.','# TYPE urbis_http_request_p95_ms gauge',`urbis_http_request_p95_ms ${p95().toFixed(3)}`,
        '# HELP urbis_occurrences_total Total occurrences in local proof.','# TYPE urbis_occurrences_total gauge',`urbis_occurrences_total ${sm.occurrences}`,
        '# HELP urbis_websocket_clients Connected operational WebSocket clients.','# TYPE urbis_websocket_clients gauge',`urbis_websocket_clients ${wsClients.size}`,
        '# HELP urbis_public_sse_clients Connected public SSE clients.','# TYPE urbis_public_sse_clients gauge',`urbis_public_sse_clients ${sseClients.size}`
      ].join('\n')+'\n';res.writeHead(200,{'content-type':'text/plain; version=0.0.4; charset=utf-8',...securityHeaders()});return res.end(body);
    }
    if(req.method==='GET'&&u.pathname==='/public/summary')return send(res,200,summary());
    if(req.method==='GET'&&u.pathname==='/public/occurrences'){
      let records=state.occurrences.map(o=>publicOccurrence(o));const status=u.searchParams.get('status'),cat=u.searchParams.get('categoryCode'),bairro=(u.searchParams.get('bairro')||'').toLowerCase();if(status)records=records.filter(o=>o.status===status.toUpperCase());if(cat)records=records.filter(o=>o.categoryCode===cat.toUpperCase());if(bairro)records=records.filter(o=>String(o.neighborhood||'').toLowerCase()===bairro);return send(res,200,{count:records.length,records});
    }
    const ppm=u.pathname.match(/^\/public\/protocol\/([^/]+)$/i);
    if(req.method==='GET'&&ppm){const o=state.occurrences.find(x=>x.protocol===decodeURIComponent(ppm[1]));return o?send(res,200,publicOccurrence(o)):send(res,404,{error:'protocol_not_found'});}
    if(req.method==='GET'&&u.pathname==='/public/stream'){
      res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache','connection':'keep-alive',...corsHeaders(),...securityHeaders()});res.write(`event: ready\ndata: ${JSON.stringify({version:VERSION,privacy:'generalized'})}\n\n`);sseClients.add(res);req.on('close',()=>sseClients.delete(res));return;
    }
    if(req.method==='GET'&&u.pathname==='/v1/rankings/current'){return send(res,200,{quarter:quarterKey(),records:rankingForQuarter(state.scores,state.users,{quarter:quarterKey()})});}
    if(req.method==='GET'&&u.pathname==='/v1/alerts'){
      const lat=u.searchParams.get('lat')==null?null:Number(u.searchParams.get('lat')),lon=u.searchParams.get('lon')==null?null:Number(u.searchParams.get('lon'));return send(res,200,{count:activeAlerts(state.alerts,{lat,lon}).length,records:activeAlerts(state.alerts,{lat,lon})});
    }

    if(req.method==='GET'&&u.pathname==='/v1/operations/summary'){authorized(req,'operations:read');return send(res,200,summary());}

    if(req.method==='GET'&&u.pathname==='/v1/dashboard/summary'){authorized(req,'operations:read');return send(res,200,summary());}
    if(req.method==='GET'&&u.pathname==='/v1/me/score'){
      const user=authorized(req,'score:read:self');const rows=state.scores.filter(x=>x.userId===user.id);return send(res,200,{userId:user.id,totalPoints:rows.reduce((a,x)=>a+Number(x.points||0),0),quarter:quarterKey(),quarterPoints:rows.filter(x=>quarterKey(x.createdAt)===quarterKey()).reduce((a,x)=>a+Number(x.points||0),0),records:rows});
    }
    if(req.method==='GET'&&u.pathname==='/v1/me/notifications'){
      const user=authorized(req,'notification:read:self');return send(res,200,{count:state.notifications.filter(n=>n.userId===user.id).length,records:state.notifications.filter(n=>n.userId===user.id).reverse()});
    }
    if(req.method==='POST'&&u.pathname==='/v1/me/devices'){
      const user=authorized(req,'device:register:self'),b=await bodyJson(req),token=String(b.token??'').trim();if(token.length<8)return send(res,400,{error:'invalid_device_token'});const d={id:crypto.randomUUID(),userId:user.id,platform:String(b.platform??'WEB').toUpperCase(),provider:'FCM',token,enabled:true,createdAt:new Date().toISOString()};const prior=state.devices.find(x=>x.token===token);if(prior)Object.assign(prior,d,{id:prior.id});else state.devices.push(d);return send(res,201,{device:prior??d,note:'FCM delivery is queued structurally; external Firebase credentials are not present in local proof.'});
    }
    if(req.method==='POST'&&u.pathname==='/v1/me/privacy-requests'){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});const b=await bodyJson(req),type=String(b.requestType??'').toUpperCase();if(!['ACCESS','CORRECTION','ANONYMIZATION','DELETION','PORTABILITY'].includes(type))return send(res,400,{error:'invalid_privacy_request_type'});const r={id:crypto.randomUUID(),userId:user.id,requestType:type,details:b.details??{},status:'PENDING',createdAt:new Date().toISOString()};state.privacyRequests.push(r);return send(res,201,{request:r,note:'Solicitação registrada para análise; não há exclusão automática de registros públicos ou sujeitos a retenção legal.'});}
    if(req.method==='GET'&&u.pathname==='/v1/me/privacy-requests'){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});const records=state.privacyRequests.filter(x=>x.userId===user.id);return send(res,200,{count:records.length,records});}
    if(req.method==='POST'&&u.pathname==='/v1/alerts'){
      const user=authorized(req,'alert:write'),b=await bodyJson(req);const a={id:crypto.randomUUID(),severity:String(b.severity??'ATTENTION').toUpperCase(),alertColor:String(b.alertColor??'ORANGE').toUpperCase(),hazardCode:String(b.hazardCode??'GENERAL').toUpperCase(),title:String(b.title??'Alerta URBIS').slice(0,160),details:b.details??{},area:b.area??null,issuedAt:b.issuedAt??new Date().toISOString(),expiresAt:b.expiresAt??null,authorityValidated:true,validatedBy:user.id};state.alerts.push(a);publicEvent('alert.issued',{id:a.id,severity:a.severity,hazardCode:a.hazardCode,title:a.title,issuedAt:a.issuedAt,expiresAt:a.expiresAt});return send(res,201,{alert:a});
    }
    if(req.method==='POST'&&u.pathname==='/v1/contracts'){
      authorized(req,'contract:read');const b=await bodyJson(req);const c={id:crypto.randomUUID(),contractNumber:String(b.contractNumber??'').trim(),contractorName:b.contractorName??null,streetName:b.streetName??null,neighborhood:b.neighborhood??null,warrantyUntil:b.warrantyUntil??null,area:b.area??null,source:'MANUAL_CONFIGURATION_ALPHA'};if(!c.contractNumber)return send(res,400,{error:'contract_number_required'});state.contracts.push(c);return send(res,201,{contract:c});
    }
    if(req.method==='GET'&&u.pathname==='/v1/reports/occurrences.csv'){authorized(req,'report:export');return sendBinary(res,200,occurrencesCsv(state.occurrences),'text/csv; charset=utf-8','urbis-occurrences.csv');}
    if(req.method==='GET'&&u.pathname==='/v1/reports/occurrences.xlsx'){authorized(req,'report:export');return sendBinary(res,200,occurrencesXlsx(state.occurrences),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','urbis-occurrences.xlsx');}
    if(req.method==='GET'&&u.pathname==='/v1/reports/occurrences.pdf'){authorized(req,'report:export');const lines=state.occurrences.map(o=>`${o.protocol} | ${o.categoryCode} | ${o.status} | ${o.territory?.neighborhood??''}`);return sendBinary(res,200,simplePdfReport({title:'URBIS - Relatório de Ocorrências',lines}),'application/pdf','urbis-occurrences.pdf');}

    if(req.method==='GET'&&u.pathname==='/v1/territory/stats')return send(res,200,streetMeta);
    const cm=u.pathname.match(/^\/v1\/territory\/cep\/(\d{5}-?\d{3})$/);
    if(req.method==='GET'&&cm){const cep=cm[1].includes('-')?cm[1]:cm[1].slice(0,5)+'-'+cm[1].slice(5);const rows=cepIndex.get(cep)||[];return send(res,rows.length?200:404,{cep,count:rows.length,records:rows});}
    if(req.method==='GET'&&u.pathname==='/v1/territory/streets'){const bbox=parseBbox(u.searchParams.get('bbox')),limit=Math.max(1,Math.min(Number(u.searchParams.get('limit')||500),5000)),bairro=(u.searchParams.get('bairro')||'').toLowerCase(),zone=(u.searchParams.get('zone')||'').toLowerCase();const arr=features.filter(({ft,bbox:fb})=>(!bbox||intersects(fb,bbox))&&(!bairro||String(ft.properties.bairro||'').toLowerCase()===bairro)&&(!zone||String(ft.properties.Zona||'').toLowerCase()===zone)).slice(0,limit).map(x=>x.ft);return send(res,200,{type:'FeatureCollection',count:arr.length,features:arr});}
    if(req.method==='GET'&&u.pathname==='/v1/territory/nearest'){const lat=Number(u.searchParams.get('lat')),lon=Number(u.searchParams.get('lon'));if(!Number.isFinite(lat)||!Number.isFinite(lon))return send(res,400,{error:'lat_lon_required'});const n=nearestStreet(operationalFeatures,lon,lat,120);return send(res,200,{query:{lat,lon},result:n?{distance_m:n.distanceM,properties:n.feature.properties}:null});}
    if(req.method==='POST'&&u.pathname==='/v1/resilience/evaluate'){const b=await bodyJson(req);return send(res,200,evaluateResilience(b));}


    if(req.method==='GET'&&u.pathname==='/v1/occurrences/map'){
      authorized(req,'occurrence:read:any');let records=[...state.occurrences];const status=u.searchParams.get('status'),cat=u.searchParams.get('categoryCode'),bairro=(u.searchParams.get('bairro')||'').toLowerCase(),from=u.searchParams.get('from'),to=u.searchParams.get('to');if(status)records=records.filter(o=>o.status===status.toUpperCase());if(cat)records=records.filter(o=>o.categoryCode===cat.toUpperCase());if(bairro)records=records.filter(o=>String(o.territory?.neighborhood||'').toLowerCase()===bairro);if(from)records=records.filter(o=>Date.parse(o.createdAt)>=Date.parse(from));if(to)records=records.filter(o=>Date.parse(o.createdAt)<=Date.parse(to));return send(res,200,{count:records.length,records});
    }

    if(req.method==='GET'&&u.pathname==='/v1/occurrences'){
      authorized(req,'occurrence:read:any');let records=[...state.occurrences].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));const status=u.searchParams.get('status'),cat=u.searchParams.get('categoryCode');if(status)records=records.filter(o=>o.status===status.toUpperCase());if(cat)records=records.filter(o=>o.categoryCode===cat.toUpperCase());return send(res,200,{count:records.length,records});
    }
    if(req.method==='GET'&&u.pathname==='/v1/me/occurrences'){
      const user=authorized(req,'occurrence:read:self');const records=state.occurrences.filter(o=>o.reporterUserId===user.id).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));return send(res,200,{count:records.length,records});
    }
    if(req.method==='POST'&&u.pathname==='/v1/occurrences'){
      const user=authorized(req,'occurrence:create');const b=await bodyJson(req);
      if(b.clientRequestId){const prior=state.occurrences.find(o=>o.clientRequestId===b.clientRequestId&&o.reporterUserId===user.id);if(prior)return send(res,200,{occurrence:prior,duplicates:[],idempotent:true});}
      const territory=territoryFor(Number(b.longitude),Number(b.latitude));const built=buildOccurrence(b,{protocol:protocol(),territory,existing:state.occurrences});const pr=inferPriority({categoryCode:b.categoryCode,manualPriority:b.priority});built.occurrence.priority=pr.priority;built.occurrence.prioritySource=pr.source;built.occurrence.clientRequestId=b.clientRequestId??null;built.occurrence.reporterUserId=user.id;built.occurrence.reporter={id:user.id,displayName:user.displayName};if(territory.matched)built.occurrence.evidenceState='GEO_VALIDATED';state.occurrences.push(built.occurrence);queueNotification(user.id,'OCCURRENCE_CREATED',{protocol:built.occurrence.protocol,status:built.occurrence.status},built.occurrence.id);event('occurrence.created','occurrence',built.occurrence.id,{...built,reporter:{id:user.id}});publicEvent('occurrence.changed',publicOccurrence(built.occurrence));return send(res,201,{...built,idempotent:false});
    }
    const om=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)$/i);
    if(req.method==='GET'&&om){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});const o=getOccurrence(om[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});if(!canReadOccurrence(user,o))return send(res,403,{error:'forbidden'});const timeline=state.events.filter(e=>(e.entityType==='occurrence'&&e.entityId===o.id)||e.payload?.occurrenceId===o.id||e.payload?.occurrence?.id===o.id);return send(res,200,{...o,timeline,evidence:evidenceForOccurrence(o.id),workOrders:hasPermission(user,'work_order:read')||hasPermission(user,'operations:read')?state.workOrders.filter(w=>w.occurrenceId===o.id):[]});}

    const em=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)\/evidence$/i);
    if(req.method==='GET'&&em){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});const o=getOccurrence(em[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});if(!canReadOccurrence(user,o)&&!hasPermission(user,'evidence:read:any')&&!(hasPermission(user,'evidence:read:assigned')&&assignedToOccurrence(user,o)))return send(res,403,{error:'forbidden'});return send(res,200,{count:evidenceForOccurrence(o.id).length,records:evidenceForOccurrence(o.id)});}
    if(req.method==='POST'&&em){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});const o=getOccurrence(em[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});const b=await bodyJson(req),e=createEvidence(o,b,user);return send(res,201,{evidence:e,occurrence:{id:o.id,protocol:o.protocol,evidenceState:o.evidenceState,ici:o.ici}});}

    const evm=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)\/evidence\/([0-9a-f-]+)\/authority-validate$/i);
    if(req.method==='POST'&&evm){const user=authorized(req,'evidence:validate'),o=getOccurrence(evm[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});const e=state.evidence.find(x=>x.id===evm[2]&&x.occurrenceId===o.id);if(!e)return send(res,404,{error:'evidence_not_found'});e.authorityValidated=true;e.validatedBy=user.id;e.validatedAt=new Date().toISOString();const ici=recomputeICI(o,e,user);o.evidenceState='AUTHORITY_VALIDATED';event('evidence.authority_validated','evidence',e.id,{occurrenceId:o.id,validatedBy:user.id,ici});return send(res,200,{evidence:e,occurrence:{id:o.id,evidenceState:o.evidenceState,ici}});}

    const im=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)\/ici$/i);
    if(req.method==='GET'&&im){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});const o=getOccurrence(im[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});if(!canReadOccurrence(user,o)&&!hasPermission(user,'evidence:read:any')&&!(hasPermission(user,'evidence:read:assigned')&&assignedToOccurrence(user,o)))return send(res,403,{error:'forbidden'});return send(res,200,{occurrenceId:o.id,protocol:o.protocol,ici:o.ici??null,evidenceState:o.evidenceState,notice:'ICI-URBIS alpha is an engineering confidence indicator, not proof of truth or authenticity.'});}


    const evalm=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)\/evaluation$/i);
    if(req.method==='POST'&&evalm){const user=authorized(req,'evaluation:create:self'),o=getOccurrence(evalm[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});if(state.evaluations.some(x=>x.occurrenceId===o.id))return send(res,409,{error:'evaluation_already_exists'});const b=await bodyJson(req),e=createEvaluation({occurrence:o,userId:user.id,rating:b.rating,comment:b.comment});state.evaluations.push(e);event('evaluation.created','evaluation',e.id,{occurrenceId:o.id,rating:e.rating});return send(res,201,{evaluation:e});}
    const scorem=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)\/score$/i);
    if(req.method==='POST'&&scorem){const user=authorized(req,'score:validate'),o=getOccurrence(scorem[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});if(state.scores.some(x=>x.occurrenceId===o.id))return send(res,409,{error:'score_already_exists'});const b=await bodyJson(req),sc=createValidatedScore({occurrence:o,userId:o.reporterUserId,basePoints:b.basePoints,bonusPoints:b.bonusPoints,reason:b.reason,validatedBy:user.id});state.scores.push(sc);queueNotification(o.reporterUserId,'CITIZEN_SCORE_VALIDATED',{protocol:o.protocol,points:sc.points},o.id);return send(res,201,{score:sc});}
    const warr=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)\/warranty-matches$/i);
    if(req.method==='GET'&&warr){authorized(req,'contract:read');const o=getOccurrence(warr[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});const matches=warrantyMatches(state.contracts,o);return send(res,200,{count:matches.length,records:matches,note:'No official contract dataset is bundled; empty result is expected until contracts are configured.'});}

    const tm=u.pathname.match(/^\/v1\/occurrences\/([0-9a-f-]+)\/triage$/i);
    if(req.method==='POST'&&tm){authorized(req,'occurrence:triage');const o=getOccurrence(tm[1]);if(!o)return send(res,404,{error:'occurrence_not_found'});const b=await bodyJson(req);const duplicateOf=b.duplicateOf??(String(b.decision).toUpperCase()==='DUPLICATE'?state.occurrences.find(x=>x.id!==o.id&&x.categoryCode===o.categoryCode)?.id:null);const out=triageOccurrence(o,b.decision,{duplicateOf,notes:b.notes});Object.assign(o,out.occurrence);if(b.priority){const pr=inferPriority({categoryCode:o.categoryCode,manualPriority:b.priority});o.priority=pr.priority;o.prioritySource=pr.source;}if(out.workOrder){out.workOrder.teamId=demoTeam.id;state.workOrders.push(out.workOrder);}queueNotification(o.reporterUserId,'OCCURRENCE_STATUS_CHANGED',{protocol:o.protocol,status:o.status},o.id);event('occurrence.triaged','occurrence',o.id,{occurrence:o,workOrder:out.workOrder});publicEvent('occurrence.changed',publicOccurrence(o));return send(res,200,{occurrence:o,workOrder:out.workOrder});}


    if(req.method==='POST'&&u.pathname==='/v1/service-orders'){
      authorized(req,'occurrence:triage');const b=await bodyJson(req),o=getOccurrence(b.occurrenceId);if(!o)return send(res,404,{error:'occurrence_not_found'});if(state.workOrders.some(w=>w.occurrenceId===o.id))return send(res,409,{error:'work_order_already_exists'});const out=triageOccurrence(o,'PROCEDENT',{notes:b.notes??'OS criada explicitamente'});Object.assign(o,out.occurrence);out.workOrder.teamId=b.teamId??demoTeam.id;state.workOrders.push(out.workOrder);return send(res,201,{workOrder:out.workOrder,occurrence:o});
    }
    const teamOs=u.pathname.match(/^\/v1\/service-orders\/team\/([0-9a-f-]+)$/i);
    if(req.method==='GET'&&teamOs){const user=currentUser(req);if(!user)return send(res,401,{error:'authentication_required'});const membership=state.teamMembers.some(m=>m.teamId===teamOs[1]&&m.userId===user.id&&m.active);if(!membership&&!hasPermission(user,'operations:read'))return send(res,403,{error:'forbidden'});const records=state.workOrders.filter(w=>w.teamId===teamOs[1]);return send(res,200,{count:records.length,records});}
    if(req.method==='GET'&&u.pathname==='/v1/field/work-orders'){
      const user=authorized(req,'field:update');const teamIds=state.teamMembers.filter(m=>m.userId===user.id&&m.active).map(m=>m.teamId);const records=state.workOrders.filter(w=>teamIds.includes(w.teamId));return send(res,200,{count:records.length,records});
    }

    const frm=u.pathname.match(/^\/v1\/field\/work-orders\/([0-9a-f-]+)\/route$/i);
    if(req.method==='GET'&&frm){const user=authorized(req,'field:update'),w=getWorkOrder(frm[1]);if(!w)return send(res,404,{error:'work_order_not_found'});if(!state.teamMembers.some(m=>m.teamId===w.teamId&&m.userId===user.id&&m.active))return send(res,403,{error:'not_assigned_to_work_order_team'});const o=getOccurrence(w.occurrenceId),lat0=Number(u.searchParams.get('lat')),lon0=Number(u.searchParams.get('lon'));if(!Number.isFinite(lat0)||!Number.isFinite(lon0))return send(res,400,{error:'origin_coordinates_required'});const dx=(o.longitude-lon0)*111320*Math.cos(lat0*Math.PI/180),dy=(o.latitude-lat0)*110540,dist=Math.hypot(dx,dy);return send(res,200,{provider:'STRAIGHT_LINE_FALLBACK',distanceM:Number(dist.toFixed(2)),destination:{latitude:o.latitude,longitude:o.longitude},notice:'Prova local sem serviço de roteamento viário; produção usa Mapbox quando MAPBOX_ACCESS_TOKEN estiver configurado.'});}

    const fwm=u.pathname.match(/^\/v1\/field\/work-orders\/([0-9a-f-]+)\/status$/i);
    if(req.method==='POST'&&fwm){const user=authorized(req,'field:update'),w=getWorkOrder(fwm[1]);if(!w)return send(res,404,{error:'work_order_not_found'});if(!state.teamMembers.some(m=>m.teamId===w.teamId&&m.userId===user.id&&m.active))return send(res,403,{error:'not_assigned_to_work_order_team'});const o=getOccurrence(w.occurrenceId),b=await bodyJson(req);const geo=validateFieldTransition({workOrder:w,occurrence:o,status:b.status,latitude:b.latitude,longitude:b.longitude});const out=advanceWorkOrder(w,o,b.status,{result:{...(b.result??{}),fieldGeo:geo}});Object.assign(w,out.workOrder);Object.assign(o,out.occurrence);w.lastFieldLocation={latitude:b.latitude??null,longitude:b.longitude??null,distanceM:geo.distanceM};queueNotification(o.reporterUserId,'OCCURRENCE_STATUS_CHANGED',{protocol:o.protocol,status:o.status},o.id);event('work_order.field_status','work_order',w.id,{workOrder:w,occurrence:o,fieldGeo:geo});publicEvent('occurrence.changed',publicOccurrence(o));return send(res,200,{workOrder:w,occurrence:o,fieldGeo:geo});}

    if(req.method==='GET'&&u.pathname==='/v1/work-orders'){const user=currentUser(req);if(!user||(!hasPermission(user,'work_order:read')&&!hasPermission(user,'operations:read')))return send(res,user?403:401,{error:user?'forbidden':'authentication_required'});return send(res,200,{count:state.workOrders.length,records:[...state.workOrders].reverse()});}
    const wm=u.pathname.match(/^\/v1\/work-orders\/([0-9a-f-]+)\/status$/i);
    if(req.method==='POST'&&wm){authorized(req,'work_order:update');const w=getWorkOrder(wm[1]);if(!w)return send(res,404,{error:'work_order_not_found'});const o=getOccurrence(w.occurrenceId);const b=await bodyJson(req);const out=advanceWorkOrder(w,o,b.status,{result:b.result??null});Object.assign(w,out.workOrder);Object.assign(o,out.occurrence);queueNotification(o.reporterUserId,'OCCURRENCE_STATUS_CHANGED',{protocol:o.protocol,status:o.status},o.id);event('work_order.status','work_order',w.id,{workOrder:w,occurrence:o});publicEvent('occurrence.changed',publicOccurrence(o));return send(res,200,{workOrder:w,occurrence:o});}


    if(req.method==='GET'&&(u.pathname==='/field'||u.pathname==='/field/'))return sendFile(res,path.join(fieldDir,'index.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/field/app.js')return sendFile(res,path.join(fieldDir,'app.js'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/field/styles.css')return sendFile(res,path.join(fieldDir,'styles.css'),'text/css; charset=utf-8');
    if(req.method==='GET'&&(u.pathname==='/public'||u.pathname==='/public/'))return sendFile(res,path.join(publicDir,'index.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/public/app.js')return sendFile(res,path.join(publicDir,'app.js'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/public/styles.css')return sendFile(res,path.join(publicDir,'styles.css'),'text/css; charset=utf-8');

    if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/panel'||u.pathname==='/panel/'))return sendFile(res,path.join(panelDir,'index.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/panel/app.js')return sendFile(res,path.join(panelDir,'app.js'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/panel/styles.css')return sendFile(res,path.join(panelDir,'styles.css'),'text/css; charset=utf-8');
    if(req.method==='GET'&&(u.pathname==='/citizen'||u.pathname==='/citizen/'))return sendFile(res,path.join(citizenDir,'index.html'),'text/html; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/citizen/app.js')return sendFile(res,path.join(citizenDir,'app.js'),'text/javascript; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/citizen/styles.css')return sendFile(res,path.join(citizenDir,'styles.css'),'text/css; charset=utf-8');
    if(req.method==='GET'&&u.pathname==='/assets/urbis-logo.png')return sendFile(res,path.join(root,'assets/source/URBIS.png'),'image/png');
    if(req.method==='GET'&&u.pathname==='/data/streets.geojson')return sendFile(res,streetsPath,'application/geo+json; charset=utf-8');
    return send(res,404,{error:'not_found'});
  }catch(e){const msg=String(e?.message??e);const code=msg==='authentication_required'?401:msg==='forbidden'?403:400;return send(res,code,{error:msg});}
});

function wsFrame(text){const p=Buffer.from(text);if(p.length<126)return Buffer.concat([Buffer.from([0x81,p.length]),p]);if(p.length<65536){const h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(p.length,2);return Buffer.concat([h,p]);}const h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(p.length),2);return Buffer.concat([h,p]);}
function sendWs(socket,text){try{socket.write(wsFrame(text));}catch{wsClients.delete(socket);}}
server.on('upgrade',(req,socket)=>{
  const u=new URL(req.url||'/',`http://${HOST}:${PORT}`);if(u.pathname!=='/ws/occurrences'){socket.destroy();return;}
  try{const token=u.searchParams.get('access_token');const claims=verifyAccessToken(token,{secret:TOKEN_SECRET});if(!hasPermission(claims,'operations:read'))throw new Error('forbidden');}catch{socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  const key=req.headers['sec-websocket-key'];if(!key){socket.destroy();return;}const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');wsClients.add(socket);sendWs(socket,JSON.stringify({topic:'connection.ready',entityType:'system',entityId:'local-probe',payload:{version:VERSION},at:new Date().toISOString()}));socket.on('close',()=>wsClients.delete(socket));socket.on('error',()=>wsClients.delete(socket));socket.on('end',()=>wsClients.delete(socket));
});

server.listen(PORT,HOST,()=>{
  console.log(`URBIS v${VERSION} painel: http://${HOST}:${PORT}/panel/`);
  console.log(`URBIS cidadão: http://${HOST}:${PORT}/citizen/`);
  if(LOOPBACK)console.log('Credenciais locais de demonstração: *@urbis.local / '+DEMO_PASSWORD+' (não usar em produção)');
});
function shutdown(){for(const s of wsClients)s.destroy();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),500).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
