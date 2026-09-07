BEGIN;

INSERT INTO data_sources(code,name,kind,authority)
VALUES (
  'PARAUAPEBAS_CEPS_2025',
  'Lista de CEPs de Parauapebas — referência 2025',
  'OFFICIAL_DATASET',
  'Lista de CEPs fornecida ao projeto; documento indica geração em 26/11/2025'
)
ON CONFLICT(code) DO NOTHING;

INSERT INTO source_datasets(source_id,dataset_code,version,reference_date,sha256,metadata)
SELECT s.id,'PARAUAPEBAS_CEPS_2025','2025-11-26',DATE '2025-11-26',NULL,
       jsonb_build_object('record_count',2541,'source_reference','NOVOS CEPs DE PARAUAPEBAS.pdf')
FROM data_sources s WHERE s.code='PARAUAPEBAS_CEPS_2025'
ON CONFLICT(source_id,dataset_code,version) DO NOTHING;

CREATE TEMP TABLE _urbis_ceps_stage(
  cep text,
  street_name text,
  street_type_source text,
  neighborhood_source text,
  raw_line text,
  source_reference text,
  source_generation text
) ON COMMIT DROP;

COPY _urbis_ceps_stage
FROM '/urbis-data/ceps_parauapebas_2025.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

INSERT INTO neighborhoods(canonical_name,source_alias,source_dataset_id)
SELECT DISTINCT trim(c.neighborhood_source),trim(c.neighborhood_source),d.id
FROM _urbis_ceps_stage c
JOIN source_datasets d ON d.dataset_code='PARAUAPEBAS_CEPS_2025' AND d.version='2025-11-26'
WHERE NULLIF(trim(c.neighborhood_source),'') IS NOT NULL
ON CONFLICT(canonical_name) DO NOTHING;

INSERT INTO postal_addresses(cep,street_name,street_type,neighborhood_name_source,neighborhood_id,raw_line,source_dataset_id)
SELECT c.cep,c.street_name,c.street_type_source,c.neighborhood_source,n.id,c.raw_line,d.id
FROM _urbis_ceps_stage c
JOIN source_datasets d ON d.dataset_code='PARAUAPEBAS_CEPS_2025' AND d.version='2025-11-26'
LEFT JOIN neighborhoods n ON n.canonical_name=trim(c.neighborhood_source)
WHERE c.cep ~ '^[0-9]{5}-[0-9]{3}$'
  AND NOT EXISTS (
    SELECT 1 FROM postal_addresses p
    WHERE p.cep=c.cep AND p.raw_line=c.raw_line AND p.source_dataset_id=d.id
  );

COMMIT;
