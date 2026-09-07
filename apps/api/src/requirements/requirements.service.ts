import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RealtimeService } from '../realtime/realtime.service';
import { Observable } from 'rxjs';

@Injectable()
export class RequirementsService {
  constructor(private readonly db:DatabaseService,private readonly realtime:RealtimeService){}

  async evaluateOccurrence(occurrenceId:string,userId:string,rating:number,comment?:string){
    const r=Number(rating);if(!Number.isInteger(r)||r<1||r>5)throw new BadRequestException('rating deve estar entre 1 e 5');
    const q=await this.db.query(`SELECT id,reporter_user_id,status FROM occurrences WHERE id=$1`,[occurrenceId]);
    if(!q.rowCount)throw new NotFoundException('occurrence_not_found');const o=q.rows[0];
    if(o.reporter_user_id!==userId)throw new ForbiddenException('evaluation_not_owner');if(o.status!=='RESOLVED')throw new BadRequestException('occurrence_not_resolved');
    try{const x=await this.db.query(`INSERT INTO service_evaluations(occurrence_id,user_id,rating,comment) VALUES($1,$2,$3,$4) RETURNING *`,[occurrenceId,userId,r,String(comment??'').slice(0,1000)]);return x.rows[0];}catch(e:any){if(e?.code==='23505')throw new ConflictException('evaluation_already_exists');throw e;}
  }

