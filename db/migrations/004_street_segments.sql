BEGIN;

CREATE TABLE IF NOT EXISTS street_segments (
  id bigserial PRIMARY KEY,
  source_fid bigint,
  source_object_id bigint,
  source_index integer NOT NULL,
  cep varchar(9),
  street_type text,
  street_name text,
  previous_name text,
  postal_name text,
  neighborhood_name text,
  postal_neighborhood_name text,
  zone_name text,
  section_code text,
  between_streets text,
  pavement_code text,
  drainage_code text,
  curb_code text,
  lighting_code text,
  water_code text,
  electric_grid_code text,
  sewer_grid_code text,
  waste_collection_code text,
  conservation_code text,
  difficult_access_code text,
  public_transport_code text,
  inspection_sector_code text,
  waste_sector_code text,
  source_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  geom geometry(MultiLineString,4326) NOT NULL,
  source_dataset_id uuid REFERENCES source_datasets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_dataset_id, source_index)
);

CREATE INDEX IF NOT EXISTS street_segments_geom_gix ON street_segments USING gist(geom);
CREATE INDEX IF NOT EXISTS street_segments_cep_idx ON street_segments(cep);
CREATE INDEX IF NOT EXISTS street_segments_name_idx ON street_segments(lower(street_name));
CREATE INDEX IF NOT EXISTS street_segments_neighborhood_idx ON street_segments(lower(neighborhood_name));
CREATE INDEX IF NOT EXISTS street_segments_zone_idx ON street_segments(lower(zone_name));

-- Consulta de suporte para localizar o logradouro mais próximo a um ponto informado pelo app.
CREATE OR REPLACE FUNCTION urbis_nearest_street(p_lon double precision, p_lat double precision, p_limit integer DEFAULT 5)
RETURNS TABLE (
  street_segment_id bigint,
  street_name text,
  cep varchar(9),
  neighborhood_name text,
  distance_m double precision
)
LANGUAGE sql STABLE AS $$
  WITH p AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326) AS g
  )
  SELECT
    s.id,
    s.street_name,
    s.cep,
    s.neighborhood_name,
    ST_Distance(s.geom::geography,p.g::geography) AS distance_m
  FROM street_segments s, p
  ORDER BY s.geom <-> p.g
  LIMIT GREATEST(1, LEAST(p_limit, 25));
$$;

COMMIT;
