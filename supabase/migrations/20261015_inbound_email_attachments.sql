-- Add JSONB attachments column to fl_inbound_emails.
-- Stores [{filename, content_type, size, url}] for files uploaded to Supabase Storage.
alter table public.fl_inbound_emails
  add column if not exists attachments jsonb default null;
