BEGIN;

DO $$ BEGIN
  CREATE TYPE urbis_role AS ENUM ('CITIZEN','OPERATOR','FIELD_AGENT','MANAGER','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_account(id) ON DELETE CASCADE,
  provider text NOT NULL,
  subject text NOT NULL,
  password_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,subject),
  CHECK ((provider='LOCAL' AND password_hash IS NOT NULL) OR provider<>'LOCAL')
);
CREATE INDEX IF NOT EXISTS auth_identities_user_idx ON auth_identities(user_id);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users_account(id) ON DELETE CASCADE,
  role urbis_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users_account(id),
  PRIMARY KEY(user_id,role)
);

ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS original_filename text;
ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS byte_length bigint;
ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS hash_verified boolean NOT NULL DEFAULT false;
ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS authority_validated boolean NOT NULL DEFAULT false;
ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES users_account(id);
ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS validated_at timestamptz;
ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS storage_driver text NOT NULL DEFAULT 'LOCAL';
ALTER TABLE occurrence_media ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES users_account(id);
CREATE INDEX IF NOT EXISTS occurrence_media_sha_idx ON occurrence_media(sha256);

CREATE TABLE IF NOT EXISTS occurrence_evidence_assessments (
  id bigserial PRIMARY KEY,
  occurrence_id uuid NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  media_id uuid REFERENCES occurrence_media(id) ON DELETE CASCADE,
  algorithm_version text NOT NULL,
  score numeric(5,2) NOT NULL CHECK(score>=0 AND score<=100),
  level text NOT NULL,
  weights jsonb NOT NULL,
  factors jsonb NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  interpretation text NOT NULL DEFAULT 'engineering_confidence_indicator_not_proof_of_truth',
  assessed_by uuid REFERENCES users_account(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_assessment_occ_idx ON occurrence_evidence_assessments(occurrence_id,created_at DESC);

ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS ici_score numeric(5,2);
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS ici_level text;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS ici_algorithm text;

CREATE TABLE IF NOT EXISTS auth_audit (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users_account(id),
  event_type text NOT NULL,
  ip_hash text,
  user_agent_hash text,
  success boolean NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_audit_user_time_idx ON auth_audit(user_id,created_at DESC);

COMMENT ON TABLE occurrence_evidence_assessments IS
'ICI-URBIS: indicador interno de confiança de engenharia. Não constitui prova automática de veracidade, autoria ou autenticidade da ocorrência.';

COMMIT;
