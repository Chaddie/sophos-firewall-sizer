-- v15: internal SE sizing (source + visibility)
ALTER TABLE sizing_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'customer';

ALTER TABLE sizing_requests
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'shared';

CREATE INDEX IF NOT EXISTS sizing_requests_source_visibility_idx
  ON sizing_requests (source, visibility);
