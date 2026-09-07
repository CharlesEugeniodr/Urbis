#!/usr/bin/env python3
"""Importador PostGIS do dataset operacional de logradouros.

Requer psycopg (pip install 'psycopg[binary]'). O script usa transação única, cria/resolve
source_dataset e preserva todas as propriedades originais em JSONB.
"""
from __future__ import annotations
import argparse, json, os
from pathlib import Path

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--geojson',type=Path,default=Path('data/territorial/logradouros_parauapebas_2025.operational.geojson'))
    ap.add_argument('--metadata',type=Path,default=Path('data/territorial/logradouros_parauapebas_2025.metadata.json'))
    ap.add_argument('--database-url',default=os.getenv('DATABASE_URL'))
    args=ap.parse_args()
    if not args.database_url: raise SystemExit('DATABASE_URL não definida.')
    try: import psycopg
    except Exception as e: raise SystemExit("Instale psycopg: pip install 'psycopg[binary]'\n"+str(e))
    data=json.loads(args.geojson.read_text(encoding='utf-8'))
    meta=json.loads(args.metadata.read_text(encoding='utf-8'))
    features=data['features']
    with psycopg.connect(args.database_url) as con:
        with con.cursor() as cur:
            cur.execute("""
              INSERT INTO data_sources(code,name,kind,authority)
              VALUES ('PARAUAPEBAS_LOGRADOUROS_2025','Camada vetorial de logradouros de Parauapebas 2025','INTEGRATION','Autoridade emissora não identificada no arquivo; fonte fornecida ao projeto URBIS')
              ON CONFLICT(code) DO UPDATE SET active=true
              RETURNING id
            """)
            source_id=cur.fetchone()[0]
            cur.execute("""
              INSERT INTO source_datasets(source_id,dataset_code,version,reference_date,sha256,metadata)
              VALUES (%s,'PARAUAPEBAS_LOGRADOUROS_2025','2025',NULL,%s,%s::jsonb)
              ON CONFLICT(source_id,dataset_code,version) DO UPDATE SET sha256=excluded.sha256, metadata=excluded.metadata
              RETURNING id
            """,(source_id,meta['source_sha256'],json.dumps(meta,ensure_ascii=False)))
            dataset_id=cur.fetchone()[0]
            sql="""
              INSERT INTO street_segments(
                source_fid,source_object_id,source_index,cep,street_type,street_name,previous_name,postal_name,
                neighborhood_name,postal_neighborhood_name,zone_name,section_code,between_streets,pavement_code,
                drainage_code,curb_code,lighting_code,water_code,electric_grid_code,sewer_grid_code,waste_collection_code,
                conservation_code,difficult_access_code,public_transport_code,inspection_sector_code,waste_sector_code,
                source_properties,geom,source_dataset_id)
              VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,
                      ST_SetSRID(ST_GeomFromGeoJSON(%s),4326),%s)
              ON CONFLICT(source_dataset_id,source_index) DO UPDATE SET
                cep=excluded.cep,street_name=excluded.street_name,neighborhood_name=excluded.neighborhood_name,
                source_properties=excluded.source_properties,geom=excluded.geom
            """
            batch=[]
            for ft in features:
                p=ft['properties']; g=json.dumps(ft['geometry'],separators=(',',':'))
                def s(k):
                    v=p.get(k); return None if v is None else str(v)
                batch.append((p.get('fid'),p.get('id'),p['_source_index'],s('cep'),s('nm_tip'),s('nom_novo'),s('nom_antig'),s('nm_pos_log'),
                              s('bairro'),s('b_correio'),s('Zona'),s('secao'),s('entre_ruas'),s('pavimentac'),s('drenagem'),s('meio_fio'),
                              s('iluminacao'),s('agua'),s('rede_energ'),s('rede_esgot'),s('coleta_lix'),s('conservaca'),s('dificil_ac'),s('transporte'),
                              s('setor_fisc'),s('setor_cole'),json.dumps(p,ensure_ascii=False),g,dataset_id))
                if len(batch)>=500:
                    cur.executemany(sql,batch); batch=[]
            if batch: cur.executemany(sql,batch)
        con.commit()
    print(f'OK: {len(features)} segmentos importados/atualizados em street_segments.')
if __name__=='__main__': main()
