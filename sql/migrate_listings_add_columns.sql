-- Migration: Add missing columns to existing listings table
-- Run this in Supabase SQL editor if the table already exists

-- Add missing columns if they don't exist
ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS propertyType text;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'Rent';

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS coordinates jsonb;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS bathroom integer;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS area numeric;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS builtIn numeric;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS parking integer;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS lotSize numeric;

ALTER TABLE IF EXISTS public.listings 
ADD COLUMN IF NOT EXISTS hoa numeric;

-- Create listingImages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.listingImages (
  id bigserial PRIMARY KEY,
  listing_id text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_listings_type_active ON public.listings (type, active);
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings (city);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listingImages (listing_id);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'listings' AND table_schema = 'public'
ORDER BY ordinal_position;
