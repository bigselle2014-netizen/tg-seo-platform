-- Миграция 003: добавить article_html и seo_h1
ALTER TABLE posts ADD COLUMN IF NOT EXISTS article_html TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS article_generated_at TIMESTAMP;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_h1 VARCHAR(200);
