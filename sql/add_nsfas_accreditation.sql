-- Add evidence-backed NSFAS accreditation metadata to accommodation listings.
-- Listings remain unverified until university staff review an authoritative source.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS nsfas_accreditation_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS nsfas_accreditation_source text,
  ADD COLUMN IF NOT EXISTS nsfas_accredited_until date,
  ADD COLUMN IF NOT EXISTS nsfas_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS nsfas_verified_by text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listings_nsfas_accreditation_status_check'
      AND conrelid = 'public.listings'::regclass
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_nsfas_accreditation_status_check
      CHECK (nsfas_accreditation_status IN ('unverified', 'verified', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listings_nsfas_accreditation
  ON public.listings (nsfas_accreditation_status, nsfas_accredited_until);
