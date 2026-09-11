alter table if exists public.lease_requests
  add column if not exists application_document_url text;