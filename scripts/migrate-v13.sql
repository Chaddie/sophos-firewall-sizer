-- v13: submission version history + catalog audit trail
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS submission_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES sizing_requests(id) ON DELETE CASCADE,
  version integer NOT NULL,
  answers jsonb NOT NULL,
  recommendation jsonb NOT NULL,
  source text NOT NULL,
  created_by_id uuid REFERENCES users(id),
  submitted_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submission_versions_request_id_idx
  ON submission_versions (request_id, version DESC);

CREATE TABLE IF NOT EXISTS catalog_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  summary text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_audit_log_created_at_idx
  ON catalog_audit_log (created_at DESC);
