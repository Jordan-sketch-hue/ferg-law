-- Appointment Attention System: additive schema (new columns, new tables, new/extended RPCs).
-- No existing data or behavior is changed; all new checks/branches are additive.
-- Applied to prod (ciggiwpztuxkmbaccrlp) via Supabase MCP; this file mirrors that for history.

-- 1. Widen appointment status to support attendance tracking (no-show).
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('pending','confirmed','cancelled','completed','no_show'));

-- 2. New reminder tiers alongside the existing 24h/1h columns.
alter table public.appointments add column if not exists reminded_2h boolean not null default false;
alter table public.appointments add column if not exists reminded_15m boolean not null default false;

-- 3. Reminder delivery audit log — one row per (appointment, reminder type, channel, occurrence).
create table if not exists public.fl_appointment_reminder_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  appointment_ref text not null,
  reminder_type text not null check (reminder_type in ('confirmation','24h','2h','1h','15m','attendance_check','rescheduled','cancelled','link_updated')),
  channel text not null default 'email' check (channel in ('email','whatsapp','sms','push')),
  destination text,
  status text not null default 'pending' check (status in ('pending','sent','delivered','failed','skipped')),
  provider_message_id text,
  error_message text,
  for_starts_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (appointment_id, reminder_type, channel, for_starts_at)
);
alter table public.fl_appointment_reminder_log enable row level security;
create index if not exists fl_appointment_reminder_log_appt_idx on public.fl_appointment_reminder_log(appointment_id);

-- 4. Daily "schedule reviewed" audit trail (per admin, per Jamaica calendar day).
create table if not exists public.fl_schedule_reviews (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  review_date date not null,
  reviewed_at timestamptz not null default now(),
  unique (admin_email, review_date)
);
alter table public.fl_schedule_reviews enable row level security;

-- 5. Daily morning-digest idempotency guard (one push per calendar day).
create table if not exists public.fl_daily_digest_log (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null unique,
  sent_at timestamptz not null default now()
);
alter table public.fl_daily_digest_log enable row level security;

-- 6. Extend fl_due_reminders with 2h + 15m tiers (24h/1h branches preserved verbatim).
create or replace function public.fl_due_reminders(p_token text, p_kind text)
 returns table(ref text, name text, email text, service text, starts_at timestamp with time zone)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  if p_kind = '24h' then
    return query select a.ref, a.name, a.email, a.service, a.starts_at from public.appointments a
      where a.status='confirmed' and a.reminded_24h=false
        and a.starts_at > now() + interval '23 hours' and a.starts_at <= now() + interval '24 hours' and a.email is not null;
  elsif p_kind = '2h' then
    return query select a.ref, a.name, a.email, a.service, a.starts_at from public.appointments a
      where a.status='confirmed' and a.reminded_2h=false
        and a.starts_at > now() + interval '1 hour 45 minutes' and a.starts_at <= now() + interval '2 hours 15 minutes' and a.email is not null;
  elsif p_kind = '1h' then
    return query select a.ref, a.name, a.email, a.service, a.starts_at from public.appointments a
      where a.status='confirmed' and a.reminded_1h=false
        and a.starts_at > now() and a.starts_at <= now() + interval '90 minutes' and a.email is not null;
  elsif p_kind = '15m' then
    return query select a.ref, a.name, a.email, a.service, a.starts_at from public.appointments a
      where a.status='confirmed' and a.reminded_15m=false
        and a.starts_at > now() and a.starts_at <= now() + interval '20 minutes' and a.email is not null;
  end if;
end; $function$;

-- 7. Extend fl_mark_reminded with 2h + 15m tiers (24h/1h branches preserved verbatim).
create or replace function public.fl_mark_reminded(p_token text, p_ref text, p_kind text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  if p_kind = '24h' then update public.appointments set reminded_24h=true where ref=p_ref;
  elsif p_kind = '2h' then update public.appointments set reminded_2h=true where ref=p_ref;
  elsif p_kind = '1h' then update public.appointments set reminded_1h=true where ref=p_ref;
  elsif p_kind = '15m' then update public.appointments set reminded_15m=true where ref=p_ref;
  end if;
end; $function$;

-- 8. Idempotent reminder-log writer (upsert on the natural key).
create or replace function public.fl_admin_log_reminder(
  p_token text,
  p_appointment_id uuid,
  p_appointment_ref text,
  p_reminder_type text,
  p_channel text,
  p_destination text,
  p_status text,
  p_for_starts_at timestamptz,
  p_provider_message_id text default null,
  p_error_message text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  insert into public.fl_appointment_reminder_log
    (appointment_id, appointment_ref, reminder_type, channel, destination, status, provider_message_id, error_message, for_starts_at, sent_at)
  values
    (p_appointment_id, p_appointment_ref, p_reminder_type, p_channel, p_destination, p_status, p_provider_message_id, p_error_message, p_for_starts_at,
     case when p_status in ('sent','delivered') then now() else null end)
  on conflict (appointment_id, reminder_type, channel, for_starts_at)
  do update set
    status = excluded.status,
    provider_message_id = coalesce(excluded.provider_message_id, fl_appointment_reminder_log.provider_message_id),
    error_message = excluded.error_message,
    sent_at = coalesce(excluded.sent_at, fl_appointment_reminder_log.sent_at);
end; $$;

-- 9. Reminder history reader, for the booking-detail attention panel.
create or replace function public.fl_admin_reminder_log(p_token text, p_appointment_id uuid)
returns setof public.fl_appointment_reminder_log
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  return query select * from public.fl_appointment_reminder_log
    where appointment_id = p_appointment_id
    order by created_at desc;
end; $$;

-- 10. Daily schedule-review acknowledgement (operational audit trail, not a liability shield).
create or replace function public.fl_admin_mark_schedule_reviewed(p_token text, p_email text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  insert into public.fl_schedule_reviews (admin_email, review_date, reviewed_at)
  values (p_email, (now() at time zone 'America/Jamaica')::date, now())
  on conflict (admin_email, review_date) do update set reviewed_at = now();
end; $$;

create or replace function public.fl_admin_schedule_review_today(p_token text, p_email text)
returns timestamptz
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare v_reviewed timestamptz;
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  select reviewed_at into v_reviewed from public.fl_schedule_reviews
    where admin_email = p_email and review_date = (now() at time zone 'America/Jamaica')::date;
  return v_reviewed;
end; $$;
