-- ============================================================================
-- 0006_payments_invites.sql — pay-before-booking + free-invite-link bypass
-- ----------------------------------------------------------------------------
-- WHAT THIS ADDS
--   The booking flow now charges a consultation fee before an appointment is
--   confirmed (WiPay hosted checkout — sandbox/mock until the merchant account
--   is approved, then live by env vars only). TWO escape hatches exist:
--     1. A valid free-invite code (?invite=CODE) skips payment entirely.
--     2. Anything else goes down the pay path: appointment is 'pending' until
--        the gateway returns 'paid'.
--
--   New surface:
--     • appointments.payment_status — tracks unpaid → pending → paid / free.
--     • payments               — one row per checkout attempt (audit trail).
--     • booking_invites        — complimentary-consultation codes.
--     • fl_check_invite / fl_consume_invite — anon-callable invite plumbing.
--     • fl_admin_create_invite / fl_admin_list_invites — token-gated admin CRUD.
--
-- SECURITY MODEL (mirrors 0003 / 0005):
--   `payments` has NO anon policies — it is written only by the privileged API
--   route (service-role key) or by SECURITY DEFINER functions, never directly
--   from the browser. `booking_invites` likewise has no anon CRUD policy; all
--   anon access is funnelled through the SECURITY DEFINER functions below, each
--   of which exposes only what the flow needs (a yes/no validity check, an
--   atomic consume, or — for admin functions — a token gate first).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- appointments.payment_status — the money state of a booking.
--   unpaid  : default for any legacy / unknown row
--   pending : pay path started, awaiting gateway return
--   paid    : gateway confirmed payment
--   free    : booked via a valid invite code (no charge)
-- ---------------------------------------------------------------------------
alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'free'));

-- ---------------------------------------------------------------------------
-- payments — one row per checkout attempt. Authoritative money audit trail.
--   order_id is our booking ref (also what we hand the gateway), so the return
--   handler can look the row up by it. amount is in `currency` minor-unit-free
--   (whole JMD). provider_txn is the gateway's transaction id once paid.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  order_id        text unique,
  appointment_ref text,
  amount          numeric,
  currency        text not null default 'JMD',
  provider        text not null default 'wipay',
  provider_txn    text,
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed', 'free')),
  meta            jsonb not null default '{}'::jsonb
);

create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_appt_ref_idx on public.payments (appointment_ref);

-- RLS on, NO anon policies — server/RPC only (see security note above).
alter table public.payments enable row level security;

-- ---------------------------------------------------------------------------
-- booking_invites — complimentary-consultation codes.
--   code     : the share token (?invite=CODE) — primary key, case-sensitive.
--   max_uses : how many free bookings this code grants (default 1).
--   used_count: incremented atomically on each successful free booking.
--   expires_at: optional hard cutoff (NULL = never expires).
--   active   : a kill switch independent of uses/expiry.
-- ---------------------------------------------------------------------------
create table if not exists public.booking_invites (
  code        text primary key,
  label       text,
  max_uses    int not null default 1,
  used_count  int not null default 0,
  expires_at  timestamptz,
  active       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- RLS on, NO anon CRUD policy — all anon access goes through the functions.
alter table public.booking_invites enable row level security;

-- ---------------------------------------------------------------------------
-- fl_check_invite — read-only validity probe for the booking modal.
--   Returns a single row: (valid, label). valid = the code exists, is active,
--   has not expired, and still has uses left. NEVER mutates — the modal calls
--   this on page load to decide whether to show the "complimentary" note.
-- ---------------------------------------------------------------------------
create or replace function public.fl_check_invite(p_code text)
returns table (valid boolean, label text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec public.booking_invites%rowtype;
begin
  select * into rec from public.booking_invites where code = p_code;

  if rec.code is null then
    return query select false, null::text;
    return;
  end if;

  return query
    select
      (
        rec.active
        and (rec.expires_at is null or rec.expires_at > now())
        and rec.used_count < rec.max_uses
      ),
      rec.label;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_consume_invite — atomically claim one use of an invite.
--   Returns true and increments used_count IFF the code is currently valid;
--   otherwise returns false and changes nothing. The WHERE clause does the
--   validity check and the increment in one statement, so two concurrent
--   bookings can never over-consume a single-use code (row-level lock).
--   Called server-side from /api/booking/create on the free path.
-- ---------------------------------------------------------------------------
create or replace function public.fl_consume_invite(p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update public.booking_invites
  set used_count = used_count + 1
  where code = p_code
    and active = true
    and (expires_at is null or expires_at > now())
    and used_count < max_uses;

  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_create_invite — upsert an invite (token-gated). Called from /admin.
--   Re-running with the same code updates its label / max_uses / expiry and
--   re-activates it (so an admin can "reopen" a spent code by raising max_uses).
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_create_invite(
  p_token   text,
  p_code    text,
  p_label   text,
  p_max_uses int,
  p_expires timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  insert into public.booking_invites (code, label, max_uses, expires_at, active)
  values (p_code, p_label, coalesce(p_max_uses, 1), p_expires, true)
  on conflict (code) do update
    set label      = excluded.label,
        max_uses   = excluded.max_uses,
        expires_at = excluded.expires_at,
        active     = true;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_list_invites — every invite, newest first (token-gated).
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_list_invites(p_token text)
returns setof public.booking_invites
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  return query
    select *
    from public.booking_invites
    order by created_at desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants. As with 0005, the admin functions are callable by anon but the
-- fl_is_admin(p_token) check inside is the real gate. fl_check_invite and
-- fl_consume_invite are intentionally anon-callable (read-only / atomic-guarded).
-- ---------------------------------------------------------------------------
revoke all on function public.fl_check_invite(text)                            from public;
revoke all on function public.fl_consume_invite(text)                          from public;
revoke all on function public.fl_admin_create_invite(text, text, text, int, timestamptz) from public;
revoke all on function public.fl_admin_list_invites(text)                      from public;

grant execute on function public.fl_check_invite(text)                            to anon, authenticated;
grant execute on function public.fl_consume_invite(text)                          to anon, authenticated;
grant execute on function public.fl_admin_create_invite(text, text, text, int, timestamptz) to anon, authenticated;
grant execute on function public.fl_admin_list_invites(text)                      to anon, authenticated;
