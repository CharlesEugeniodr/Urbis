import crypto from 'node:crypto';
import { distanceM } from './operation-core.mjs';

export const PUBLIC_GRID_DEGREES=0.005;
export const SCORE_POLICY_VERSION='URBIS-SCORE-alpha.1';
export const PRIVACY_POLICY_VERSION='URBIS-PUBLIC-alpha.1';
export const FIELD_GEOFENCE_M=250;

export function inferPriority({categoryCode,riskLevel=null,manualPriority=null}={}){
  const allowed=new Set(['NORMAL','MEDIUM','HIGH','CRITICAL']);
  if(manualPriority){const p=String(manualPriority).toUpperCase();if(!allowed.has(p))throw new Error('invalid_priority');return {priority:p,source:'MANUAL'};}
  const risk=String(riskLevel??'').toUpperCase();
  if(['MAX_ALERT','EMERGENCY'].includes(risk))return {priority:'CRITICAL',source:'RULE'};
  if(risk==='ALERT')return {priority:'HIGH',source:'RULE'};
  const c=String(categoryCode??'').toUpperCase();
  if(c==='RESILIENCE')return {priority:'CRITICAL',source:'CATEGORY_DEFAULT'};
  if(['ENERGY','TRAFFIC_SIGNAL','WATER'].includes(c))return {priority:'HIGH',source:'CATEGORY_DEFAULT'};
  if(['PAVEMENT','LIGHTING'].includes(c))return {priority:'MEDIUM',source:'CATEGORY_DEFAULT'};
  return {priority:'NORMAL',source:'CATEGORY_DEFAULT'};
}

export function createEvaluation({occurrence,userId,rating,comment='',now=new Date()}={}){
  if(!occurrence)throw new Error('occurrence_required');
  if(occurrence.status!=='RESOLVED')throw new Error('occurrence_not_resolved');
  if(!userId||occurrence.reporterUserId!==userId)throw new Error('evaluation_not_owner');
  const r=Number(rating);if(!Number.isInteger(r)||r<1||r>5)throw new Error('invalid_rating');
  return {id:crypto.randomUUID(),occurrenceId:occurrence.id,userId,rating:r,comment:String(comment??'').trim().slice(0,1000),createdAt:now.toISOString()};
}

export function createValidatedScore({occurrence,userId,basePoints,bonusPoints=0,reason='',validatedBy,now=new Date()}={}){
  if(!occurrence)throw new Error('occurrence_required');
  if(occurrence.status!=='RESOLVED')throw new Error('score_requires_resolved_occurrence');
  if(!validatedBy)throw new Error('score_requires_human_validator');
  if(!userId||occurrence.reporterUserId!==userId)throw new Error('score_user_mismatch');
  const base=Number(basePoints),bonus=Number(bonusPoints);
  if(!Number.isInteger(base)||base<1||base>4)throw new Error('base_points_out_of_range');
  if(!Number.isFinite(bonus)||bonus<0||bonus>4)throw new Error('bonus_points_out_of_range');
  return {id:crypto.randomUUID(),userId,occurrenceId:occurrence.id,basePoints:base,bonusPoints:bonus,points:base+bonus,reason:String(reason??'').trim().slice(0,1000)||'Contribuição validada',validatedBy,policyVersion:SCORE_POLICY_VERSION,createdAt:now.toISOString()};
}

