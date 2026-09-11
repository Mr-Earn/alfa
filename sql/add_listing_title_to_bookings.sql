-- Migration: add listing_title column to bookings and index it
-- Run this on your Postgres DB (e.g., via psql or Supabase SQL editor)

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS listing_title text;

-- Optional: index to speed up searches by listing_title
CREATE INDEX IF NOT EXISTS idx_bookings_listing_title ON bookings (listing_title);

-- Consider adding an index on listing_id for joins/lookups
CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings (listing_id);
