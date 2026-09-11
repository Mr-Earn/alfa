-- Migration: create marketplace items table for Supabase
-- Run this in the Supabase SQL editor or via psql / supabase CLI

CREATE TABLE IF NOT EXISTS marketplace_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT DEFAULT 'Free',
  media_type TEXT DEFAULT 'image',
  media_url TEXT,
  seller_name TEXT,
  seller_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_created_at
  ON marketplace_items (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller_email
  ON marketplace_items (seller_email);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_title
  ON marketplace_items (title);
