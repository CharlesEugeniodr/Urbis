import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT=3217,BASE=`http://127.0.0.1:${PORT}`,PASSWORD='UrbisLocal!2026';
const geo=JSON.parse(fs.readFileSync(new URL('../data/territorial/logradouros_parauapebas_2025.operational.geojson',import.meta.url),'utf8'));
const [lon,lat]=geo.features[0].geometry.coordinates[0][0];
let proc,citizenToken,operatorToken,fieldToken,managerToken,lastResolved,lastWorkOrder;
async function waitHealth(){for(let i=0;i<80;i++){try{const r=await fetch(BASE+'/health');if(r.ok)return await r.json();}catch{}await new Promise(r=>setTimeout(r,75));}throw new Error('probe_not_ready');}
async function login(email){const r=await fetch(BASE+'/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:PASSWORD})});const j=await r.json();assert.ok(r.ok,JSON.stringify(j));return j.accessToken;}
async function post(url,body,token){const r=await fetch(BASE+url,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const j=await r.json();assert.ok(r.ok,JSON.stringify(j));return j;}
async function get(url,token){const r=await fetch(BASE+url,{headers:token?{authorization:'Bearer '+token}:{}});const j=await r.json();return {r,j};}

test.before(async()=>{proc=spawn(process.execPath,['tools/local-probe-server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,URBIS_PORT:String(PORT)},stdio:['ignore','pipe','pipe']});await waitHealth();[citizenToken,operatorToken,fieldToken,managerToken]=await Promise.all([login('citizen@urbis.local'),login('operator@urbis.local'),login('field@urbis.local'),login('manager@urbis.local')]);});
test.after(async()=>{if(proc&&!proc.killed){proc.kill('SIGTERM');await new Promise(r=>proc.once('exit',r));}});

test('RBAC bloqueia lista operacional para cidadão',async()=>{const {r,j}=await get('/v1/occurrences',citizenToken);assert.equal(r.status,403);assert.equal(j.error,'forbidden');});

test('fluxo autenticado: cidadão → ocorrência → evidência → ICI → triagem → OS → resolução',async()=>{
  const a=await post('/v1/occurrences',{categoryCode:'PAVEMENT',description:'teste operacional A',latitude:lat,longitude:lon,clientRequestId:'e2e-a'},citizenToken);
  assert.match(a.occurrence.protocol,/^URB-\d{8}-\d{7}$/);assert.equal(a.occurrence.territory.matched,true);assert.equal(a.occurrence.evidenceState,'GEO_VALIDATED');
  const ev=await post(`/v1/occurrences/${a.occurrence.id}/evidence`,{filename:'buraco.jpg',mediaType:'image/jpeg',dataBase64:Buffer.from('imagem-de-prova-e2e').toString('base64'),capturedAt:new Date().toISOString(),latitude:lat,longitude:lon},citizenToken);
  assert.equal(ev.evidence.hashVerified,true);assert.match(ev.evidence.sha256,/^[a-f0-9]{64}$/);assert.ok(ev.evidence.ici.score>0);assert.equal(ev.occurrence.evidenceState,'EVIDENCE_VALIDATED');
  const auth=await post(`/v1/occurrences/${a.occurrence.id}/evidence/${ev.evidence.id}/authority-validate`,{},operatorToken);assert.equal(auth.occurrence.evidenceState,'AUTHORITY_VALIDATED');assert.ok(auth.occurrence.ici.score>=ev.evidence.ici.score);
  const b=await post('/v1/occurrences',{categoryCode:'PAVEMENT',description:'teste operacional B',latitude:lat,longitude:lon+0.00001,clientRequestId:'e2e-b'},citizenToken);assert.equal(b.occurrence.duplicateSuspected,true);
  const t=await post(`/v1/occurrences/${a.occurrence.id}/triage`,{decision:'PROCEDENT'},operatorToken);assert.equal(t.occurrence.status,'DISPATCHED');assert.ok(t.workOrder.id);
  const started=await post(`/v1/field/work-orders/${t.workOrder.id}/status`,{status:'IN_PROGRESS',latitude:lat,longitude:lon},fieldToken);assert.equal(started.occurrence.status,'IN_SERVICE');
  const done=await post(`/v1/field/work-orders/${t.workOrder.id}/status`,{status:'COMPLETED',latitude:lat,longitude:lon,result:{proof:'e2e'}},fieldToken);assert.equal(done.occurrence.status,'RESOLVED');lastResolved=done.occurrence;lastWorkOrder=t.workOrder;
  const mine=await get('/v1/me/occurrences',citizenToken);assert.ok(mine.r.ok);assert.equal(mine.j.count,2);
});

test('idempotência autenticada por clientRequestId impede protocolo duplicado por retry',async()=>{
  const x=await post('/v1/occurrences',{categoryCode:'LIGHTING',latitude:lat,longitude:lon,clientRequestId:'retry-fixed'},citizenToken);
  const y=await post('/v1/occurrences',{categoryCode:'LIGHTING',latitude:lat,longitude:lon,clientRequestId:'retry-fixed'},citizenToken);
  assert.equal(y.idempotent,true);assert.equal(x.occurrence.id,y.occurrence.id);assert.equal(x.occurrence.protocol,y.occurrence.protocol);
});



test('avaliação, pontuação validada e ranking trimestral funcionam sem pontuação automática',async()=>{
  assert.ok(lastResolved);const ev=await post(`/v1/occurrences/${lastResolved.id}/evaluation`,{rating:5,comment:'Atendimento concluído'},citizenToken);assert.equal(ev.evaluation.rating,5);
  const score=await post(`/v1/occurrences/${lastResolved.id}/score`,{basePoints:4,bonusPoints:1,reason:'Contribuição validada'},managerToken);assert.equal(score.score.points,5);
  const mine=await get('/v1/me/score',citizenToken);assert.ok(mine.r.ok);assert.equal(mine.j.totalPoints,5);
  const rank=await get('/v1/rankings/current');assert.ok(rank.r.ok);assert.ok(rank.j.records.some(x=>x.points===5));
});

test('equipe de campo recebe OS atribuída e geofence valida posição',async()=>{
  const a=await post('/v1/occurrences',{categoryCode:'LIGHTING',description:'campo',latitude:lat,longitude:lon,clientRequestId:'field-e2e'},citizenToken);
  const t=await post(`/v1/occurrences/${a.occurrence.id}/triage`,{decision:'PROCEDENT'},operatorToken);
  const list=await get('/v1/field/work-orders',fieldToken);assert.ok(list.r.ok);assert.ok(list.j.records.some(w=>w.id===t.workOrder.id));
  const arrived=await post(`/v1/field/work-orders/${t.workOrder.id}/status`,{status:'ARRIVED',latitude:lat,longitude:lon},fieldToken);assert.ok(arrived.fieldGeo.distanceM<250);
});

test('transparência, alertas, notificações e relatórios preservam requisitos',async()=>{
  const pub=await get('/public/occurrences');assert.ok(pub.r.ok);assert.ok(pub.j.records.length>0);const first=pub.j.records[0];assert.equal('reporterUserId' in first,false);assert.equal('addressText' in first,false);
  const al=await post('/v1/alerts',{severity:'ALERT',hazardCode:'FLOOD',title:'Alerta de prova',area:{type:'Polygon',coordinates:[[[lon-0.01,lat-0.01],[lon+0.01,lat-0.01],[lon+0.01,lat+0.01],[lon-0.01,lat+0.01],[lon-0.01,lat-0.01]]]}},managerToken);assert.equal(al.alert.hazardCode,'FLOOD');
  const nearby=await get(`/v1/alerts?lat=${lat}&lon=${lon}`);assert.ok(nearby.j.records.some(x=>x.id===al.alert.id));
  const notes=await get('/v1/me/notifications',citizenToken);assert.ok(notes.r.ok);assert.ok(notes.j.count>0);
  for(const ext of ['csv','xlsx','pdf']){const r=await fetch(`${BASE}/v1/reports/occurrences.${ext}`,{headers:{authorization:'Bearer '+managerToken}});assert.equal(r.status,200);const b=Buffer.from(await r.arrayBuffer());assert.ok(b.length>20);if(ext==='pdf')assert.equal(b.subarray(0,5).toString(),'%PDF-');if(ext==='xlsx')assert.equal(b.readUInt32LE(0),0x04034b50);}
});

test('WebSocket exige token operacional e recebe atualização',async()=>{
  assert.equal(typeof WebSocket,'function');
  const ws=new WebSocket(`ws://127.0.0.1:${PORT}/ws/occurrences?access_token=${encodeURIComponent(operatorToken)}`);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  const message=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('ws_timeout')),3000);const listener=e=>{const d=JSON.parse(String(e.data));if(d.topic==='occurrence.created'){clearTimeout(timer);ws.removeEventListener('message',listener);resolve(d);}};ws.addEventListener('message',listener);});
  const created=await post('/v1/occurrences',{categoryCode:'WATER',description:'ws test',latitude:lat,longitude:lon,clientRequestId:'ws-event'},citizenToken);
  const e=await message;assert.equal(e.entityId,created.occurrence.id);ws.close();
});

test('cadastro com CPF armazena apenas impressão HMAC e permite login por CPF',async()=>{
  const body={email:'cpf.e2e@urbis.local',cpf:'529.982.247-25',displayName:'CPF E2E',password:PASSWORD};
  const r=await fetch(BASE+'/v1/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();assert.ok(r.ok,JSON.stringify(j));assert.equal('cpfHash' in j.user,false);assert.equal('cpf' in j.user,false);
  const l=await fetch(BASE+'/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cpf:'52998224725',password:PASSWORD})});const lj=await l.json();assert.ok(l.ok,JSON.stringify(lj));assert.ok(lj.accessToken);
});

test('LGPD registra solicitação sem apagar automaticamente evidência pública/administrativa',async()=>{
  const p=await post('/v1/me/privacy-requests',{requestType:'ANONYMIZATION',details:{reason:'teste e2e'}},citizenToken);assert.equal(p.request.status,'PENDING');
  const q=await get('/v1/me/privacy-requests',citizenToken);assert.ok(q.r.ok);assert.ok(q.j.records.some(x=>x.id===p.request.id));
});

test('FIELD_AGENT não acessa nem altera ocorrência fora de equipe atribuída',async()=>{
  const a=await post('/v1/occurrences',{categoryCode:'PAVEMENT',description:'não atribuída ao campo',latitude:lat,longitude:lon,clientRequestId:'field-isolation-e2e'},citizenToken);
  const rd=await get(`/v1/occurrences/${a.occurrence.id}`,fieldToken);assert.equal(rd.r.status,403);
  const up=await fetch(BASE+`/v1/occurrences/${a.occurrence.id}/evidence`,{method:'POST',headers:{authorization:'Bearer '+fieldToken,'content-type':'application/json'},body:JSON.stringify({filename:'x.jpg',mediaType:'image/jpeg',dataBase64:Buffer.from('x').toString('base64')})});assert.equal(up.status,403);
});

test('equipe atribuída envia evidência BEFORE/AFTER e rota de fallback é explicitamente identificada',async()=>{
  const a=await post('/v1/occurrences',{categoryCode:'LIGHTING',description:'evidência campo',latitude:lat,longitude:lon,clientRequestId:'field-media-e2e'},citizenToken);
  const t=await post(`/v1/occurrences/${a.occurrence.id}/triage`,{decision:'PROCEDENT'},operatorToken);
  const route=await get(`/v1/field/work-orders/${t.workOrder.id}/route?lat=${lat}&lon=${lon}`,fieldToken);assert.ok(route.r.ok);assert.equal(route.j.provider,'STRAIGHT_LINE_FALLBACK');assert.match(route.j.notice,/não é rota|roteamento/i);
  for(const purpose of ['BEFORE','AFTER']){const e=await post(`/v1/occurrences/${a.occurrence.id}/evidence`,{filename:`${purpose}.jpg`,mediaType:'image/jpeg',dataBase64:Buffer.from(`field-${purpose}`).toString('base64'),purpose,capturedAt:new Date().toISOString(),latitude:lat,longitude:lon},fieldToken);assert.equal(e.evidence.purpose,purpose);assert.equal(e.evidence.hashVerified,true);}
});

test('SSE público recebe evento anonimizado e /metrics expõe Prometheus',async()=>{
  const ac=new AbortController();const resp=await fetch(BASE+'/public/stream',{signal:ac.signal});assert.equal(resp.status,200);const reader=resp.body.getReader(),decoder=new TextDecoder();let text='';
  const readUntil=async needle=>{const deadline=Date.now()+3000;while(Date.now()<deadline){const {value,done}=await reader.read();if(done)break;text+=decoder.decode(value,{stream:true});if(text.includes(needle))return;}throw new Error('sse_timeout_'+needle);};
  await readUntil('event: ready');
  await post('/v1/occurrences',{categoryCode:'WATER',description:'sse public',latitude:lat,longitude:lon,clientRequestId:'sse-public-e2e'},citizenToken);
  await readUntil('event: occurrence.changed');assert.equal(text.includes('reporterUserId'),false);assert.equal(text.includes('addressText'),false);ac.abort();
  const m=await fetch(BASE+'/metrics');const mt=await m.text();assert.ok(m.ok);assert.match(mt,/urbis_http_request_p95_ms/);assert.match(mt,/urbis_occurrences_total/);
});