export function quarterKey(date=new Date()){
  const d=new Date(date);if(Number.isNaN(d.getTime()))throw new Error('invalid_date');
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth()/3)+1}`;
}
export function rankingForQuarter(scores,users,{quarter=quarterKey(),limit=100}={}){
  const totals=new Map();
  for(const s of scores??[]){if(quarterKey(s.createdAt)!==quarter)continue;totals.set(s.userId,(totals.get(s.userId)??0)+Number(s.points||0));}
  const userMap=new Map((users??[]).map(u=>[u.id,u]));
  return [...totals.entries()].map(([userId,points])=>({userId,displayName:userMap.get(userId)?.displayName??'Cidadão',points:Number(points.toFixed(2))})).sort((a,b)=>b.points-a.points||a.displayName.localeCompare(b.displayName)).slice(0,limit).map((r,i)=>({...r,position:i+1,quarter}));
}

function pointInRing(lon,lat,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=Number(ring[i][0]),yi=Number(ring[i][1]),xj=Number(ring[j][0]),yj=Number(ring[j][1]);const cross=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||Number.EPSILON)+xi);if(cross)inside=!inside;}return inside;}
export function pointInGeoJSON(lon,lat,geometry){
  if(!geometry)return true;
  if(geometry.type==='Polygon'){const [outer,...holes]=geometry.coordinates??[];return Boolean(outer&&pointInRing(lon,lat,outer)&&!holes.some(h=>pointInRing(lon,lat,h)));}
  if(geometry.type==='MultiPolygon')return (geometry.coordinates??[]).some(p=>pointInGeoJSON(lon,lat,{type:'Polygon',coordinates:p}));
  return false;
}
export function activeAlerts(alerts,{lat=null,lon=null,now=new Date()}={}){
  const t=new Date(now).getTime();return (alerts??[]).filter(a=>Date.parse(a.issuedAt??0)<=t&&(!a.expiresAt||Date.parse(a.expiresAt)>t)).filter(a=>lat==null||lon==null||pointInGeoJSON(Number(lon),Number(lat),a.area??null)).sort((a,b)=>Date.parse(b.issuedAt)-Date.parse(a.issuedAt));
}

export function publicOccurrence(o,{gridDegrees=PUBLIC_GRID_DEGREES}={}){
  const snap=(v)=>v==null?null:Number((Math.round(Number(v)/gridDegrees)*gridDegrees).toFixed(6));
  return {protocol:o.protocol,categoryCode:o.categoryCode,status:o.status,priority:o.priority??inferPriority({categoryCode:o.categoryCode}).priority,neighborhood:o.territory?.neighborhood??o.territorySnapshot?.neighborhood??null,zone:o.territory?.zone??o.territorySnapshot?.zone??null,approximateLocation:o.latitude==null||o.longitude==null?null:{latitude:snap(o.latitude),longitude:snap(o.longitude),gridDegrees,notice:'Localização generalizada; não corresponde ao ponto exato da ocorrência.'},createdAt:o.createdAt,resolvedAt:o.resolvedAt??null,privacyPolicyVersion:PRIVACY_POLICY_VERSION};
}

export function dashboardSummary({occurrences=[],workOrders=[],evaluations=[],users=[],scores=[]}={}){
  const byStatus={},byCategory={},byNeighborhood={};let resolvedMs=0,resolvedN=0,slaResolved=0,slaCount=0;
  for(const o of occurrences){byStatus[o.status]=(byStatus[o.status]??0)+1;byCategory[o.categoryCode]=(byCategory[o.categoryCode]??0)+1;const n=o.territory?.neighborhood??o.territorySnapshot?.neighborhood??'NÃO IDENTIFICADO';byNeighborhood[n]=(byNeighborhood[n]??0)+1;if(o.resolvedAt&&o.createdAt){resolvedMs+=Math.max(0,Date.parse(o.resolvedAt)-Date.parse(o.createdAt));resolvedN++;}}
  for(const w of workOrders){if(w.completedAt&&w.slaDueAt){slaCount++;if(Date.parse(w.completedAt)<=Date.parse(w.slaDueAt))slaResolved++;}}
  const avgRating=evaluations.length?evaluations.reduce((a,e)=>a+Number(e.rating||0),0)/evaluations.length:null;
  const activeUsers=new Set(occurrences.map(o=>o.reporterUserId).filter(Boolean)).size;
  const totalPoints=scores.reduce((a,s)=>a+Number(s.points||0),0);
  return {occurrences:occurrences.length,workOrders:workOrders.length,byStatus,byCategory,byNeighborhood,meanResolutionHours:resolvedN?Number((resolvedMs/resolvedN/3600000).toFixed(2)):null,slaCompliancePct:slaCount?Number((100*slaResolved/slaCount).toFixed(2)):null,meanCitizenRating:avgRating==null?null:Number(avgRating.toFixed(2)),evaluations:evaluations.length,registeredUsers:users.length,activeCitizenReporters:activeUsers,totalValidatedCitizenPoints:Number(totalPoints.toFixed(2))};
}

export function validateFieldTransition({workOrder,occurrence,status,latitude,longitude,maxDistanceM=FIELD_GEOFENCE_M}={}){
  if(!workOrder||!occurrence)throw new Error('work_order_and_occurrence_required');
  const s=String(status??'').toUpperCase();
  const proximityRequired=['ARRIVED','IN_PROGRESS','COMPLETED'].includes(s);
  let distance=null;
  if(proximityRequired){const lat=Number(latitude),lon=Number(longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('field_location_required');distance=distanceM({latitude:lat,longitude:lon},{latitude:Number(occurrence.latitude),longitude:Number(occurrence.longitude)});if(distance>maxDistanceM)throw new Error('outside_work_order_geofence');}
  return {status:s,distanceM:distance==null?null:Number(distance.toFixed(2)),geofenceM:maxDistanceM,proximityRequired};
}

export function warrantyMatches(contracts,occurrence,{now=new Date()}={}){
  const t=new Date(now);return (contracts??[]).filter(c=>!c.warrantyUntil||new Date(c.warrantyUntil)>=t).filter(c=>{
    if(c.neighborhood&&c.neighborhood!==occurrence.territory?.neighborhood)return false;
    if(c.streetName&&c.streetName!==occurrence.territory?.streetName)return false;
    if(c.area&&occurrence.longitude!=null&&occurrence.latitude!=null)return pointInGeoJSON(Number(occurrence.longitude),Number(occurrence.latitude),c.area);
    return Boolean(c.neighborhood||c.streetName);
  }).map(c=>({contractId:c.id,contractNumber:c.contractNumber,contractorName:c.contractorName??null,warrantyUntil:c.warrantyUntil??null,matchBasis:c.area?'GEOMETRY':c.streetName?'STREET':'NEIGHBORHOOD'}));
}
