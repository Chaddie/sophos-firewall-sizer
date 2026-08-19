-- v7: partner role + magic-link sessions
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';

ALTER TABLE users ADD COLUMN IF NOT EXISTS sponsored_by_id uuid;

CREATE TABLE IF NOT EXISTS partner_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  token_hash text NOT NULL UNIQUE,
  sponsored_by_id uuid REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_magic_links_email_idx
  ON partner_magic_links (email);