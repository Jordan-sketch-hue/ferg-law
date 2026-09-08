-- Fixes found in QA audit of 0029_appointment_attention (applied to prod via Supabase MCP;
-- this file mirrors that for history).
--
-- 1. Rescheduling silently killed all future reminders — starts_at moved but the
--    reminded_* flags never reset, so a rescheduled appointment got zero reminder
--    emails for its new time.
-- 2. The reminder-log upsert always recomputed sent_at=now() on every call, which made
--    the cron's "was this just logged" freshness check always true — the attendance-check
--    admin push would fire on every cron tick (every 15 min) instead of once.

create or replace function public.fl_admin_reschedule_appointment(p_token text, p_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone)
 returns setof appointments
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  return query
    update public.appointments
    set starts_at = p_starts_at, ends_at = p_ends_at, status = 'confirmed',
        reminded_24h = false, reminded_2h = false, reminded_1h = false, reminded_15m = false
    where id = p_id
    returning *;
end; $function$;

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
    sent_at = fl_appointment_reminder_log.sent_at; -- never clobber the first-sent timestamp
end; $$;

-- Explicit existence check so callers don't have to infer "first write" from timestamps.
create or replace function public.fl_admin_reminder_log_exists(p_token text, p_appointment_id uuid, p_reminder_type text, p_channel text, p_for_starts_at timestamptz)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  return exists (
    select 1 from public.fl_appointment_reminder_log
    where appointment_id = p_appointment_id and reminder_type = p_reminder_type
      and channel = p_channel and for_starts_at = p_for_starts_at
  );
end; $$;
