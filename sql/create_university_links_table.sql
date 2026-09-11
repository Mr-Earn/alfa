-- Link requests between students/owners and universities.
CREATE TABLE IF NOT EXISTS public.university_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id text NOT NULL,
  requester_email text NOT NULL,
  requester_role text NOT NULL CHECK (requester_role IN ('student', 'owner')),
  university_id text,
  university_email text NOT NULL,
  university_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_university_links_university ON public.university_links (university_email, status);
CREATE INDEX IF NOT EXISTS idx_university_links_requester ON public.university_links (requester_email, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_university_links_pending_unique
  ON public.university_links (requester_email, university_email)
  WHERE status = 'pending';
