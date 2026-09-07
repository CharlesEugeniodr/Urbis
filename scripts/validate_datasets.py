#!/usr/bin/env python3
import csv, hashlib, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def sha256(path:Path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for c in iter(lambda:f.read(1024*1024),b''):h.update(c)
    return h.hexdigest()

# CEP reference extracted from PDF
cep_path=ROOT/'data/territorial/ceps_parauapebas_2025.csv'
with cep_path.open(encoding='utf-8') as f: rows=list(csv.DictReader(f))
if len(rows)!=2541: errors.append(f'CEPs: esperado 2541; obtido {len(rows)}')
for i,r in enumerate(rows,2):
    if not re.fullmatch(r'\d{5}-\d{3}',r['cep']): errors.append(f'linha {i}: CEP inválido')
    if not r['street_name'] or not r['neighborhood_source']: errors.append(f'linha {i}: campo obrigatório vazio')

# PLANCON baseline
rules=json.loads((ROOT/'data/plancon/rules-plancon-v2-2023.json').read_text(encoding='utf-8'))
rr=rules['rules']['river_parauapebas']; pr=rules['rules']['rainfall']
if [rr['flood_attention_m'],rr['flood_alert_m'],rr['flood_max_alert_m']] != [8.0,9.5,11.0]: errors.append('PLANCON: cotas divergentes')
if pr['alert_1h_gt_mm']!=50.0 or pr['landslide_alert_72h_gt_mm']!=100.0: errors.append('PLANCON: chuva divergente')

# Operational GIS dataset
meta_path=ROOT/'data/territorial/logradouros_parauapebas_2025.metadata.json'
geo_path=ROOT/'data/territorial/logradouros_parauapebas_2025.operational.geojson'
quarantine_path=ROOT/'data/territorial/logradouros_parauapebas_2025.quarantine.json'
meta=json.loads(meta_path.read_text(encoding='utf-8')); geo=json.loads(geo_path.read_text(encoding='utf-8')); quarantine=json.loads(quarantine_path.read_text(encoding='utf-8'))
if geo.get('type')!='FeatureCollection': errors.append('GIS: camada operacional não é FeatureCollection')
if len(geo.get('features',[]))!=10997: errors.append(f"GIS: esperado 10997 segmentos; obtido {len(geo.get('features',[]))}")
if quarantine.get('count')!=82: errors.append(f"GIS: esperado 82 em quarentena; obtido {quarantine.get('count')}")
if meta.get('quarantine_by_reason')!={'EMPTY_GEOMETRY':81,'INVALID_GEOMETRY':1}: errors.append('GIS: distribuição de quarentena divergente')
if meta.get('source_feature_count')!=11079: errors.append('GIS: contagem da fonte divergente')
if meta.get('operational_sha256')!=sha256(geo_path): errors.append('GIS: hash da camada operacional divergente')
if meta.get('unique_neighborhoods')!=46 or meta.get('unique_zones')!=6: errors.append('GIS: bairros/zonas divergentes do baseline importado')
if meta.get('ceps_common_geometry_pdf')!=2446: errors.append('GIS/CEP: interseção esperada de 2446 CEPs não confirmada')

if errors:
    print('\n'.join('ERRO: '+e for e in errors)); raise SystemExit(1)
print(f"OK: {len(rows)} CEPs; {len(geo['features'])} segmentos GIS; {quarantine['count']} registros em quarentena; PLANCON íntegro.")
