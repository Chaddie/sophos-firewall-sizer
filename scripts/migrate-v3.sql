-- Catalog admin expansion migration
-- Run against your Postgres database before deploying.
-- After running this, populate the new tables with:
--   npm run db:seed-catalog
-- (safe to re-run; it upserts by model id and won't touch models you've
-- already edited via the admin page unless you re-seed intentionally)

CREATE TABLE IF NOT EXISTS firewall_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  sku text,
  license_sku text,
  environment text[] NOT NULL,
  form_factor text,
  threat_protection_mbps integer NOT NULL,
  xstream_ssl_mbps integer NOT NULL,
  ipsec_vpn_mbps integer NOT NULL,
  max_ipsec_tunnels integer NOT NULL,
  max_ssl_vpn_tunnels integer NOT NULL,
  max_concurrent_connections integer NOT NULL,
  min_users integer NOT NULL,
  max_users integer NOT NULL,
  vcpu integer,
  ram_gb integer,
  aws_instance text,
  azure_vm_size text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS switch_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  sku text NOT NULL,
  series integer NOT NULL,
  port_count integer NOT NULL,
  ports_1gbe integer NOT NULL,
  ports_2_5gbe integer NOT NULL,
  ports_10gbe integer NOT NULL,
  sfp_plus_uplink_count integer NOT NULL,
  poe_supported boolean NOT NULL,
  poe_budget_watts integer NOT NULL,
  supports_bt_poe boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
