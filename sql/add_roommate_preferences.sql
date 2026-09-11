alter table if exists public.profiles
  add column if not exists roommate_preferences jsonb default '{}'::jsonb;

comment on column public.profiles.roommate_preferences is 'Student preferences used for roommate compatibility matching';