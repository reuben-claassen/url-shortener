-- Migration: Initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores shortened URLs
CREATE TABLE IF NOT EXISTS urls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        VARCHAR(20) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  click_count BIGINT NOT NULL DEFAULT 0,
  created_by_ip INET NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_urls_slug ON urls(slug);
CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls(expires_at) WHERE expires_at IS NOT NULL;

-- Stores individual click events for analytics
CREATE TABLE IF NOT EXISTS click_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url_id      UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  INET NOT NULL,
  user_agent  TEXT,
  referer     TEXT,
  country     VARCHAR(100),
  browser     VARCHAR(100),
  os          VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON click_events(url_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON click_events(clicked_at);
