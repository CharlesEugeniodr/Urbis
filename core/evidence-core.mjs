import crypto from 'node:crypto';
import path from 'node:path';
import { distanceM } from './operation-core.mjs';

export const ICI_VERSION='ICI-URBIS-alpha.1';
export const ICI_WEIGHTS=Object.freeze({source:0.25,geography:0.20,evidence:0.20,temporal:0.15,corroboration:0.10,authority:0.10});
export const ALLOWED_MEDIA_TYPES=new Set(['image/jpeg','image/png','image/webp','video/mp4']);

export function sanitizeFilename(name='evidence.bin'){
  const b=path.basename(String(name)).replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,120);
  return b||'evidence.bin';
}
export function extensionForMediaType(mediaType){return ({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4'})[mediaType]??'.bin';}
export function decodeEvidenceBase64(dataBase64,{maxBytes=8*1024*1024}={}){
  const raw=String(dataBase64??'').replace(/^data:[^;]+;base64,/i,'').replace(/\s+/g,'');
  if(!raw) throw new Error('evidence_data_required');
  let buffer;try{buffer=Buffer.from(raw,'base64');}catch{throw new Error('invalid_evidence_base64');}
  if(!buffer.length) throw new Error('empty_evidence');
  if(buffer.length>maxBytes) throw new Error('evidence_too_large');
  return buffer;
}
export function sha256(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
export function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0));}

export function geographyFactor(occurrence,evidence){
  const lat=Number(evidence.latitude),lon=Number(evidence.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) return {value:0.5,distanceM:null,note:'evidence_without_own_coordinates'};
  const d=distanceM({latitude:Number(occurrence.latitude),longitude:Number(occurrence.longitude)},{latitude:lat,longitude:lon});
  const value=d<=15?1:d>=120?0:1-(d-15)/105;
  return {value:clamp01(value),distanceM:Number(d.toFixed(3)),note:'distance_between_report_and_evidence'};
}

export function temporalFactor(occurrence,evidence){
  if(!evidence.capturedAt) return {value:0.4,deltaSeconds:null,note:'capture_time_absent'};
  const a=Date.parse(occurrence.createdAt),b=Date.parse(evidence.capturedAt);
  if(!Number.isFinite(a)||!Number.isFinite(b)) return {value:0.2,deltaSeconds:null,note:'invalid_capture_time'};
  const d=Math.abs(a-b)/1000;
  const value=d<=600?1:d<=3600?0.8:d<=86400?0.5:0.2;
  return {value,deltaSeconds:Math.round(d),note:'absolute_time_delta'};
}

export function evidenceCompletenessFactor(evidence){
  let score=0;
  if(evidence.hashVerified)score+=0.35;
  if(ALLOWED_MEDIA_TYPES.has(evidence.mediaType))score+=0.25;
  if(Number(evidence.byteLength)>0)score+=0.15;
  if(evidence.capturedAt)score+=0.10;
  if(Number.isFinite(Number(evidence.latitude))&&Number.isFinite(Number(evidence.longitude)))score+=0.15;
  return clamp01(score);
}

export function sourceFactor({authenticated=true,roles=[]}={}){
  const rs=new Set(roles.map(r=>String(r).toUpperCase()));
  if(rs.has('ADMIN')||rs.has('OPERATOR')||rs.has('FIELD_AGENT')||rs.has('MANAGER'))return 0.9;
  if(authenticated)return 0.7;
  return 0.45;
}

export function corroborationFactor(count=0){const n=Math.max(0,Number(count)||0);return n>=3?1:n===2?0.75:n===1?0.5:0;}
export function iciLevel(score){return score>=85?'VERY_HIGH':score>=70?'HIGH':score>=50?'MODERATE':score>=30?'LOW':'VERY_LOW';}

export function assessICI({occurrence,evidence,user={roles:[]},corroborationCount=0,authorityValidated=false}={}){
  const g=geographyFactor(occurrence,evidence),t=temporalFactor(occurrence,evidence);
  const factors={
    source:sourceFactor({authenticated:Boolean(user?.id),roles:user?.roles??[]}),
    geography:g.value,
    evidence:evidenceCompletenessFactor(evidence),
    temporal:t.value,
    corroboration:corroborationFactor(corroborationCount),
    authority:authorityValidated?1:0
  };
  const raw=Object.entries(ICI_WEIGHTS).reduce((s,[k,w])=>s+w*factors[k],0);
  const score=Number((raw*100).toFixed(2));
  return {algorithm:ICI_VERSION,score,level:iciLevel(score),weights:ICI_WEIGHTS,factors,details:{geography:g,temporal:t,corroborationCount:Number(corroborationCount)||0,authorityValidated:Boolean(authorityValidated)},interpretation:'engineering_confidence_indicator_not_proof_of_truth'};
}
