-- ============================================================================
-- 0005_crm_rpcs.sql — token-gated read/update RPCs for the consultation CRM
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
--   The CRM back office (`/admin`) runs entirely in the browser with the
--   publishable (anon) key — there is NO service-role key shipped to the client.
--   But `ferguson_leads`, `appointments`, `chat_conversations` and
--   `chat_messages` are all RLS-protected with NO anon SELECT (by design — they
--   hold visitor PII). So the dashboard cannot read them directly.
--
--   These SECURITY DEFINER functions are the bridge: they run with the table
--   owner's privileges (bypassing RLS) but each one FIRST checks the shared
--   admin token via `public.fl_is_admin(p_token)`. The token IS the gate —
--   without it every function raises 'unauthorized' and returns nothing. This
--   keeps the anon key safe to ship while giving the firm a single pane of glass.
--
--   The token is verified server-side inside Postgres on every call, so an
--   attacker holding only the anon key (which is public) still cannot read PII.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fl_admin_leads — every lead, newest first.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_leads(p_token text)
returns setof public.ferguson_leads
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
    from public.ferguson_leads
    order by created_at desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_appointments — every booking, newest start first.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_appointments(p_token text)
returns setof public.appointments
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
    from public.appointments
    order by starts_at desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_conversations — chat threads with a preview of the latest message.
--   `last_message` is the body of the most recent chat_messages row for each
--   conversation (NULL if the thread has no messages yet). Ordered by activity.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_conversations(p_token text)
returns table (
  id              uuid,
  created_at      timestamptz,
  last_message_at timestamptz,
  status          text,
  visitor_name    text,
  visitor_email   text,
  visitor_phone   text,
  last_message    text
)
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
    select
      c.id,
      c.created_at,
      c.last_message_at,
      c.status,
      c.visitor_name,
      c.visitor_email,
      c.visitor_phone,
      (
        select m.body
        from public.chat_messages m
        where m.conversation_id = c.id
        order by m.created_at desc
        limit 1
      ) as last_message
    from public.chat_conversations c
    order by c.last_message_at desc nulls last
    limit 200;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_set_lead_status — update a lead's pipeline status.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_set_lead_status(
  p_token  text,
  p_id     uuid,
  p_status text
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

  update public.ferguson_leads
  set status = p_status
  where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_set_appointment_status — confirm / cancel / complete a booking.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_set_appointment_status(
  p_token  text,
  p_id     uuid,
  p_status text
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

  update public.appointments
  set status = p_status
  where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants. These are callable by anon/authenticated, but the body's
-- fl_is_admin(p_token) check is the real gate — no valid token, no data.
-- ---------------------------------------------------------------------------
revoke all on function public.fl_admin_leads(text)                            from public;
revoke all on function public.fl_admin_appointments(text)                     from public;
revoke all on function public.fl_admin_conversations(text)                    from public;
revoke all on function public.fl_admin_set_lead_status(text, uuid, text)      from public;
revoke all on function public.fl_admin_set_appointment_status(text, uuid, text) from public;

grant execute on function public.fl_admin_leads(text)                            to anon, authenticated;
grant execute on function public.fl_admin_appointments(text)                     to anon, authenticated;
grant execute on function public.fl_admin_conversations(text)                    to anon, authenticated;
grant execute on function public.fl_admin_set_lead_status(text, uuid, text)      to anon, authenticated;
grant execute on function public.fl_admin_set_appointment_status(text, uuid, text) to anon, authenticated;
