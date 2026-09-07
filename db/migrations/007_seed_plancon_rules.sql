BEGIN;

INSERT INTO data_sources(code,name,kind,authority)
VALUES ('PLANCON_PARAUAPEBAS_2023','PLANCON Parauapebas v2/2023','OFFICIAL_DATASET','Prefeitura Municipal de Parauapebas / COMPDEC')
ON CONFLICT(code) DO NOTHING;

INSERT INTO source_datasets(source_id,dataset_code,version,reference_date,sha256,metadata)
SELECT s.id,'PLANCON_PARAUAPEBAS','2-2023',DATE '2023-01-01',NULL,
       jsonb_build_object('status','documentary_baseline','source','Plano de Contingência Municipal para Desastres Naturais e Tecnológicos — Versão 2 — 2023')
FROM data_sources s WHERE s.code='PLANCON_PARAUAPEBAS_2023'
ON CONFLICT(source_id,dataset_code,version) DO NOTHING;

INSERT INTO resilience_rulesets(code,version,valid_from,source_dataset_id,rules,active)
SELECT 'PLANCON_PARAUAPEBAS','2-2023',DATE '2023-01-01',d.id,
       pg_read_file('/urbis-plancon/rules-plancon-v2-2023.json')::jsonb,
       true
FROM source_datasets d
WHERE d.dataset_code='PLANCON_PARAUAPEBAS' AND d.version='2-2023'
ON CONFLICT(code,version) DO UPDATE SET rules=excluded.rules, source_dataset_id=excluded.source_dataset_id;

COMMIT;
