-- Firewall accessories migration
-- Run against your Postgres database before deploying.
-- Adds optional redundant PSU SKU fields on firewall_models and a new
-- accessory_models table for global SFP+ SR/LR transceiver SKUs.

ALTER TABLE firewall_models ADD COLUMN IF NOT EXISTS redundant_psu_sku text;
ALTER TABLE firewall_models ADD COLUMN IF NOT EXISTS redundant_psu_name text;

CREATE TABLE IF NOT EXISTS accessory_models (
  id text PRIMARY KEY,
  type text NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
