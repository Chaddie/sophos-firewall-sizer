-- v11: soft-archive submitted sizing requests (admin only)
ALTER TABLE sizing_requests
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS sizing_requests_archived_at_idx
  ON sizing_requests (archived_at);
