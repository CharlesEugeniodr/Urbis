import { randomUUID } from 'node:crypto';

export const CATEGORY_ROUTING={
  LIGHTING:{target:'MUNICIPAL_LIGHTING_AUTHORITY',slaMinutes:2880},
  TRAFFIC_SIGNAL:{target:'MUNICIPAL_TRAFFIC_AUTHORITY',slaMinutes:240},
  WATER:{target:'WATER_SERVICE_PROVIDER',slaMinutes:720},
  ENERGY:{target:'ELECTRICITY_CONCESSIONAIRE',slaMinutes:240},
  PAVEMENT:{target:'MUNICIPAL_PUBLIC_WORKS',slaMinutes:4320},
  RESILIENCE:{target:'COMPDEC',slaMinutes:60},
  PUBLIC_SERVICE_QUALITY:{target:'URBIS_CENTRAL',slaMinutes:7200}
};
export const STATUS_COLORS={OPEN:'#e43b3b',TRIAGE:'#f29b32',DISPATCHED:'#e5c445',IN_SERVICE:'#2f8de4',RESOLVED:'#2dbd69',REJECTED:'#7f8b94',DUPLICATE:'#7f8b94'};

export function normalizeCreate(input={}){
  const categoryCode=String(input.categoryCode??'').trim().toUpperCase();
  const latitude=Number(input.latitude),longitude=Number(input.longitude);
  if(!CATEGORY_ROUTING[categoryCode]) throw new Error('invalid_category');
  if(!Number.isFinite(latitude)||latitude<-90||latitude>90) throw new Error('invalid_latitude');
  if(!Number.isFinite(longitude)||longitude<-180||longitude>180) throw new Error('invalid_longitude');
  const gpsAccuracyM=input.gpsAccuracyM==null?null:Number(input.gpsAccuracyM);
  if(gpsAccuracyM!=null&&(!Number.isFinite(gpsAccuracyM)||gpsAccuracyM<0)) throw new Error('invalid_gps_accuracy');
  return {...input,categoryCode,latitude,longitude,gpsAccuracyM};
}
export function toXY(lon,lat,lat0){const R=6371008.8,rad=Math.PI/180;return [R*lon*rad*Math.cos(lat0*rad),R*lat*rad]}
export function distanceM(a,b){const [x1,y1]=toXY(a.longitude,a.latitude,(a.latitude+b.latitude)/2),[x2,y2]=toXY(b.longitude,b.latitude,(a.latitude+b.latitude)/2);return Math.hypot(x1-x2,y1-y2)}
export function pointSegDistM(lon,lat,a,b){const p=toXY(lon,lat,lat),p1=toXY(a[0],a[1],lat),p2=toXY(b[0],b[1],lat);const vx=p2[0]-p1[0],vy=p2[1]-p1[1],wx=p[0]-p1[0],wy=p[1]-p1[1],vv=vx*vx+vy*vy;let t=vv?((wx*vx+wy*vy)/vv):0;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-(p1[0]+t*vx),p[1]-(p1[1]+t*vy))}
export function featureDistanceM(ft,lon,lat){let best=Infinity;for(const line of ft.geometry?.coordinates??[]){for(let i=1;i<line.length;i++)best=Math.min(best,pointSegDistM(lon,lat,line[i-1],line[i]));if(line.length===1)best=Math.min(best,pointSegDistM(lon,lat,line[0],line[0]));}return best}
export function nearestStreet(features,longitude,latitude,maxDistanceM=120){let best=null;for(const ft of features){const d=featureDistanceM(ft,longitude,latitude);if(d<=maxDistanceM&&(!best||d<best.distanceM))best={feature:ft,distanceM:d};}return best}
export function duplicateCandidates(existing,next,{radiusM=35,windowHours=24}={}){
  const out=[];const now=Date.parse(next.createdAt);for(const o of existing){if(o.categoryCode!==next.categoryCode||!['OPEN','TRIAGE','DISPATCHED','IN_SERVICE'].includes(o.status))continue;const delta=Math.abs(now-Date.parse(o.createdAt))/1000;if(delta>windowHours*3600)continue;const d=distanceM(o,next);if(d>radiusM)continue;const spatial=Math.max(0,1-d/radiusM),temporal=Math.max(0,1-delta/(windowHours*3600));out.push({occurrenceId:o.id,protocol:o.protocol,distanceM:d,deltaSeconds:Math.round(delta),score:0.7*spatial+0.3*temporal});}return out.sort((a,b)=>b.score-a.score);
}
export function buildOccurrence(input,{protocol,territory,existing=[]}={}){
  const v=normalizeCreate(input),createdAt=new Date().toISOString();const occurrence={id:randomUUID(),protocol,categoryCode:v.categoryCode,status:'OPEN',urgency:v.categoryCode==='RESILIENCE'?'HIGH':['ENERGY','TRAFFIC_SIGNAL'].includes(v.categoryCode)?'HIGH':'NORMAL',description:String(v.description??''),latitude:v.latitude,longitude:v.longitude,gpsAccuracyM:v.gpsAccuracyM,addressText:v.addressText??null,cep:v.cep??territory?.cep??null,territory:territory??{matched:false},evidenceState:'RECEIVED',duplicateSuspected:false,duplicateOf:null,createdAt,updatedAt:createdAt};const d=duplicateCandidates(existing,occurrence);occurrence.duplicateSuspected=d.length>0;return {occurrence,duplicates:d};
}
export function triageOccurrence(occurrence,decision,{duplicateOf=null,notes=null,now=new Date()}={}){
  if(['RESOLVED','REJECTED','DUPLICATE'].includes(occurrence.status)) throw new Error('terminal_occurrence');
  const d=String(decision).toUpperCase();
  if(d==='IMPROCEDENT') return {occurrence:{...occurrence,status:'REJECTED',triageNotes:notes,triagedAt:now.toISOString(),updatedAt:now.toISOString()},workOrder:null};
  if(d==='DUPLICATE'){if(!duplicateOf)throw new Error('duplicate_target_required');return {occurrence:{...occurrence,status:'DUPLICATE',duplicateOf,triageNotes:notes,triagedAt:now.toISOString(),updatedAt:now.toISOString()},workOrder:null};}
  if(d!=='PROCEDENT') throw new Error('invalid_triage_decision');
  const rule=CATEGORY_ROUTING[occurrence.categoryCode];if(!rule)throw new Error('routing_rule_missing');
  const workOrder={id:randomUUID(),occurrenceId:occurrence.id,responsibleOrgCode:rule.target,status:'DISPATCHED',slaDueAt:new Date(now.getTime()+rule.slaMinutes*60000).toISOString(),dispatchedAt:now.toISOString(),provisionalSla:true,sourceNote:'ENGINEERING_DEFAULT_NOT_OFFICIAL_SLA'};
  return {occurrence:{...occurrence,status:'DISPATCHED',triageNotes:notes,triagedAt:now.toISOString(),updatedAt:now.toISOString()},workOrder};
}
export function advanceWorkOrder(workOrder,occurrence,status,{result=null,now=new Date()}={}){
  const s=String(status).toUpperCase();if(!['ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED'].includes(s))throw new Error('invalid_work_order_status');if(['COMPLETED','CANCELLED'].includes(workOrder.status))throw new Error('terminal_work_order');
  const w={...workOrder,status:s};if(s==='IN_PROGRESS'&&!w.startedAt)w.startedAt=now.toISOString();if(s==='COMPLETED')w.completedAt=now.toISOString();if(result!=null)w.result=result;
  let os=occurrence.status;if(['ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS'].includes(s))os='IN_SERVICE';if(s==='COMPLETED')os='RESOLVED';
  const o={...occurrence,status:os,updatedAt:now.toISOString(),...(os==='RESOLVED'?{resolvedAt:now.toISOString()}:{})};return {workOrder:w,occurrence:o};
}
