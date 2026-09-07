BEGIN;
ALTER TABLE users_account ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

CREATE TABLE IF NOT EXISTS privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users_account(id),
  request_type text NOT NULL CHECK (request_type IN ('ACCESS','CORRECTION','ANONYMIZATION','DELETION','PORTABILITY')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_REVIEW','APPROVED','DENIED','COMPLETED')),
  legal_basis_notes text,
  decided_by uuid REFERENCES users_account(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS privacy_requests_user_idx ON privacy_requests(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id bigserial PRIMARY KEY,
  data_class text NOT NULL UNIQUE,
  retention_days integer,
  legal_basis text,
  disposition text NOT NULL DEFAULT 'REVIEW_REQUIRED',
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION urbis_anonymize_user(p_user uuid, p_actor uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM push_devices WHERE user_id=p_user;
  DELETE FROM auth_identities WHERE user_id=p_user;
  UPDATE users_account
     SET email=NULL,cpf_hash=NULL,display_name='Cidadão anonimizado',active=false,anonymized_at=now(),updated_at=now()
   WHERE id=p_user;
  INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_data)
  VALUES(p_actor,'USER_ANONYMIZED','users_account',p_user::text,jsonb_build_object('anonymizedAt',now()));
END $$;
COMMIT;
