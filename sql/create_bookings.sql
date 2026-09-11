-- Bookings table for student accommodation
-- Run this in your Supabase SQL editor

create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid references auth.users(id),
  contact_email text,
  move_in_date date,
  message text,
  room_gender_preference text,
  assigned_gender text,
  assigned_university text,
  assigned_accommodation text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table if exists public.bookings
  add column if not exists assigned_university text,
  add column if not exists assigned_accommodation text;

create index if not exists idx_bookings_listing_id on bookings(listing_id);
create index if not exists idx_bookings_user_id on bookings(user_id);
