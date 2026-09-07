import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { RealtimeService } from '../realtime/realtime.service';

const ACTIVE_DUP_STATUSES=['OPEN','TRIAGE','DISPATCHED','IN_SERVICE'];
const TERMINAL=new Set(['RESOLVED','REJECTED','DUPLICATE']);

type CreateOccurrenceInput={
  categoryCode?:string; description?:string; latitude?:number; longitude?:number; gpsAccuracyM?:number;
  addressText?:string; cep?:string; reporterUserId?:string; clientRequestId?:string; priority?:string;
};

type TriageInput={decision?:'PROCEDENT'|'IMPROCEDENT'|'DUPLICATE';duplicateOf?:string;notes?:string;responsibleOrgCode?:string;priority?:string};

function num(v:unknown){return typeof v==='number'?v:Number(v)}
function priorityForCategory(code:string){return code==='RESILIENCE'?'CRITICAL':['ENERGY','TRAFFIC_SIGNAL','WATER'].includes(code)?'HIGH':['PAVEMENT','LIGHTING'].includes(code)?'MEDIUM':'NORMAL'}
function priorityValue(v:unknown){if(v==null||v==='')return null;const p=String(v).toUpperCase();if(!['NORMAL','MEDIUM','HIGH','CRITICAL'].includes(p))throw new BadRequestException('priority inválida');return p;}
function occurrenceSelect(){return `
 SELECT o.id,o.protocol,o.reporter_user_id,c.code AS category_code,c.name AS category_name,o.status,o.urgency,o.priority,o.priority_source,o.description,
        ST_Y(o.point) AS latitude,ST_X(o.point) AS longitude,o.gps_accuracy_m,o.address_text,o.cep,
        o.street_segment_id,o.territory_snapshot,o.duplicate_suspected,o.duplicate_of,o.evidence_state,
        o.created_at,o.triaged_at,o.resolved_at,o.updated_at
 FROM occurrences o JOIN categories c ON c.id=o.category_id`}

@Injectable()
export class OccurrencesService {
  constructor(private readonly db:DatabaseService,private readonly realtime:RealtimeService){}

  private validateCreate(body:CreateOccurrenceInput){
    const categoryCode=String(body.categoryCode??'').trim().toUpperCase();
    const latitude=num(body.latitude),longitude=num(body.longitude);
    if(!categoryCode) throw new BadRequestException('categoryCode é obrigatório');
    if(!Number.isFinite(latitude)||latitude<-90||latitude>90) throw new BadRequestException('latitude inválida');
    if(!Number.isFinite(longitude)||longitude<-180||longitude>180) throw new BadRequestException('longitude inválida');
    const gpsAccuracyM=body.gpsAccuracyM==null?null:num(body.gpsAccuracyM);
    if(gpsAccuracyM!=null&&(!Number.isFinite(gpsAccuracyM)||gpsAccuracyM<0||gpsAccuracyM>100000)) throw new BadRequestException('gpsAccuracyM inválido');
    const cep=body.cep?String(body.cep).trim():null;
    if(cep&&!/^\d{5}-?\d{3}$/.test(cep)) throw new BadRequestException('CEP inválido');
    return {categoryCode,latitude,longitude,gpsAccuracyM,cep:cep?(cep.includes('-')?cep:`${cep.slice(0,5)}-${cep.slice(5)}`):null};
  }

