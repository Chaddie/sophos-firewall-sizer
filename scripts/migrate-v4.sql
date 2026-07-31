-- Contact-at-link-creation migration
-- Run against your Postgres database before deploying.
-- Adds nullable contact_name/contact_email columns to sizing_requests so
-- account managers can supply the intended recipient when creating a link.
-- Existing rows keep NULL values and remain ungated by the customer email
-- verification step.

ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE sizing_requests ADD COLUMN IF NOT EXISTS contact_email text;
