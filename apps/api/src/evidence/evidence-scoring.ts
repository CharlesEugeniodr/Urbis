export const ICI_VERSION='ICI-URBIS-alpha.1';
export const ICI_WEIGHTS={source:0.25,geography:0.20,evidence:0.20,temporal:0.15,corroboration:0.10,authority:0.10} as const;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
function haversine(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const R=6371008.8,r=Math.PI/180,dlat=(b.latitude-a.latitude)*r,dlon=(b.longitude-a.longitude)*r,aa=Math.sin(dlat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.sqrt(aa));}
export function assessICI(input:any){
  const {occurrence,evidence,user,corroborationCount=0,authorityValidated=false}=input;let geo=.5,distanceM:null|number=null;
  if(Number.isFinite(Number(evidence.latitude))&&Number.isFinite(Number(evidence.longitude))){distanceM=haversine({latitude:Number(occurrence.latitude),longitude:Number(occurrence.longitude)},{latitude:Number(evidence.latitude),longitude:Number(evidence.longitude)});geo=distanceM<=15?1:distanceM>=120?0:1-(distanceM-15)/105;}
  let temporal=.4,deltaSeconds:null|number=null;if(evidence.capturedAt){const a=Date.parse(occurrence.createdAt),b=Date.parse(evidence.capturedAt);if(Number.isFinite(a)&&Number.isFinite(b)){deltaSeconds=Math.abs(a-b)/1000;temporal=deltaSeconds<=600?1:deltaSeconds<=3600?.8:deltaSeconds<=86400?.5:.2}else temporal=.2;}
  let completeness=0;if(evidence.hashVerified)completeness+=.35;if(['image/jpeg','image/png','image/webp','video/mp4'].includes(evidence.mediaType))completeness+=.25;if(Number(evidence.byteLength)>0)completeness+=.15;if(evidence.capturedAt)completeness+=.10;if(Number.isFinite(Number(evidence.latitude))&&Number.isFinite(Number(evidence.longitude)))completeness+=.15;
  const roles=new Set((user.roles??[]).map((x:string)=>x.toUpperCase())),source=roles.has('CITIZEN')?.7:.9,corroboration=corroborationCount>=3?1:corroborationCount===2?.75:corroborationCount===1?.5:0;
  const factors={source,geography:clamp(geo),evidence:clamp(completeness),temporal,corroboration,authority:authorityValidated?1:0};const score=Number((Object.entries(ICI_WEIGHTS).reduce((s,[k,w])=>s+w*factors[k as keyof typeof factors],0)*100).toFixed(2));const level=score>=85?'VERY_HIGH':score>=70?'HIGH':score>=50?'MODERATE':score>=30?'LOW':'VERY_LOW';
  return {algorithm:ICI_VERSION,score,level,weights:ICI_WEIGHTS,factors,details:{distanceM:distanceM==null?null:Number(distanceM.toFixed(3)),deltaSeconds:deltaSeconds==null?null:Math.round(deltaSeconds),corroborationCount,authorityValidated},interpretation:'engineering_confidence_indicator_not_proof_of_truth'};
}
