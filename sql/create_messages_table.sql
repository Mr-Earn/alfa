-- Migration: create messages table for Supabase
-- Run this in Supabase SQL editor or via psql / supabase CLI

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT PRIMARY KEY,
  sender TEXT,
  sender_name TEXT,
  recipient TEXT,
  recipient_name TEXT,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes to support fast lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages (recipient);

-- Optional: limit access via RLS or policies if needed

