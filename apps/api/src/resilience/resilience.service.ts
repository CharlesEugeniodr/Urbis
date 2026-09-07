import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type Level='OBSERVATION'|'ATTENTION'|'ALERT'|'MAX_ALERT';
type State={level:Level;reasons:string[];hazards:Set<string>};
const rank:Record<Level,number>={OBSERVATION:0,ATTENTION:1,ALERT:2,MAX_ALERT:3};
const colors:Record<Level,string>={OBSERVATION:'GREEN',ATTENTION:'YELLOW',ALERT:'ORANGE',MAX_ALERT:'RED'};

@Injectable()
export class ResilienceService {
  constructor(private readonly db:DatabaseService){}

  private promote(state:State,next:Level,reason:string){
    if(rank[next]>rank[state.level])state.level=next;
    state.reasons.push(reason);
  }

  private async activeRules(){
    const q=await this.db.query(`
      SELECT code,version,rules,valid_from
      FROM resilience_rulesets
      WHERE code='PLANCON_PARAUAPEBAS' AND active=true
      ORDER BY valid_from DESC,created_at DESC
      LIMIT 1`);
    if(!q.rowCount)throw new ServiceUnavailableException('ruleset PLANCON_PARAUAPEBAS não carregado');
    const row:any=q.rows[0];
    return {code:row.code,version:row.version,validFrom:row.valid_from,rules:row.rules};
  }

  async evaluate(input:Record<string,unknown>){
    const doc=await this.activeRules();
    const r:any=doc.rules?.rules??doc.rules;
    if(!r?.rainfall||!r?.river_parauapebas||!r?.dam_emergency)throw new ServiceUnavailableException('ruleset PLANCON inválido');
    const state:State={level:'OBSERVATION',reasons:[],hazards:new Set<string>()};

    const rain1h=Number(input.rainfall_1h_mm);
    if(Number.isFinite(rain1h)){
      if(rain1h>r.rainfall.alert_1h_gt_mm){this.promote(state,'ALERT',`Precipitação em 1h > ${r.rainfall.alert_1h_gt_mm} mm`);state.hazards.add('FLOODING');}
      else if(rain1h>=r.rainfall.attention_1h_min_mm&&rain1h<=r.rainfall.attention_1h_max_mm){this.promote(state,'ATTENTION',`Precipitação em 1h entre ${r.rainfall.attention_1h_min_mm} e ${r.rainfall.attention_1h_max_mm} mm`);state.hazards.add('FLOODING');}
      if(rain1h>r.rainfall.prosap_alert_1h_gt_mm){this.promote(state,'ALERT',`Indicador de transbordamento PROSAP > ${r.rainfall.prosap_alert_1h_gt_mm} mm/1h`);state.hazards.add('PROSAP_OVERFLOW');}
      else if(rain1h>r.rainfall.prosap_attention_1h_gt_mm){this.promote(state,'ATTENTION',`Indicador de transbordamento PROSAP > ${r.rainfall.prosap_attention_1h_gt_mm} mm/1h`);state.hazards.add('PROSAP_OVERFLOW');}
    }

    const rain72h=Number(input.rainfall_72h_mm);
    if(Number.isFinite(rain72h)){
      if(rain72h>r.rainfall.landslide_alert_72h_gt_mm){this.promote(state,'ALERT',`Precipitação acumulada em 72h > ${r.rainfall.landslide_alert_72h_gt_mm} mm`);state.hazards.add('LANDSLIDE');}
      else if(rain72h>0){this.promote(state,'ATTENTION',`Precipitação acumulada em 72h até ${r.rainfall.landslide_alert_72h_gt_mm} mm`);state.hazards.add('LANDSLIDE');}
    }

    const river=Number(input.river_level_m);
    if(Number.isFinite(river)){
      if(river>=r.river_parauapebas.flood_max_alert_m){this.promote(state,'MAX_ALERT',`Rio Parauapebas >= ${r.river_parauapebas.flood_max_alert_m} m`);state.hazards.add('RIVER_FLOOD');}
      else if(river>=r.river_parauapebas.flood_alert_m){this.promote(state,'ALERT',`Rio Parauapebas >= ${r.river_parauapebas.flood_alert_m} m`);state.hazards.add('RIVER_FLOOD');}
      else if(river>=r.river_parauapebas.flood_attention_m){this.promote(state,'ATTENTION',`Rio Parauapebas >= ${r.river_parauapebas.flood_attention_m} m`);state.hazards.add('RIVER_FLOOD');}
    }

    const damLevel=Number(input.mining_dam_emergency_level);
    if(Number.isInteger(damLevel)&&r.dam_emergency.mining_plancon_activation_levels.includes(damLevel)){
      this.promote(state,damLevel>=3?'MAX_ALERT':'ALERT',`Barragem de mineração em nível de emergência ${damLevel}`);state.hazards.add('DAM_EMERGENCY');
    }
    const ilha=Number(input.ilha_do_coco_response_level);
    if(Number.isInteger(ilha)&&ilha>=r.dam_emergency.igarape_ilha_do_coco_plancon_activation_level){
      this.promote(state,'MAX_ALERT',`Barragem Igarapé Ilha do Coco em nível de resposta ${ilha}`);state.hazards.add('DAM_EMERGENCY');
    }

    const temp=Number(input.temperature_c),wind=Number(input.wind_kmh),rh=Number(input.relative_humidity_pct);
    if([temp,wind,rh].every(Number.isFinite)&&r.wildfire_weather){
      const a=r.wildfire_weather.alert,t=r.wildfire_weather.attention;
      if(temp>a.temperature_c_gt&&wind>a.wind_kmh_gt&&rh>a.relative_humidity_pct_gt&&rh<a.relative_humidity_pct_lt){this.promote(state,'ALERT','Condições meteorológicas de alerta para queimada/incêndio florestal');state.hazards.add('WILDFIRE');}
      else if(temp>t.temperature_c_gt&&wind>t.wind_kmh_gt&&rh>t.relative_humidity_pct_gt&&rh<t.relative_humidity_pct_lt){this.promote(state,'ATTENTION','Condições meteorológicas de atenção para queimada/incêndio florestal');state.hazards.add('WILDFIRE');}
    }

    return {
      ruleset:doc.code,
      ruleVersion:doc.version,
      documentaryReferenceYear:2023,
      level:state.level,
      color:colors[state.level],
      hazards:[...state.hazards],
      reasons:state.reasons,
      authorityValidationRequired:state.level==='ALERT'||state.level==='MAX_ALERT',
      sourceStatus:'documentary_baseline'
    };
  }
}
