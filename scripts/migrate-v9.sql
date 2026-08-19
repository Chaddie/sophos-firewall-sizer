-- v9: AM/SE review workflow, opportunity ID, customer drafts
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS opportunity_id text;
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS review_status text;
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS flagged_at timestamptz;
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS flagged_note text;
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS reviewed_by_id uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS sizing_drafts (
  request_id uuid PRIMARY KEY REFERENCES sizing_requests(id) ON DELETE CASCADE,
  draft_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
