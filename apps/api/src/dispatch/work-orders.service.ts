import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RealtimeService } from '../realtime/realtime.service';

const ALLOWED=['ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED'];
@Injectable()
export class WorkOrdersService {
  constructor(private readonly db:DatabaseService,private readonly realtime:RealtimeService){}
  private shape(r:any){return {...r,occurrenceId:r.occurrence_id,teamId:r.team_id,responsibleOrgCode:r.responsible_org_code,slaDueAt:r.sla_due_at,dispatchedAt:r.dispatched_at,startedAt:r.started_at,completedAt:r.completed_at,createdAt:r.created_at};}
  async list(limitRaw?:string){const limit=Math.max(1,Math.min(Number(limitRaw)||200,1000));const q=await this.db.query(`SELECT * FROM work_orders ORDER BY created_at DESC LIMIT $1`,[limit]);return {count:q.rowCount??0,records:q.rows.map(r=>this.shape(r))};}
  async listByTeam(teamId:string,user?:any){const roles=(user?.roles??[]).map((x:string)=>String(x).toUpperCase());if(roles.includes('FIELD_AGENT')&&!roles.some((x:string)=>['OPERATOR','MANAGER','ADMIN'].includes(x))){const m=await this.db.query(`SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2 AND active=true`,[teamId,user?.sub]);if(!m.rowCount)throw new NotFoundException('team_not_assigned');}const q=await this.db.query(`SELECT * FROM work_orders WHERE team_id=$1 ORDER BY created_at DESC LIMIT 1000`,[teamId]);return {count:q.rowCount??0,records:q.rows.map(r=>this.shape(r))};}
  async create(body:Record<string,unknown>){
    const occurrenceId=String(body.occurrenceId??'');if(!occurrenceId)throw new BadRequestException('occurrenceId obrigatório');
    const result=await this.db.tx(async client=>{
      const o=await client.query(`SELECT o.id,o.status,o.reporter_user_id,o.protocol,c.code category_code FROM occurrences o JOIN categories c ON c.id=o.category_id WHERE o.id=$1 FOR UPDATE`,[occurrenceId]);if(!o.rowCount)throw new NotFoundException('ocorrência não encontrada');const occ=o.rows[0];if(['RESOLVED','REJECTED','DUPLICATE'].includes(occ.status))throw new ConflictException('ocorrência encerrada');
      const existing=await client.query(`SELECT id FROM work_orders WHERE occurrence_id=$1 AND status NOT IN ('COMPLETED','CANCELLED') LIMIT 1`,[occurrenceId]);if(existing.rowCount)throw new ConflictException('ordem de serviço ativa já existe');
      const rule=await client.query(`SELECT * FROM dispatch_rules WHERE category_code=$1 AND active=true`,[occ.category_code]);if(!rule.rowCount)throw new ConflictException('regra de despacho ausente');const rr=rule.rows[0];
      const responsibleOrgCode=String(body.responsibleOrgCode??rr.responsible_org_code);let teamId=body.teamId?String(body.teamId):null;
      if(teamId){const t=await client.query(`SELECT 1 FROM teams WHERE id=$1 AND active=true`,[teamId]);if(!t.rowCount)throw new BadRequestException('teamId inexistente/inativo');}
      else{const t=await client.query(`SELECT id FROM teams WHERE active=true AND organization_code=$1 ORDER BY created_at LIMIT 1`,[responsibleOrgCode]);teamId=t.rows[0]?.id??null;}
      const w=await client.query(`INSERT INTO work_orders(occurrence_id,team_id,responsible_org_code,status,sla_due_at,dispatched_at,result) VALUES($1,$2,$3,'DISPATCHED',now()+($4::text||' minutes')::interval,now(),$5) RETURNING *`,[occurrenceId,teamId,responsibleOrgCode,rr.sla_minutes,JSON.stringify({routingMode:rr.routing_mode,provisionalSla:rr.provisional,sourceNote:rr.source_note})]);
      await client.query(`UPDATE occurrences SET status='DISPATCHED',triaged_at=COALESCE(triaged_at,now()),updated_at=now() WHERE id=$1`,[occurrenceId]);
      await client.query(`INSERT INTO occurrence_events(occurrence_id,event_type,from_status,to_status,payload) VALUES($1,'SERVICE_ORDER_CREATED',$2,'DISPATCHED',$3)`,[occurrenceId,occ.status,JSON.stringify({workOrderId:w.rows[0].id,teamId,responsibleOrgCode})]);
      await client.query(`INSERT INTO realtime_outbox(topic,entity_type,entity_id,payload) VALUES('work_order.created','work_order',$1,$2)`,[w.rows[0].id,JSON.stringify({occurrenceId,teamId,responsibleOrgCode})]);
      if(occ.reporter_user_id)await client.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','OCCURRENCE_STATUS_CHANGED',$3)`,[occ.reporter_user_id,occurrenceId,JSON.stringify({protocol:occ.protocol,status:'DISPATCHED'})]);
      return this.shape(w.rows[0]);
    });this.realtime.publish({topic:'work_order.created',entityType:'work_order',entityId:result.id,payload:{occurrenceId:result.occurrenceId,teamId:result.teamId}});return {workOrder:result};
  }
  async assignTeam(id:string,teamId:string){
    const q=await this.db.query(`UPDATE work_orders SET team_id=$2 WHERE id=$1 AND EXISTS(SELECT 1 FROM teams t WHERE t.id=$2 AND t.active=true) RETURNING *`,[id,teamId]);if(!q.rowCount)throw new NotFoundException('ordem ou equipe ativa não encontrada');const r=this.shape(q.rows[0]);this.realtime.publish({topic:'work_order.assigned',entityType:'work_order',entityId:id,payload:{teamId}});return {workOrder:r};
  }
  async updateStatus(id:string,body:Record<string,unknown>){
    const status=String(body.status??'').toUpperCase();if(!ALLOWED.includes(status)) throw new BadRequestException(`status inválido: ${status}`);
    const result=await this.db.tx(async client=>{
      const q=await client.query(`SELECT w.*,o.status AS occurrence_status,o.reporter_user_id,o.protocol FROM work_orders w JOIN occurrences o ON o.id=w.occurrence_id WHERE w.id=$1 FOR UPDATE`,[id]);
      if(!q.rowCount) throw new NotFoundException('ordem de serviço não encontrada');
      const w=q.rows[0];if(['COMPLETED','CANCELLED'].includes(w.status)) throw new ConflictException(`ordem encerrada em ${w.status}`);
      const fields:string[]=['status=$2'];const vals:any[]=[id,status];
      if(status==='IN_PROGRESS')fields.push('started_at=COALESCE(started_at,now())');if(status==='COMPLETED')fields.push('completed_at=now()');if(body.result!=null){vals.push(JSON.stringify(body.result));fields.push(`result=result || $${vals.length}::jsonb`)}
      await client.query(`UPDATE work_orders SET ${fields.join(',')} WHERE id=$1`,vals);
      let occurrenceStatus=w.occurrence_status;if(['ACCEPTED','EN_ROUTE','ARRIVED','IN_PROGRESS'].includes(status))occurrenceStatus='IN_SERVICE';if(status==='COMPLETED')occurrenceStatus='RESOLVED';
      if(occurrenceStatus!==w.occurrence_status){await client.query(`UPDATE occurrences SET status=$2,updated_at=now(),resolved_at=CASE WHEN $2='RESOLVED' THEN now() ELSE resolved_at END WHERE id=$1`,[w.occurrence_id,occurrenceStatus]);await client.query(`INSERT INTO occurrence_events(occurrence_id,event_type,from_status,to_status,payload) VALUES($1,'WORK_ORDER_STATUS',$2,$3,$4)`,[w.occurrence_id,w.occurrence_status,occurrenceStatus,JSON.stringify({workOrderId:id,workOrderStatus:status})]);if(w.reporter_user_id)await client.query(`INSERT INTO notification_outbox(user_id,occurrence_id,channel,template_code,payload) VALUES($1,$2,'PUSH','OCCURRENCE_STATUS_CHANGED',$3)`,[w.reporter_user_id,w.occurrence_id,JSON.stringify({protocol:w.protocol,status:occurrenceStatus})]);}
      await client.query(`INSERT INTO realtime_outbox(topic,entity_type,entity_id,payload) VALUES('work_order.status','work_order',$1,$2)`,[id,JSON.stringify({occurrenceId:w.occurrence_id,status,occurrenceStatus})]);return {workOrderId:id,occurrenceId:w.occurrence_id,status,occurrenceStatus};
    });this.realtime.publish({topic:'work_order.status',entityType:'work_order',entityId:id,payload:result});return result;
  }
}