  async validateScore(occurrenceId:string,validatorId:string,basePoints:number,bonusPoints=0,reason?:string){
    const base=Number(basePoints),bonus=Number(bonusPoints);if(!Number.isInteger(base)||base<1||base>4||!Number.isFinite(bonus)||bonus<0||bonus>4)throw new BadRequestException('pontuação inválida');
    const q=await this.db.query(`SELECT id,reporter_user_id,status FROM occurrences WHERE id=$1`,[occurrenceId]);if(!q.rowCount)throw new NotFoundException('occurrence_not_found');const o=q.rows[0];if(o.status!=='RESOLVED')throw new BadRequestException('score_requires_resolved_occurrence');
    try{const x=await this.db.query(`INSERT INTO citizen_scores(user_id,occurrence_id,points,base_points,bonus_points,reason,validated_by,policy_version) VALUES($1,$2,$3,$4,$5,$6,$7,'URBIS-SCORE-alpha.1') RETURNING *`,[o.reporter_user_id,occurrenceId,base+bonus,base,bonus,String(reason??'Contribuição validada').slice(0,1000),validatorId]);await this.db.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','CITIZEN_SCORE_VALIDATED',$3)`,[o.reporter_user_id,occurrenceId,JSON.stringify({points:base+bonus})]);return x.rows[0];}catch(e:any){if(e?.code==='23505')throw new ConflictException('score_already_exists');throw e;}
  }

  async rankingCurrent(){const x=await this.db.query(`SELECT s.user_id,u.display_name,SUM(s.points)::numeric AS points FROM citizen_scores s JOIN users_account u ON u.id=s.user_id WHERE s.created_at>=date_trunc('quarter',now()) AND s.created_at<date_trunc('quarter',now())+interval '3 months' GROUP BY s.user_id,u.display_name ORDER BY points DESC,u.display_name LIMIT 100`);return {records:x.rows.map((r:any,i:number)=>({...r,position:i+1}))};}
  async myScore(userId:string){const x=await this.db.query(`SELECT COALESCE(SUM(points),0)::numeric AS total_points,COALESCE(SUM(points) FILTER(WHERE created_at>=date_trunc('quarter',now())),0)::numeric AS quarter_points FROM citizen_scores WHERE user_id=$1`,[userId]);return x.rows[0];}

  async alerts(lat?:number,lon?:number){const has=Number.isFinite(lat)&&Number.isFinite(lon);const x=await this.db.query(`SELECT id,severity,alert_color,hazard_code,title,details,ST_AsGeoJSON(area)::json AS area,issued_at,expires_at FROM resilience_alerts WHERE issued_at<=now() AND (expires_at IS NULL OR expires_at>now()) ${has?'AND (area IS NULL OR ST_Intersects(area,ST_SetSRID(ST_Point($1,$2),4326)))':''} ORDER BY issued_at DESC`,has?[lon,lat]:[]);return {count:x.rowCount,records:x.rows};}
  async createAlert(body:any){const x=await this.db.query(`INSERT INTO resilience_alerts(severity,alert_color,hazard_code,title,details,area,expires_at,authority_validation_required) VALUES($1,$2,$3,$4,$5,CASE WHEN $6::text IS NULL THEN NULL ELSE ST_SetSRID(ST_GeomFromGeoJSON($6),4326) END,$7,false) RETURNING id,severity,alert_color,hazard_code,title,details,issued_at,expires_at`,[String(body.severity??'ATTENTION').toUpperCase(),String(body.alertColor??'ORANGE').toUpperCase(),String(body.hazardCode??'GENERAL').toUpperCase(),String(body.title??'Alerta URBIS').slice(0,160),body.details??{},body.area?JSON.stringify(body.area):null,body.expiresAt??null]);const a=x.rows[0];await this.db.query(`INSERT INTO notification_outbox(channel,template_code,payload) VALUES('PUSH','RESILIENCE_ALERT',$1)`,[JSON.stringify({alertId:a.id,severity:a.severity,hazardCode:a.hazard_code,title:a.title})]);this.realtime.publish({topic:'alert.issued',entityType:'alert',entityId:String(a.id),payload:{severity:a.severity,hazardCode:a.hazard_code,title:a.title}});return a;}

  async dashboard(){
    const [s,c,n,e,w,sl,u,a,p,m,r]=await Promise.all([
      this.db.query(`SELECT status,count(*)::int n FROM occurrences GROUP BY status`),
      this.db.query(`SELECT c.code,count(*)::int n FROM occurrences o JOIN categories c ON c.id=o.category_id GROUP BY c.code`),
      this.db.query(`SELECT COALESCE(o.territory_snapshot->>'neighborhood','NÃO IDENTIFICADO') neighborhood,count(*)::int n FROM occurrences o GROUP BY 1 ORDER BY n DESC LIMIT 20`),
      this.db.query(`SELECT count(*)::int n,avg(rating)::numeric(10,2) avg FROM service_evaluations`),
      this.db.query(`SELECT avg(EXTRACT(epoch FROM(o.resolved_at-o.created_at))/3600)::numeric(12,2) mean_hours FROM occurrences o WHERE o.resolved_at IS NOT NULL`),
      this.db.query(`SELECT count(*) FILTER(WHERE completed_at IS NOT NULL AND sla_due_at IS NOT NULL)::int measured,count(*) FILTER(WHERE completed_at IS NOT NULL AND sla_due_at IS NOT NULL AND completed_at<=sla_due_at)::int within_sla,count(*) FILTER(WHERE completed_at IS NULL AND sla_due_at<now())::int overdue FROM work_orders`),
      this.db.query(`SELECT (SELECT count(*)::int FROM users_account WHERE active=true) registered,(SELECT count(DISTINCT reporter_user_id)::int FROM occurrences WHERE reporter_user_id IS NOT NULL AND created_at>=now()-interval '30 days') active_30d`),
      this.db.query(`SELECT count(*)::int n FROM occurrences WHERE created_at>=date_trunc('month',now())`),
      this.db.query(`SELECT COALESCE(SUM(points),0)::numeric points,COALESCE(AVG(points),0)::numeric avg_points FROM citizen_scores`),
      this.db.query(`SELECT c.code,avg(EXTRACT(epoch FROM(o.resolved_at-o.created_at))/3600)::numeric(12,2) mean_hours FROM occurrences o JOIN categories c ON c.id=o.category_id WHERE o.resolved_at IS NOT NULL GROUP BY c.code`),
      this.db.query(`SELECT COALESCE(territory_snapshot->>'streetSegmentId',territory_snapshot->>'streetName','UNMATCHED') location_key,c.code category_code,count(*)::int n FROM occurrences o JOIN categories c ON c.id=o.category_id GROUP BY 1,c.code HAVING count(*)>1 ORDER BY n DESC LIMIT 20`)
    ]);
    const measured=Number(sl.rows[0]?.measured??0),within=Number(sl.rows[0]?.within_sla??0);
    return {
      occurrences:Object.values(Object.fromEntries(s.rows.map((x:any)=>[x.status,x.n]))).reduce((x:any,y:any)=>Number(x)+Number(y),0),
      occurrencesThisMonth:a.rows[0]?.n??0,
      byStatus:Object.fromEntries(s.rows.map((x:any)=>[x.status,x.n])),
      byCategory:Object.fromEntries(c.rows.map((x:any)=>[x.code,x.n])),
      byNeighborhood:Object.fromEntries(n.rows.map((x:any)=>[x.neighborhood,x.n])),
      meanResolutionHours:w.rows[0]?.mean_hours??null,
      meanResolutionHoursByCategory:Object.fromEntries(m.rows.map((x:any)=>[x.code,x.mean_hours])),
      slaCompliancePct:measured?Number((100*within/measured).toFixed(2)):null,
      overdueServiceOrders:sl.rows[0]?.overdue??0,
      recurrenceHotspots:r.rows,
      evaluations:e.rows[0]?.n??0,
      meanCitizenRating:e.rows[0]?.avg??null,
      registeredUsers:u.rows[0]?.registered??0,
      activeCitizenReporters30d:u.rows[0]?.active_30d??0,
      totalValidatedCitizenPoints:p.rows[0]?.points??0,
      averageValidatedPoints:p.rows[0]?.avg_points??0
    };
  }

  publicStream(){
    return new Observable<any>(subscriber=>{
      const unsubscribe=this.realtime.subscribe(async event=>{
        try{
          if(event.entityType==='occurrence'){
            const q=await this.db.query(`SELECT o.protocol,c.code category_code,o.status,o.priority,o.territory_snapshot->>'neighborhood' neighborhood,o.created_at,o.resolved_at FROM occurrences o JOIN categories c ON c.id=o.category_id WHERE o.id=$1`,[event.entityId]);
            if(q.rowCount)subscriber.next({type:'occurrence.changed',data:q.rows[0]});
          } else if(event.topic.includes('alert')) subscriber.next({type:'alert.issued',data:{topic:event.topic,at:event.at}});
        }catch{}
      });
      return ()=>unsubscribe();
    });
  }


  async warrantyMatches(occurrenceId:string){const x=await this.db.query(`SELECT * FROM urbis_match_active_warranties($1)`,[occurrenceId]);return {count:x.rowCount,records:x.rows};}
  async myNotifications(userId:string){const x=await this.db.query(`SELECT id,channel,template_code,payload,status,created_at FROM notification_outbox WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200`,[userId]);return {count:x.rowCount,records:x.rows};}
  async registerDevice(userId:string,body:any){const token=String(body.token??'').trim();if(token.length<8)throw new BadRequestException('invalid_device_token');const x=await this.db.query(`INSERT INTO push_devices(user_id,platform,provider,token) VALUES($1,$2,'FCM',$3) ON CONFLICT(token) DO UPDATE SET user_id=EXCLUDED.user_id,platform=EXCLUDED.platform,enabled=true,last_seen_at=now() RETURNING id,user_id,platform,provider,enabled,last_seen_at`,[userId,String(body.platform??'WEB').toUpperCase(),token]);return x.rows[0];}

  async createPrivacyRequest(userId:string,body:any){const type=String(body.requestType??'').toUpperCase();if(!['ACCESS','CORRECTION','ANONYMIZATION','DELETION','PORTABILITY'].includes(type))throw new BadRequestException('invalid_privacy_request_type');const x=await this.db.query(`INSERT INTO privacy_requests(user_id,request_type,details) VALUES($1,$2,$3) RETURNING *`,[userId,type,body.details??{}]);return x.rows[0];}
  async myPrivacyRequests(userId:string){const x=await this.db.query(`SELECT * FROM privacy_requests WHERE user_id=$1 ORDER BY created_at DESC`,[userId]);return {count:x.rowCount,records:x.rows};}

  async listTeams(){const x=await this.db.query(`SELECT id,code,name,organization_code,active,created_at FROM teams ORDER BY name`);return {count:x.rowCount,records:x.rows};}
  async createTeam(body:any){const code=String(body.code??'').trim().toUpperCase(),name=String(body.name??'').trim(),org=String(body.organizationCode??'').trim();if(!code||!name)throw new BadRequestException('team code/name required');try{const x=await this.db.query(`INSERT INTO teams(code,name,organization_code,active) VALUES($1,$2,$3,true) RETURNING *`,[code,name,org||null]);return x.rows[0];}catch(e:any){if(e?.code==='23505')throw new ConflictException('team_code_exists');throw e;}}
  async addTeamMember(teamId:string,userId:string){const t=await this.db.query(`SELECT 1 FROM teams WHERE id=$1 AND active=true`,[teamId]);if(!t.rowCount)throw new NotFoundException('team_not_found');const u=await this.db.query(`SELECT 1 FROM users_account WHERE id=$1 AND active=true`,[userId]);if(!u.rowCount)throw new NotFoundException('user_not_found');await this.db.query(`INSERT INTO team_members(team_id,user_id,active) VALUES($1,$2,true) ON CONFLICT(team_id,user_id) DO UPDATE SET active=true`,[teamId,userId]);return {teamId,userId,active:true};}

  async fieldOrders(userId:string){const x=await this.db.query(`SELECT w.* FROM work_orders w JOIN team_members tm ON tm.team_id=w.team_id AND tm.active=true WHERE tm.user_id=$1 ORDER BY w.created_at DESC`,[userId]);return {count:x.rowCount,records:x.rows.map((r:any)=>({...r,occurrenceId:r.occurrence_id,teamId:r.team_id,responsibleOrgCode:r.responsible_org_code,slaDueAt:r.sla_due_at,dispatchedAt:r.dispatched_at,startedAt:r.started_at,completedAt:r.completed_at}))};}
  async fieldRoute(userId:string,workOrderId:string,lat:number,lon:number){const q=await this.db.query(`SELECT ST_X(o.point) lon,ST_Y(o.point) lat,o.protocol FROM work_orders w JOIN occurrences o ON o.id=w.occurrence_id JOIN team_members tm ON tm.team_id=w.team_id AND tm.active=true WHERE w.id=$1 AND tm.user_id=$2`,[workOrderId,userId]);if(!q.rowCount)throw new NotFoundException('work_order_not_found_or_not_assigned');const d=q.rows[0],a=Number(lat),b=Number(lon);if(!Number.isFinite(a)||!Number.isFinite(b))throw new BadRequestException('origin_coordinates_required');const token=process.env.MAPBOX_ACCESS_TOKEN;if(token){const url=`https://api.mapbox.com/directions/v5/mapbox/driving/${b},${a};${d.lon},${d.lat}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;const r=await fetch(url);if(r.ok){const j:any=await r.json();const route=j.routes?.[0];if(route)return {provider:'MAPBOX',protocol:d.protocol,distanceM:route.distance,durationS:route.duration,geometry:route.geometry};}}const dist=await this.db.query(`SELECT ST_Distance(ST_SetSRID(ST_Point($1,$2),4326)::geography,ST_SetSRID(ST_Point($3,$4),4326)::geography) d`,[b,a,d.lon,d.lat]);return {provider:'STRAIGHT_LINE_FALLBACK',protocol:d.protocol,destination:{latitude:Number(d.lat),longitude:Number(d.lon)},distanceM:Number(dist.rows[0].d),notice:'Roteamento viário exige MAPBOX_ACCESS_TOKEN; fallback não é rota de rua.'};}
  async fieldStatus(userId:string,workOrderId:string,body:any){
    const s=String(body.status??'').toUpperCase(),allowed=['ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED'];if(!allowed.includes(s))throw new BadRequestException('invalid_work_order_status');
    const x=await this.db.query(`SELECT w.*,ST_X(o.point) lon,ST_Y(o.point) lat,o.reporter_user_id,o.protocol,o.status occurrence_status FROM work_orders w JOIN occurrences o ON o.id=w.occurrence_id JOIN team_members tm ON tm.team_id=w.team_id AND tm.active=true WHERE w.id=$1 AND tm.user_id=$2`,[workOrderId,userId]);if(!x.rowCount)throw new NotFoundException('work_order_not_found_or_not_assigned');const w=x.rows[0];
    const geofenceM=Math.max(25,Number(process.env.FIELD_GEOFENCE_M??250));let distance:null|number=null;if(['ARRIVED','IN_PROGRESS','COMPLETED'].includes(s)){const lat=Number(body.latitude),lon=Number(body.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new BadRequestException('field_location_required');const d=await this.db.query(`SELECT ST_Distance(ST_SetSRID(ST_Point($1,$2),4326)::geography,ST_SetSRID(ST_Point($3,$4),4326)::geography) d`,[lon,lat,w.lon,w.lat]);distance=Number(d.rows[0].d);if(distance>geofenceM)throw new BadRequestException('outside_work_order_geofence');}
    const occurrenceStatus=s==='COMPLETED'?'RESOLVED':['ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS'].includes(s)?'IN_SERVICE':w.occurrence_status;
    await this.db.tx(async c=>{
      await c.query(`UPDATE work_orders SET status=$2,started_at=CASE WHEN $2='IN_PROGRESS' AND started_at IS NULL THEN now() ELSE started_at END,completed_at=CASE WHEN $2='COMPLETED' THEN now() ELSE completed_at END WHERE id=$1`,[workOrderId,s]);
      await c.query(`UPDATE occurrences SET status=$2::occurrence_status,resolved_at=CASE WHEN $2='RESOLVED' THEN now() ELSE resolved_at END,updated_at=now() WHERE id=$1`,[w.occurrence_id,occurrenceStatus]);
      await c.query(`INSERT INTO field_work_events(work_order_id,actor_user_id,status,point,distance_to_occurrence_m,geofence_m,payload) VALUES($1,$2,$3,CASE WHEN $4::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_Point($5,$4),4326) END,$6,$8,$7)`,[workOrderId,userId,s,body.latitude??null,body.longitude??null,distance,body.result??{},geofenceM]);
      await c.query(`INSERT INTO occurrence_events(occurrence_id,event_type,from_status,to_status,actor_user_id,payload) VALUES($1,'FIELD_WORK_STATUS',$2,$3,$4,$5)`,[w.occurrence_id,w.occurrence_status,occurrenceStatus,userId,JSON.stringify({workOrderId,workOrderStatus:s,distanceM:distance,geofenceM})]);
      await c.query(`INSERT INTO realtime_outbox(topic,entity_type,entity_id,payload) VALUES('work_order.field_status','work_order',$1,$2)`,[workOrderId,JSON.stringify({occurrenceId:w.occurrence_id,status:s,occurrenceStatus})]);
      if(w.reporter_user_id&&occurrenceStatus!==w.occurrence_status)await c.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','OCCURRENCE_STATUS_CHANGED',$3)`,[w.reporter_user_id,w.occurrence_id,JSON.stringify({protocol:w.protocol,status:occurrenceStatus})]);
    });
    const payload={workOrderId,status:s,occurrenceStatus,distanceM:distance};this.realtime.publish({topic:'work_order.field_status',entityType:'work_order',entityId:workOrderId,payload});return payload;
  }

  async publicOccurrences(){const x=await this.db.query(`SELECT o.protocol,c.code category_code,o.status,o.priority,o.territory_snapshot->>'neighborhood' neighborhood,o.territory_snapshot->>'zone' zone,round(ST_Y(o.point)::numeric/0.005)*0.005 latitude,round(ST_X(o.point)::numeric/0.005)*0.005 longitude,o.created_at,o.resolved_at FROM occurrences o JOIN categories c ON c.id=o.category_id ORDER BY o.created_at DESC LIMIT 1000`);return {count:x.rowCount,records:x.rows.map((r:any)=>({protocol:r.protocol,categoryCode:r.category_code,status:r.status,priority:r.priority,neighborhood:r.neighborhood,zone:r.zone,approximateLocation:{latitude:Number(r.latitude),longitude:Number(r.longitude),gridDegrees:0.005,notice:'Localização generalizada; não corresponde ao ponto exato da ocorrência.'},createdAt:r.created_at,resolvedAt:r.resolved_at,privacyPolicyVersion:'URBIS-PUBLIC-alpha.1'}))};}

  async publicProtocol(protocol:string){const x=await this.db.query(`SELECT o.protocol,c.code category_code,o.status,o.priority,o.territory_snapshot->>'neighborhood' neighborhood,o.created_at,o.resolved_at FROM occurrences o JOIN categories c ON c.id=o.category_id WHERE o.protocol=$1`,[protocol]);if(!x.rowCount)throw new NotFoundException('protocol_not_found');return x.rows[0];}
}
