-- v16: Sophos Switch Support and Services SKUs on switch catalog
ALTER TABLE switch_models
  ADD COLUMN IF NOT EXISTS support_sku text;

ALTER TABLE switch_models
  ADD COLUMN IF NOT EXISTS support_name text;
