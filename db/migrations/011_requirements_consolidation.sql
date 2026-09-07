BEGIN;

DO $$ BEGIN
  CREATE TYPE urbis_priority AS ENUM ('NORMAL','MEDIUM','HIGH','CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS priority urbis_priority NOT NULL DEFAULT 'NORMAL';
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS priority_source text NOT NULL DEFAULT 'CATEGORY_DEFAULT';
CREATE UNIQUE INDEX IF NOT EXISTS users_account_cpf_hash_uidx ON users_account(cpf_hash) WHERE cpf_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL UNIQUE REFERENCES occurrences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users_account(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE citizen_scores ADD COLUMN IF NOT EXISTS base_points numeric(10,2);
ALTER TABLE citizen_scores ADD COLUMN IF NOT EXISTS bonus_points numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE citizen_scores ADD COLUMN IF NOT EXISTS policy_version text NOT NULL DEFAULT 'URBIS-SCORE-alpha.1';

CREATE TABLE IF NOT EXISTS push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_account(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ANDROID','IOS','WEB')),
  provider text NOT NULL DEFAULT 'FCM',
  token text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users_account(id),
  occurrence_id uuid REFERENCES occurrences(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES resilience_alerts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('PUSH','IN_APP','EMAIL','SSE')),
  template_code text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx ON notification_outbox(status,available_at);

CREATE TABLE IF NOT EXISTS team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users_account(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(team_id,user_id)
);

CREATE TABLE IF NOT EXISTS field_work_events (
  id bigserial PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES users_account(id),
  status text NOT NULL,
  point geometry(Point,4326),
  distance_to_occurrence_m numeric(12,3),
  geofence_m numeric(12,3),
  evidence_media_id uuid REFERENCES occurrence_media(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS field_work_events_work_idx ON field_work_events(work_order_id,created_at);
CREATE INDEX IF NOT EXISTS field_work_events_point_gix ON field_work_events USING gist(point);

CREATE TABLE IF NOT EXISTS occurrence_contract_matches (
  occurrence_id uuid NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public_contracts(id) ON DELETE CASCADE,
  match_basis text NOT NULL,
  warranty_active boolean NOT NULL,
  matched_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(occurrence_id,contract_id)
);

CREATE TABLE IF NOT EXISTS public_event_outbox (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL,
  entity_id text NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id bigserial PRIMARY KEY,
  metric_code text NOT NULL,
  metric_value numeric NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  sampled_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kpi_snapshots_metric_time_idx ON kpi_snapshots(metric_code,sampled_at DESC);

COMMIT;
