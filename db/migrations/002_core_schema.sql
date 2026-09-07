BEGIN;

CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  kind source_kind NOT NULL,
  authority text,
  url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES data_sources(id),
  dataset_code text NOT NULL,
  version text NOT NULL,
  reference_date date,
  sha256 text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, dataset_code, version)
);

CREATE TABLE IF NOT EXISTS users_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_subject text UNIQUE,
  email text,
  cpf_hash text,
  display_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  parent_code text,
  public_enabled boolean NOT NULL DEFAULT true,
  default_urgency urgency_level NOT NULL DEFAULT 'NORMAL',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS neighborhoods (
  id bigserial PRIMARY KEY,
  canonical_name text NOT NULL UNIQUE,
  source_alias text,
  geom geometry(MultiPolygon,4326),
  source_dataset_id uuid REFERENCES source_datasets(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS neighborhoods_geom_gix ON neighborhoods USING gist (geom);

CREATE TABLE IF NOT EXISTS postal_addresses (
  id bigserial PRIMARY KEY,
  cep varchar(9) NOT NULL,
  street_name text NOT NULL,
  street_type text,
  neighborhood_name_source text NOT NULL,
  neighborhood_id bigint REFERENCES neighborhoods(id),
  raw_line text NOT NULL,
  source_dataset_id uuid REFERENCES source_datasets(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS postal_addresses_cep_idx ON postal_addresses(cep);
CREATE INDEX IF NOT EXISTS postal_addresses_neighborhood_idx ON postal_addresses(neighborhood_name_source);

CREATE TABLE IF NOT EXISTS occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol text NOT NULL UNIQUE,
  reporter_user_id uuid REFERENCES users_account(id),
  category_id uuid NOT NULL REFERENCES categories(id),
  status occurrence_status NOT NULL DEFAULT 'OPEN',
  urgency urgency_level NOT NULL DEFAULT 'NORMAL',
  description text,
  point geometry(Point,4326) NOT NULL,
  gps_accuracy_m numeric(10,3),
  address_text text,
  cep varchar(9),
  neighborhood_id bigint REFERENCES neighborhoods(id),
  source_id uuid REFERENCES data_sources(id),
  evidence_state evidence_status NOT NULL DEFAULT 'RECEIVED',
  created_at timestamptz NOT NULL DEFAULT now(),
  triaged_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS occurrences_point_gix ON occurrences USING gist (point);
CREATE INDEX IF NOT EXISTS occurrences_status_idx ON occurrences(status);
CREATE INDEX IF NOT EXISTS occurrences_category_idx ON occurrences(category_id);
CREATE INDEX IF NOT EXISTS occurrences_created_idx ON occurrences(created_at DESC);

CREATE TABLE IF NOT EXISTS occurrence_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  media_type text NOT NULL,
  sha256 text NOT NULL,
  captured_at timestamptz,
  point geometry(Point,4326),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS occurrence_events (
  id bigserial PRIMARY KEY,
  occurrence_id uuid NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status occurrence_status,
  to_status occurrence_status,
  actor_user_id uuid REFERENCES users_account(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS occurrence_events_occ_idx ON occurrence_events(occurrence_id, created_at);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  organization_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES occurrences(id),
  team_id uuid REFERENCES teams(id),
  responsible_org_code text,
  status text NOT NULL DEFAULT 'CREATED',
  sla_due_at timestamptz,
  dispatched_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_orders_occ_idx ON work_orders(occurrence_id);

CREATE TABLE IF NOT EXISTS public_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  contractor_name text,
  object text,
  start_date date,
  accepted_at date,
  warranty_until date,
  geom geometry(Geometry,4326),
  source_dataset_id uuid REFERENCES source_datasets(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(contract_number)
);
CREATE INDEX IF NOT EXISTS public_contracts_geom_gix ON public_contracts USING gist(geom);

CREATE TABLE IF NOT EXISTS resilience_rulesets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  version text NOT NULL,
  valid_from date,
  valid_to date,
  source_dataset_id uuid REFERENCES source_datasets(id),
  rules jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code,version)
);

CREATE TABLE IF NOT EXISTS sensor_observations (
  id bigserial PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES data_sources(id),
  sensor_code text NOT NULL,
  metric_code text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  point geometry(Point,4326),
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  quality jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS sensor_observations_metric_time_idx ON sensor_observations(metric_code, observed_at DESC);
CREATE INDEX IF NOT EXISTS sensor_observations_point_gix ON sensor_observations USING gist(point);

CREATE TABLE IF NOT EXISTS resilience_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_id uuid REFERENCES resilience_rulesets(id),
  severity text NOT NULL,
  alert_color text NOT NULL,
  hazard_code text NOT NULL,
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  area geometry(Geometry,4326),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  authority_validation_required boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS resilience_alerts_area_gix ON resilience_alerts USING gist(area);

CREATE TABLE IF NOT EXISTS citizen_scores (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users_account(id),
  occurrence_id uuid NOT NULL REFERENCES occurrences(id),
  points numeric(10,2) NOT NULL,
  reason text NOT NULL,
  validated_by uuid REFERENCES users_account(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, occurrence_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users_account(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id, created_at DESC);

COMMIT;
