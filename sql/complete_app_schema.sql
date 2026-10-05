-- Complete application schema for the Alfa Housing app
-- Safe to run multiple times with IF NOT EXISTS and ALTER TABLE ... ADD COLUMN IF NOT EXISTS

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

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_university ON public.profiles (university);

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
CREATE INDEX IF NOT EXISTS idx_listings_type_active ON public.listings (type, active);
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings (city);

CREATE TABLE IF NOT EXISTS public.listingImages (
  id bigserial PRIMARY KEY,
  listing_id text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listingImages (listing_id);

CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY,
  listing_id text NOT NULL,
  user_id text,
  contact_email text,
  listing_title text,
  move_in_date date,
  message text,
  note text,
  room_gender_preference text,
  assigned_gender text,
  assigned_university text,
  assigned_accommodation text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON public.bookings (listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_contact_email ON public.bookings (contact_email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);

ALTER TABLE IF EXISTS public.bookings
  ADD COLUMN IF NOT EXISTS listing_title text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS assigned_university text,
  ADD COLUMN IF NOT EXISTS assigned_accommodation text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.messages (
  id bigserial PRIMARY KEY,
  sender text,
  sender_name text,
  recipient text,
  recipient_name text,
  body text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages (recipient);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id bigserial PRIMARY KEY,
  listing_id text,
  sender_id text,
  sender_email text,
  sender_role text,
  receiver_id text,
  receiver_email text,
  receiver_role text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_listing_id ON public.chat_messages (listing_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_email ON public.chat_messages (sender_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_email ON public.chat_messages (receiver_email);

CREATE TABLE IF NOT EXISTS public.lease_requests (
  id bigserial PRIMARY KEY,
  listing_id text NOT NULL,
  listing_title text,
  student_id text,
  student_email text,
  owner_email text,
  status text DEFAULT 'requested',
  note text,
  application_document_url text,
  lease_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_requests_listing_id ON public.lease_requests (listing_id);
CREATE INDEX IF NOT EXISTS idx_lease_requests_student_email ON public.lease_requests (student_email);
CREATE INDEX IF NOT EXISTS idx_lease_requests_owner_email ON public.lease_requests (owner_email);
CREATE INDEX IF NOT EXISTS idx_lease_requests_status ON public.lease_requests (status);

CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  price text DEFAULT 'Free',
  media_type text DEFAULT 'image',
  media_url text,
  seller_name text,
  seller_email text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_created_at ON public.marketplace_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller_email ON public.marketplace_items (seller_email);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_title ON public.marketplace_items (title);

CREATE TABLE IF NOT EXISTS public.student_hub_maintenance_requests (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'Open',
  owner text DEFAULT 'Student Support',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_hub_waiting_list (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  course text NOT NULL,
  budget text DEFAULT 'R6,500',
  queue integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_hub_visitors (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  purpose text NOT NULL,
  status text DEFAULT 'Pending',
  overnight boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_hub_inspections (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  date text NOT NULL,
  status text DEFAULT 'Scheduled',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_hub_events (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  date text NOT NULL,
  attendees integer DEFAULT 18,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_hub_attendance (
  id bigserial PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES public.student_hub_events(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  status text NOT NULL DEFAULT 'Registered',
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.student_hub_agreements (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  party text DEFAULT 'Student & Owner',
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_hub_accreditations (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_hub_communications (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  type text DEFAULT 'Announcement',
  detail text DEFAULT '',
  priority text DEFAULT 'Normal',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.student_hub_communications
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS detail text,
  ADD COLUMN IF NOT EXISTS priority text;

-- Optional: enable Row Level Security for production usage
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- Optional example policies for authenticated users
-- CREATE POLICY "Users can read profiles" ON public.profiles FOR SELECT USING (true);
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);