  async create(body:CreateOccurrenceInput){
    const v=this.validateCreate(body);
    const result=await this.db.tx(async client=>{
      if(body.clientRequestId){
        const prior=await client.query(`${occurrenceSelect()} WHERE o.client_request_id=$1`,[String(body.clientRequestId)]);
        if(prior.rowCount) return {occurrence:prior.rows[0],duplicates:[],idempotent:true};
      }
      const category=await client.query(`SELECT id,code,name,default_urgency FROM categories WHERE code=$1 AND public_enabled=true`,[v.categoryCode]);
      if(!category.rowCount) throw new BadRequestException(`categoria desconhecida: ${v.categoryCode}`);
      const source=await client.query(`SELECT id FROM data_sources WHERE code='URBIS_CITIZEN_APP' LIMIT 1`);
      if(!source.rowCount) throw new ConflictException('Fonte URBIS_CITIZEN_APP não configurada; execute migration 009');

      const nearest=await client.query(`
        WITH p AS (SELECT ST_SetSRID(ST_MakePoint($1,$2),4326) AS g)
        SELECT s.id,s.cep,s.street_type,s.street_name,s.neighborhood_name,s.zone_name,
               ST_Distance(s.geom::geography,p.g::geography) AS distance_m
        FROM street_segments s,p
        WHERE ST_DWithin(s.geom::geography,p.g::geography,$3)
        ORDER BY s.geom <-> p.g LIMIT 1`,[v.longitude,v.latitude,Number(process.env.TERRITORY_SNAP_MAX_M??120)]);
      const street=nearest.rows[0]??null;
      const territorySnapshot=street?{
        streetSegmentId:street.id,streetName:street.street_name,streetType:street.street_type,cep:street.cep,
        neighborhood:street.neighborhood_name,zone:street.zone_name,distanceM:Number(street.distance_m),source:'Logradouros 2025'
      }:{matched:false};
      const resolvedCep=v.cep??street?.cep??null;
      let neighborhoodId:null|number=null;
      if(street?.neighborhood_name){
        const n=await client.query(`SELECT id FROM neighborhoods WHERE lower(canonical_name)=lower($1) LIMIT 1`,[street.neighborhood_name]);
        neighborhoodId=n.rows[0]?.id??null;
      }
      const protocol=(await client.query(`SELECT urbis_next_protocol() AS protocol`)).rows[0].protocol;
      const inserted=await client.query(`
        INSERT INTO occurrences(protocol,reporter_user_id,category_id,status,urgency,priority,priority_source,description,point,gps_accuracy_m,address_text,cep,
          neighborhood_id,source_id,evidence_state,client_request_id,street_segment_id,territory_snapshot)
        VALUES($1,$2,$3,'OPEN',$4,$5,$6,$7,ST_SetSRID(ST_MakePoint($8,$9),4326),$10,$11,$12,$13,$14,'RECEIVED',$15,$16,$17)
        RETURNING id`,[
          protocol,body.reporterUserId??null,category.rows[0].id,category.rows[0].default_urgency,priorityValue(body.priority)??priorityForCategory(v.categoryCode),body.priority?'MANUAL':'CATEGORY_DEFAULT',body.description??null,
          v.longitude,v.latitude,v.gpsAccuracyM,body.addressText??null,resolvedCep,neighborhoodId,source.rows[0].id,
          body.clientRequestId??null,street?.id??null,JSON.stringify(territorySnapshot)
        ]);
      const id=inserted.rows[0].id;
      const duplicateRadius=Number(process.env.DUPLICATE_RADIUS_M??35);
      const duplicateWindowHours=Math.max(1,Number(process.env.DUPLICATE_WINDOW_HOURS??24));
      const dup=await client.query(`
        SELECT o.id,o.protocol,ST_Distance(o.point::geography,n.point::geography) AS distance_m,
               extract(epoch from (n.created_at-o.created_at))::int AS delta_seconds
        FROM occurrences n
        JOIN occurrences o ON o.category_id=n.category_id AND o.id<>n.id
        WHERE n.id=$1 AND o.status=ANY($2::occurrence_status[])
          AND o.created_at>=n.created_at-($3::text||' hours')::interval
          AND ST_DWithin(o.point::geography,n.point::geography,$4)
        ORDER BY distance_m ASC,delta_seconds ASC LIMIT 8`,[id,ACTIVE_DUP_STATUSES,duplicateWindowHours,duplicateRadius]);
      for(const d of dup.rows){
        const distance=Number(d.distance_m),delta=Math.abs(Number(d.delta_seconds));
        const spatial=Math.max(0,1-distance/duplicateRadius),temporal=Math.max(0,1-delta/(duplicateWindowHours*3600));
        const score=0.7*spatial+0.3*temporal;
        await client.query(`INSERT INTO occurrence_duplicate_candidates(occurrence_id,candidate_occurrence_id,distance_m,delta_seconds,score)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[id,d.id,distance,delta,score]);
      }
      if(dup.rowCount) await client.query(`UPDATE occurrences SET duplicate_suspected=true,updated_at=now() WHERE id=$1`,[id]);
      await client.query(`INSERT INTO occurrence_events(occurrence_id,event_type,to_status,payload) VALUES($1,'CREATED','OPEN',$2)`,[id,JSON.stringify({territorySnapshot,duplicateCandidates:dup.rowCount??0})]);
      await client.query(`INSERT INTO realtime_outbox(topic,entity_type,entity_id,payload) VALUES('occurrence.created','occurrence',$1,$2)`,[id,JSON.stringify({id,protocol})]);
      if(body.reporterUserId)await client.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','OCCURRENCE_CREATED',$3)`,[body.reporterUserId,id,JSON.stringify({protocol,status:'OPEN'})]);
      const row=await client.query(`${occurrenceSelect()} WHERE o.id=$1`,[id]);
      return {occurrence:row.rows[0],duplicates:dup.rows,idempotent:false};
    });
    if(!result.idempotent) this.realtime.publish({topic:'occurrence.created',entityType:'occurrence',entityId:String(result.occurrence.id),payload:result});
    return result;
  }

  async list(query:{status?:string;categoryCode?:string;neighborhood?:string;from?:string;to?:string;limit?:string}){
    const values:any[]=[];const where:string[]=[];
    if(query.status){values.push(String(query.status).toUpperCase());where.push(`o.status=$${values.length}::occurrence_status`)}
    if(query.categoryCode){values.push(String(query.categoryCode).toUpperCase());where.push(`c.code=$${values.length}`)}
    if(query.neighborhood){values.push(String(query.neighborhood));where.push(`lower(o.territory_snapshot->>'neighborhood')=lower($${values.length})`)}
    if(query.from){values.push(query.from);where.push(`o.created_at>=$${values.length}::timestamptz`)}
    if(query.to){values.push(query.to);where.push(`o.created_at<=$${values.length}::timestamptz`)}
    const limit=Math.max(1,Math.min(Number(query.limit)||200,1000));values.push(limit);
    const q=await this.db.query(`${occurrenceSelect()} ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY o.created_at DESC LIMIT $${values.length}`,values);
    return {count:q.rowCount??0,records:q.rows};
  }

  async summary(){
    const q=await this.db.query(`SELECT status,count(*)::int AS count FROM occurrences GROUP BY status`);
    const w=await this.db.query(`SELECT count(*)::int AS count FROM work_orders`);
    const byStatus=Object.fromEntries(q.rows.map((r:any)=>[r.status,r.count]));
    return {occurrences:Object.values(byStatus).reduce((a:any,b:any)=>Number(a)+Number(b),0),workOrders:w.rows[0]?.count??0,byStatus};
  }

  async get(id:string,user?:{sub?:string;roles?:string[]}){
    const q=await this.db.query(`${occurrenceSelect()} WHERE o.id=$1`,[id]);
    if(!q.rowCount) throw new NotFoundException('ocorrência não encontrada');
    const row:any=q.rows[0];const roles=(user?.roles??[]).map(r=>String(r).toUpperCase()),privileged=roles.some(r=>['OPERATOR','MANAGER','ADMIN'].includes(r)),field=roles.includes('FIELD_AGENT');
    let assigned=false;if(user&&field){const a=await this.db.query(`SELECT 1 FROM work_orders w JOIN team_members tm ON tm.team_id=w.team_id AND tm.active=true WHERE w.occurrence_id=$1 AND tm.user_id=$2 LIMIT 1`,[id,user.sub]);assigned=Boolean(a.rowCount);}
    if(user&&!privileged&&!assigned&&row.reporter_user_id!==user.sub) throw new NotFoundException('ocorrência não encontrada');
    const d=await this.db.query(`SELECT dc.candidate_occurrence_id,o.protocol,dc.distance_m,dc.delta_seconds,dc.score FROM occurrence_duplicate_candidates dc JOIN occurrences o ON o.id=dc.candidate_occurrence_id WHERE dc.occurrence_id=$1 ORDER BY dc.score DESC`,[id]);
    const w=(privileged||assigned)?await this.db.query(`SELECT * FROM work_orders WHERE occurrence_id=$1 ORDER BY created_at DESC`,[id]):{rows:[]};const ev=await this.db.query(`SELECT event_type,from_status,to_status,payload,created_at FROM occurrence_events WHERE occurrence_id=$1 ORDER BY created_at`,[id]);
    return {...row,duplicateCandidates:d.rows,timeline:ev.rows,workOrders:w.rows};
  }

  async listForUser(userId:string){
    const q=await this.db.query(`${occurrenceSelect()} WHERE o.reporter_user_id=$1 ORDER BY o.created_at DESC LIMIT 500`,[userId]);
    return {count:q.rowCount??0,records:q.rows};
  }

  async triage(id:string,body:TriageInput){
    const decision=String(body.decision??'').toUpperCase();
    if(!['PROCEDENT','IMPROCEDENT','DUPLICATE'].includes(decision)) throw new BadRequestException('decision deve ser PROCEDENT, IMPROCEDENT ou DUPLICATE');
    const result=await this.db.tx(async client=>{
      const current=await client.query(`${occurrenceSelect()} WHERE o.id=$1 FOR UPDATE`,[id]);
      if(!current.rowCount) throw new NotFoundException('ocorrência não encontrada');
      const occ=current.rows[0];
      if(TERMINAL.has(occ.status)) throw new ConflictException(`ocorrência já encerrada em ${occ.status}`);
      const manualPriority=priorityValue(body.priority);if(manualPriority)await client.query(`UPDATE occurrences SET priority=$2::urbis_priority,priority_source='MANUAL',updated_at=now() WHERE id=$1`,[id,manualPriority]);
      if(decision==='IMPROCEDENT'){
        await client.query(`UPDATE occurrences SET status='REJECTED',triaged_at=now(),triage_notes=$2,updated_at=now() WHERE id=$1`,[id,body.notes??null]);
        await this.event(client,id,'TRIAGE_REJECTED',occ.status,'REJECTED',{notes:body.notes??null});if(occ.reporter_user_id)await client.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','OCCURRENCE_STATUS_CHANGED',$3)`,[occ.reporter_user_id,id,JSON.stringify({protocol:occ.protocol,status:'REJECTED'})]);
        return {occurrenceId:id,status:'REJECTED',decision};
      }
      if(decision==='DUPLICATE'){
        let duplicateOf=body.duplicateOf??null;
        if(!duplicateOf){const d=await client.query(`SELECT candidate_occurrence_id FROM occurrence_duplicate_candidates WHERE occurrence_id=$1 ORDER BY score DESC LIMIT 1`,[id]);duplicateOf=d.rows[0]?.candidate_occurrence_id??null;}
        if(!duplicateOf) throw new BadRequestException('duplicateOf obrigatório quando não há candidato calculado');
        const target=await client.query(`SELECT id FROM occurrences WHERE id=$1`,[duplicateOf]);if(!target.rowCount) throw new BadRequestException('duplicateOf inexistente');
        await client.query(`UPDATE occurrences SET status='DUPLICATE',duplicate_of=$2,triaged_at=now(),triage_notes=$3,updated_at=now() WHERE id=$1`,[id,duplicateOf,body.notes??null]);
        await this.event(client,id,'TRIAGE_DUPLICATE',occ.status,'DUPLICATE',{duplicateOf,notes:body.notes??null});if(occ.reporter_user_id)await client.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','OCCURRENCE_STATUS_CHANGED',$3)`,[occ.reporter_user_id,id,JSON.stringify({protocol:occ.protocol,status:'DUPLICATE'})]);
        return {occurrenceId:id,status:'DUPLICATE',decision,duplicateOf};
      }
      const rule=await client.query(`SELECT * FROM dispatch_rules WHERE category_code=$1 AND active=true`,[occ.category_code]);
      if(!rule.rowCount) throw new ConflictException(`regra de despacho ausente para ${occ.category_code}`);
      const r=rule.rows[0],responsibleOrgCode=body.responsibleOrgCode??r.responsible_org_code;
      const team=await client.query(`SELECT id FROM teams WHERE active=true AND organization_code=$1 ORDER BY created_at LIMIT 1`,[responsibleOrgCode]);const teamId=team.rows[0]?.id??null;
      const wo=await client.query(`INSERT INTO work_orders(occurrence_id,team_id,responsible_org_code,status,sla_due_at,dispatched_at,result)
        VALUES($1,$2,$3,'DISPATCHED',now()+($4::text||' minutes')::interval,now(),$5) RETURNING *`,[id,teamId,responsibleOrgCode,r.sla_minutes,JSON.stringify({routingMode:r.routing_mode,provisionalSla:r.provisional,sourceNote:r.source_note})]);
      await client.query(`UPDATE occurrences SET status='DISPATCHED',triaged_at=now(),triage_notes=$2,updated_at=now() WHERE id=$1`,[id,body.notes??null]);
      await this.event(client,id,'TRIAGE_PROCEDENT',occ.status,'DISPATCHED',{workOrderId:wo.rows[0].id,responsibleOrgCode,provisionalSla:r.provisional});if(occ.reporter_user_id)await client.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','OCCURRENCE_STATUS_CHANGED',$3)`,[occ.reporter_user_id,id,JSON.stringify({protocol:occ.protocol,status:'DISPATCHED'})]);
      return {occurrenceId:id,status:'DISPATCHED',decision,workOrder:wo.rows[0]};
    });
    this.realtime.publish({topic:'occurrence.triaged',entityType:'occurrence',entityId:id,payload:result});
    return result;
  }

  private async event(client:PoolClient,id:string,type:string,from:string,to:string,payload:Record<string,unknown>){
    await client.query(`INSERT INTO occurrence_events(occurrence_id,event_type,from_status,to_status,payload) VALUES($1,$2,$3,$4,$5)`,[id,type,from,to,JSON.stringify(payload)]);
    await client.query(`INSERT INTO realtime_outbox(topic,entity_type,entity_id,payload) VALUES($1,'occurrence',$2,$3)`,[`occurrence.${type.toLowerCase()}`,id,JSON.stringify(payload)]);
  }
}
