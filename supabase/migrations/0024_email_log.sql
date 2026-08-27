-- Outgoing email log: every email sent from the admin dashboard is recorded here
create table if not exists public.fl_email_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  to_email    text not null,
  to_name     text,
  subject     text not null,
  body_preview text,        -- first 300 chars of plain-text body
  status      text not null default 'sent',
  resend_id   text,         -- Resend message ID for tracking
  context     text          -- e.g. "lead:uuid", "booking:uuid", "compose"
);

-- Only admins (via service-role API routes) can write; reading is also restricted
alter table public.fl_email_log enable row level security;

-- No browser-side access — all reads/writes go through admin API routes using service role
-- (service-role bypasses RLS, so no policy needed for server writes)
create policy "no_browser_access" on public.fl_email_log
  as restrictive
  for all
  using (false);

-- Index for fast date-ordered listing in the admin Sent tab
create index if not exists fl_email_log_created_at_idx on public.fl_email_log (created_at desc);
