-- ============================================================================
-- 0003_booking.sql — real calendar booking (appointments) schema
-- ----------------------------------------------------------------------------
-- Backs the live booking flow in the consultation modal. One `appointments`
-- row is created per confirmed slot; the CRM-friendly `ferguson_leads` row is
-- still written alongside it by the API (source = 'booking').
--
-- SECURITY MODEL (PII-protective availability):
--   anon may INSERT an appointment (so a visitor can book without auth) but is
--   NOT granted SELECT on the table — that would expose every booker's name,
--   email and phone to the public anon key. Instead, the UI greys out taken
--   times via the SECURITY DEFINER function `public.taken_slots(from, to)`,
--   which returns ONLY the `starts_at` timestamps of non-cancelled
--   appointments in a window — no PII. The privileged API route (service-role
--   key) does the authoritative double-booking re-check and the insert.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_ref    text,
  name        text,
  email       text,
  phone       text,
  service     text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      text not null default 'pending'
                check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  ref         text unique,
  meta        jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists appointments_starts_at_idx
  on public.appointments (starts_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.appointments enable row level security;

-- anon may CREATE an appointment. We do NOT constrain status here; the API
-- always inserts 'pending', and even a hand-crafted status is harmless because
-- the firm reviews/confirms every booking out-of-band.
drop policy if exists "anon insert appointments" on public.appointments;
create policy "anon insert appointments"
  on public.appointments for insert to anon, authenticated
  with check (true);

-- NOTE: intentionally NO anon SELECT policy — protects booker PII. Reads for
-- the back office go through the service-role key (bypasses RLS).

-- ---------------------------------------------------------------------------
-- Public availability function (PII-free)
-- ----------------------------------------------------------------------------
-- Returns the start times of all non-cancelled appointments in [p_from, p_to).
-- SECURITY DEFINER so it can read the RLS-protected table, but it exposes only
-- the timestamp column — never name / email / phone. The browser calls this to
-- disable already-booked slots in the grid.
-- ---------------------------------------------------------------------------
create or replace function public.taken_slots(p_from timestamptz, p_to timestamptz)
returns setof timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select starts_at
  from public.appointments
  where status <> 'cancelled'
    and starts_at >= p_from
    and starts_at < p_to;
$$;

revoke all on function public.taken_slots(timestamptz, timestamptz) from public;
grant execute on function public.taken_slots(timestamptz, timestamptz) to anon, authenticated;
