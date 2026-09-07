import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RULES = path.join(__dirname, '..', 'data', 'plancon', 'rules-plancon-v2-2023.json');

export function loadRules(file = DEFAULT_RULES) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const rank = { OBSERVATION: 0, ATTENTION: 1, ALERT: 2, MAX_ALERT: 3 };
const colors = { OBSERVATION: 'GREEN', ATTENTION: 'YELLOW', ALERT: 'ORANGE', MAX_ALERT: 'RED' };

function promote(state, next, reason) {
  if (rank[next] > rank[state.level]) state.level = next;
  state.reasons.push(reason);
}

export function evaluateResilience(input, rulesDoc = loadRules()) {
  const r = rulesDoc.rules;
  const state = { level: 'OBSERVATION', reasons: [], hazards: new Set() };

  const rain1h = Number(input.rainfall_1h_mm);
  if (Number.isFinite(rain1h)) {
    if (rain1h > r.rainfall.alert_1h_gt_mm) {
      promote(state, 'ALERT', `Precipitação em 1h > ${r.rainfall.alert_1h_gt_mm} mm`);
      state.hazards.add('FLOODING');
    } else if (rain1h >= r.rainfall.attention_1h_min_mm && rain1h <= r.rainfall.attention_1h_max_mm) {
      promote(state, 'ATTENTION', `Precipitação em 1h entre ${r.rainfall.attention_1h_min_mm} e ${r.rainfall.attention_1h_max_mm} mm`);
      state.hazards.add('FLOODING');
    }
    if (rain1h > r.rainfall.prosap_alert_1h_gt_mm) {
      promote(state, 'ALERT', `Indicador de transbordamento PROSAP > ${r.rainfall.prosap_alert_1h_gt_mm} mm/1h`);
      state.hazards.add('PROSAP_OVERFLOW');
    } else if (rain1h > r.rainfall.prosap_attention_1h_gt_mm) {
      promote(state, 'ATTENTION', `Indicador de transbordamento PROSAP > ${r.rainfall.prosap_attention_1h_gt_mm} mm/1h`);
      state.hazards.add('PROSAP_OVERFLOW');
    }
  }

  const rain72h = Number(input.rainfall_72h_mm);
  if (Number.isFinite(rain72h)) {
    if (rain72h > r.rainfall.landslide_alert_72h_gt_mm) {
      promote(state, 'ALERT', `Precipitação acumulada em 72h > ${r.rainfall.landslide_alert_72h_gt_mm} mm`);
      state.hazards.add('LANDSLIDE');
    } else if (rain72h > 0) {
      promote(state, 'ATTENTION', `Precipitação acumulada em 72h até ${r.rainfall.landslide_alert_72h_gt_mm} mm`);
      state.hazards.add('LANDSLIDE');
    }
  }

  const river = Number(input.river_level_m);
  if (Number.isFinite(river)) {
    if (river >= r.river_parauapebas.flood_max_alert_m) {
      promote(state, 'MAX_ALERT', `Rio Parauapebas >= ${r.river_parauapebas.flood_max_alert_m} m`);
      state.hazards.add('RIVER_FLOOD');
    } else if (river >= r.river_parauapebas.flood_alert_m) {
      promote(state, 'ALERT', `Rio Parauapebas >= ${r.river_parauapebas.flood_alert_m} m`);
      state.hazards.add('RIVER_FLOOD');
    } else if (river >= r.river_parauapebas.flood_attention_m) {
      promote(state, 'ATTENTION', `Rio Parauapebas >= ${r.river_parauapebas.flood_attention_m} m`);
      state.hazards.add('RIVER_FLOOD');
    }
  }

  const damLevel = Number(input.mining_dam_emergency_level);
  if (Number.isInteger(damLevel) && r.dam_emergency.mining_plancon_activation_levels.includes(damLevel)) {
    promote(state, damLevel >= 3 ? 'MAX_ALERT' : 'ALERT', `Barragem de mineração em nível de emergência ${damLevel}`);
    state.hazards.add('DAM_EMERGENCY');
  }

  const ilha = Number(input.ilha_do_coco_response_level);
  if (Number.isInteger(ilha) && ilha >= r.dam_emergency.igarape_ilha_do_coco_plancon_activation_level) {
    promote(state, 'MAX_ALERT', `Barragem Igarapé Ilha do Coco em nível de resposta ${ilha}`);
    state.hazards.add('DAM_EMERGENCY');
  }

  const temp = Number(input.temperature_c);
  const wind = Number(input.wind_kmh);
  const rh = Number(input.relative_humidity_pct);
  if ([temp, wind, rh].every(Number.isFinite)) {
    const a = r.wildfire_weather.alert;
    const t = r.wildfire_weather.attention;
    if (temp > a.temperature_c_gt && wind > a.wind_kmh_gt && rh > a.relative_humidity_pct_gt && rh < a.relative_humidity_pct_lt) {
      promote(state, 'ALERT', 'Condições meteorológicas de alerta para queimada/incêndio florestal');
      state.hazards.add('WILDFIRE');
    } else if (temp > t.temperature_c_gt && wind > t.wind_kmh_gt && rh > t.relative_humidity_pct_gt && rh < t.relative_humidity_pct_lt) {
      promote(state, 'ATTENTION', 'Condições meteorológicas de atenção para queimada/incêndio florestal');
      state.hazards.add('WILDFIRE');
    }
  }

  return {
    ruleset: rulesDoc.ruleset,
    rule_version: rulesDoc.version,
    documentary_reference_year: rulesDoc.reference_year,
    level: state.level,
    color: colors[state.level],
    hazards: [...state.hazards],
    reasons: state.reasons,
    authority_validation_required: state.level === 'ALERT' || state.level === 'MAX_ALERT'
  };
}
