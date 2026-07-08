-- ============================================================================
-- 0008_reminders.sql — automatic appointment reminders (24h + 1h before)
-- ----------------------------------------------------------------------------
-- A scheduled job (/api/cron/reminders) calls fl_due_reminders() each run to
-- find confirmed appointments entering a reminder window, emails them, then
-- calls fl_mark_reminded() so each reminder fires exactly once. Token-gated
-- (fl_is_admin) like the other privileged RPCs — no service-role key needed.
-- ============================================================================

alter table public.appointments
  add column if not exists reminded_24h boolean not null default false;
alter table public.appointments
  add column if not exists reminded_1h  boolean not null default false;

-- Appointments due a reminder of kind '24h' or '1h'. Only confirmed bookings
-- (paid or free) get reminders; pending/cancelled never do.
create or replace function public.fl_due_reminders(p_token text, p_kind text)
returns table (ref text, name text, email text, service text, starts_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;

  if p_kind = '24h' then
    return query
      select a.ref, a.name, a.email, a.service, a.starts_at
      from public.appointments a
      where a.status = 'confirmed'
        and a.reminded_24h = false
        and a.starts_at >  now() + interval '23 hours'
        and a.starts_at <= now() + interval '24 hours'
        and a.email is not null;
  elsif p_kind = '1h' then
    return query
      select a.ref, a.name, a.email, a.service, a.starts_at
      from public.appointments a
      where a.status = 'confirmed'
        and a.reminded_1h = false
        and a.starts_at >  now()
        and a.starts_at <= now() + interval '90 minutes'
        and a.email is not null;
  end if;
end;
$$;

create or replace function public.fl_mark_reminded(p_token text, p_ref text, p_kind text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  if p_kind = '24h' then
    update public.appointments set reminded_24h = true where ref = p_ref;
  elsif p_kind = '1h' then
    update public.appointments set reminded_1h = true where ref = p_ref;
  end if;
end;
$$;

revoke all on function public.fl_due_reminders(text, text) from public;
revoke all on function public.fl_mark_reminded(text, text, text) from public;
grant execute on function public.fl_due_reminders(text, text) to anon, authenticated;
grant execute on function public.fl_mark_reminded(text, text, text) to anon, authenticated;
