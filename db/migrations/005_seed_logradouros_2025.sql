BEGIN;

-- Fonte vetorial fornecida ao projeto. A autoridade emissora não é inferida do nome do arquivo.
INSERT INTO data_sources(code,name,kind,authority)
VALUES (
  'PARAUAPEBAS_LOGRADOUROS_2025',
  'Camada vetorial de logradouros de Parauapebas 2025',
  'INTEGRATION',
  'Autoridade emissora não identificada no arquivo; fonte fornecida ao projeto URBIS'
)
ON CONFLICT(code) DO NOTHING;

INSERT INTO source_datasets(source_id,dataset_code,version,reference_date,sha256,metadata)
SELECT s.id,
       'PARAUAPEBAS_LOGRADOUROS_2025',
       '2025-source-provided',
       NULL,
       '3427a3a68619e2be3ca43ff279304f9776b413ce0c1135dce77a237f5618f05b',
       jsonb_build_object(
         'source_file','Logradouros 2025 2.geojson',
         'source_layer','ruas_cep_wgs',
         'crs','CRS84/WGS84',
         'verification_status','source_provided_authority_not_identified',
         'source_feature_count',11079,
         'operational_feature_count',10997,
         'quarantine_count',82
       )
FROM data_sources s WHERE s.code='PARAUAPEBAS_LOGRADOUROS_2025'
ON CONFLICT(source_id,dataset_code,version) DO NOTHING;

WITH ds AS (
  SELECT d.id
  FROM source_datasets d
  JOIN data_sources s ON s.id=d.source_id
  WHERE s.code='PARAUAPEBAS_LOGRADOUROS_2025'
    AND d.dataset_code='PARAUAPEBAS_LOGRADOUROS_2025'
    AND d.version='2025-source-provided'
), raw AS (
  SELECT pg_read_file('/urbis-data/logradouros_parauapebas_2025.operational.geojson')::jsonb AS doc
), features AS (
  SELECT value AS f
  FROM raw, jsonb_array_elements(doc->'features')
)
INSERT INTO street_segments(
  source_fid,source_object_id,source_index,cep,street_type,street_name,previous_name,postal_name,
  neighborhood_name,postal_neighborhood_name,zone_name,section_code,between_streets,pavement_code,
  drainage_code,curb_code,lighting_code,water_code,electric_grid_code,sewer_grid_code,waste_collection_code,
  conservation_code,difficult_access_code,public_transport_code,inspection_sector_code,waste_sector_code,
  source_properties,geom,source_dataset_id
)
SELECT
  CASE WHEN (f->'properties'->>'fid') ~ '^[0-9]+$' THEN (f->'properties'->>'fid')::bigint END,
  CASE WHEN (f->'properties'->>'id') ~ '^[0-9]+$' THEN (f->'properties'->>'id')::bigint END,
  (f->'properties'->>'_source_index')::integer,
  NULLIF(f->'properties'->>'cep',''),
  NULLIF(f->'properties'->>'nm_tip',''),
  NULLIF(f->'properties'->>'nom_novo',''),
  NULLIF(f->'properties'->>'nom_antig',''),
  NULLIF(f->'properties'->>'nm_pos_log',''),
  NULLIF(f->'properties'->>'bairro',''),
  NULLIF(f->'properties'->>'b_correio',''),
  NULLIF(f->'properties'->>'Zona',''),
  NULLIF(f->'properties'->>'secao',''),
  NULLIF(f->'properties'->>'entre_ruas',''),
  NULLIF(f->'properties'->>'pavimentac',''),
  NULLIF(f->'properties'->>'drenagem',''),
  NULLIF(f->'properties'->>'meio_fio',''),
  NULLIF(f->'properties'->>'iluminacao',''),
  NULLIF(f->'properties'->>'agua',''),
  NULLIF(f->'properties'->>'rede_energ',''),
  NULLIF(f->'properties'->>'rede_esgot',''),
  NULLIF(f->'properties'->>'coleta_lix',''),
  NULLIF(f->'properties'->>'conservaca',''),
  NULLIF(f->'properties'->>'dificil_ac',''),
  NULLIF(f->'properties'->>'transporte',''),
  NULLIF(f->'properties'->>'setor_fisc',''),
  NULLIF(f->'properties'->>'setor_cole',''),
  f->'properties',
  ST_SetSRID(ST_GeomFromGeoJSON((f->'geometry')::text),4326),
  ds.id
FROM features CROSS JOIN ds
ON CONFLICT(source_dataset_id,source_index) DO NOTHING;

COMMIT;
