ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS seo_audit_text TEXT;
ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS seo_audited_at TIMESTAMP;
