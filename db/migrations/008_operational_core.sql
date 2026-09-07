BEGIN;

ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS client_request_id text;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS street_segment_id bigint REFERENCES street_segments(id);
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS territory_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS duplicate_suspected boolean NOT NULL DEFAULT false;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES occurrences(id);
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS triage_notes text;

CREATE UNIQUE INDEX IF NOT EXISTS occurrences_client_request_uidx
  ON occurrences(client_request_id) WHERE client_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS occurrences_street_segment_idx ON occurrences(street_segment_id);
CREATE INDEX IF NOT EXISTS occurrences_duplicate_of_idx ON occurrences(duplicate_of);

CREATE SEQUENCE IF NOT EXISTS urbis_protocol_seq START WITH 1 INCREMENT BY 1;
CREATE OR REPLACE FUNCTION urbis_next_protocol()
RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT 'URB-' || to_char(current_date,'YYYYMMDD') || '-' || lpad(nextval('urbis_protocol_seq')::text,7,'0');
$$;

CREATE TABLE IF NOT EXISTS occurrence_duplicate_candidates (
  occurrence_id uuid NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  candidate_occurrence_id uuid NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  distance_m numeric(10,3) NOT NULL,
  delta_seconds integer NOT NULL,
  score numeric(6,5) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(occurrence_id,candidate_occurrence_id),
  CHECK(occurrence_id <> candidate_occurrence_id)
);
CREATE INDEX IF NOT EXISTS occurrence_duplicate_candidate_reverse_idx
  ON occurrence_duplicate_candidates(candidate_occurrence_id,created_at DESC);

CREATE TABLE IF NOT EXISTS dispatch_rules (
  category_code text PRIMARY KEY REFERENCES categories(code),
  responsible_org_code text NOT NULL,
  sla_minutes integer NOT NULL CHECK(sla_minutes > 0),
  routing_mode text NOT NULL DEFAULT 'ROLE_TARGET',
  provisional boolean NOT NULL DEFAULT true,
  source_note text,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS realtime_outbox (
  id bigserial PRIMARY KEY,
  topic text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS realtime_outbox_pending_idx
  ON realtime_outbox(created_at) WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS integration_targets (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  target_type text NOT NULL DEFAULT 'ROLE',
  endpoint text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
