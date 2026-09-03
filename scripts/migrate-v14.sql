-- v14: aligned Sales Engineer on sizing requests
ALTER TABLE sizing_requests
  ADD COLUMN IF NOT EXISTS aligned_se_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS sizing_requests_aligned_se_id_idx
  ON sizing_requests (aligned_se_id);
