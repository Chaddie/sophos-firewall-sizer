-- v6: SSO-ready users (password optional for IdP-provisioned accounts)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
