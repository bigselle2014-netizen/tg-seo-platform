-- Migration: add auto_publish columns to channel_owners
-- Run: docker exec -i tg-seo-platform-postgres-1 psql -U tgseo_user -d tgseo < migrations/001_add_auto_publish.sql

ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE channel_owners ADD COLUMN IF NOT EXISTS auto_publish_delay INTEGER NOT NULL DEFAULT 30;
