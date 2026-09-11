-- Insert test listing for /rent page verification
-- Run this in Supabase SQL Editor to create test data

INSERT INTO listings (
  address,
  title,
  bedroom,
  price,
  createdBy
) VALUES (
  '123 Test Street, University City',
  'Test 2BR Apartment - DO NOT BOOK',
  2,
  500,
  'owner@demo.local'
);

-- Verify insertion
SELECT id, title, bedroom, price, createdBy FROM listings ORDER BY id DESC LIMIT 5;
