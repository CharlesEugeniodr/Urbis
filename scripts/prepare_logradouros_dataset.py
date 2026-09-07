#!/usr/bin/env python3
"""Normaliza a fonte vetorial de logradouros sem apagar registros problemáticos.

Entrada esperada: envelope {"success": true, "geojson": FeatureCollection}.
Saídas: camada operacional, quarentena e metadados de auditoria.
"""
from __future__ import annotations
import argparse, csv, hashlib, json
from collections import Counter
from pathlib import Path

try:
    from shapely.geometry import shape
    from shapely.ops import transform
    from shapely.validation import explain_validity
    from pyproj import Transformer
except Exception as exc:
    raise SystemExit('Dependências necessárias: shapely e pyproj. Erro: '+str(exc))

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('input', type=Path)
    ap.add_argument('--out-dir', type=Path, required=True)
    ap.add_argument('--ceps-csv', type=Path)
    args=ap.parse_args()
    args.out_dir.mkdir(parents=True,exist_ok=True)

    wrapper=json.loads(args.input.read_text(encoding='utf-8-sig'))
    if wrapper.get('success') is not True or not isinstance(wrapper.get('geojson'),dict):
        raise SystemExit('Envelope da fonte não reconhecido.')
    source=wrapper['geojson']
    if source.get('type')!='FeatureCollection': raise SystemExit('GeoJSON não é FeatureCollection.')

    transformer=Transformer.from_crs('OGC:CRS84','EPSG:31982',always_xy=True)
    valid=[]; quarantine=[]; bbox=[180,90,-180,-90]; total_m=0.0
    for idx,ft in enumerate(source.get('features',[])):
        geom=ft.get('geometry'); reason=None; detail=None
        try:
            g=shape(geom) if geom else None
            if g is None or g.is_empty: reason='EMPTY_GEOMETRY'
            elif not g.is_valid: reason='INVALID_GEOMETRY'; detail=explain_validity(g)
            elif g.geom_type!='MultiLineString': reason='UNSUPPORTED_GEOMETRY'; detail=g.geom_type
        except Exception as e:
            reason='PARSE_ERROR'; detail=str(e); g=None
        if reason:
            quarantine.append({'source_index':idx,'reason':reason,'detail':detail,'properties':ft.get('properties',{}),'geometry':geom})
            continue
        b=g.bounds; bbox=[min(bbox[0],b[0]),min(bbox[1],b[1]),max(bbox[2],b[2]),max(bbox[3],b[3])]
        total_m += transform(transformer.transform,g).length
        props=dict(ft.get('properties',{})); props['_source_index']=idx
        valid.append({'type':'Feature','properties':props,'geometry':geom})

    operational={'type':'FeatureCollection','name':'urbis_logradouros_parauapebas_2025_operational','crs':source.get('crs'),'features':valid}
    op=args.out_dir/'logradouros_parauapebas_2025.operational.geojson'
    op.write_text(json.dumps(operational,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (args.out_dir/'logradouros_parauapebas_2025.quarantine.json').write_text(json.dumps({'count':len(quarantine),'records':quarantine},ensure_ascii=False,indent=2),encoding='utf-8')

    ceps_pdf=set()
    if args.ceps_csv and args.ceps_csv.exists():
        with args.ceps_csv.open(encoding='utf-8') as f:
            ceps_pdf={r['cep'] for r in csv.DictReader(f) if r.get('cep')}
    ceps_geo={ft['properties'].get('cep') for ft in valid if ft['properties'].get('cep') and ft['properties'].get('cep')!='SEM CEP'}
    metadata={
        'dataset_code':'PARAUAPEBAS_LOGRADOUROS_2025',
        'source_sha256':sha256(args.input),'operational_sha256':sha256(op),
        'source_feature_count':len(source.get('features',[])),'operational_feature_count':len(valid),
        'quarantine_feature_count':len(quarantine),'quarantine_by_reason':dict(Counter(r['reason'] for r in quarantine)),
        'bbox_crs84':bbox,'total_geometry_length_km_epsg31982':round(total_m/1000,3),
        'unique_street_names':len({f['properties'].get('nom_novo') for f in valid if f['properties'].get('nom_novo')}),
        'unique_neighborhoods':len({f['properties'].get('bairro') for f in valid if f['properties'].get('bairro')}),
        'unique_zones':len({f['properties'].get('Zona') for f in valid if f['properties'].get('Zona')}),
        'unique_valid_ceps_in_geometry':len(ceps_geo),
        'ceps_common_geometry_pdf':len(ceps_geo & ceps_pdf) if ceps_pdf else None,
        'ceps_geometry_not_in_pdf':sorted(ceps_geo-ceps_pdf) if ceps_pdf else None,
        'ceps_pdf_not_in_geometry_count':len(ceps_pdf-ceps_geo) if ceps_pdf else None,
        'note':'Registros rejeitados são preservados em quarentena; códigos de atributos são mantidos sem inferência semântica.'
    }
    (args.out_dir/'logradouros_parauapebas_2025.metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(metadata,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
