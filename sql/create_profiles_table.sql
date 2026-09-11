-- Create profiles table for user account information
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text UNIQUE,
  role text DEFAULT 'student',
  full_name text,
  phone text,
  phone_number text,
  avatar_url text,
  bio text,
  gender text,
  date_of_birth date,
  nationality text,
  university text,
  course text,
  year text,
  program text,
  major text,
  preferred_move_in_date text,
  roommate_preferences jsonb default '{}'::jsonb,
  additional_info text,
  notes text,
  company text,
  company_name text,
  address text,
  bank_details text,
  agency text,
  license_number text,
  institution_name text,
  contact_person text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_university ON public.profiles (university);

-- Enable RLS if needed for production
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Example policies (uncomment and adjust as needed)
-- CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT USING (true);
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);
