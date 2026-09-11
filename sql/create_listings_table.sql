-- Create listings table
-- Run in Supabase SQL editor or via psql / supabase CLI

CREATE TABLE IF NOT EXISTS public.listings (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  createdBy text,
  bedroom integer DEFAULT 1,
  bathroom integer,
  price numeric DEFAULT 0,
  address text,
  city text,
  country text,
  propertyType text,
  type text DEFAULT 'Rent',
  active boolean DEFAULT true,
  status text DEFAULT 'published',
  coordinates jsonb,
  area numeric,
  builtIn numeric,
  parking integer,
  lotSize numeric,
  hoa numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_createdBy ON public.listings (createdBy);
CREATE INDEX IF NOT EXISTS idx_listings_bedroom ON public.listings (bedroom);
CREATE INDEX IF NOT EXISTS idx_listings_type_active ON public.listings (type, active);
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings (city);
