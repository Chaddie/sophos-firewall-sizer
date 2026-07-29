-- Multi-site sizing expansion migration
-- Run against your Postgres database before deploying.

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('account_manager', 'sales_engineer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'account_manager';

UPDATE sizing_requests SET label = slug WHERE label IS NULL;

ALTER TABLE sizing_requests
  ALTER COLUMN label SET NOT NULL;
