-- 20261008_client_portal_invited_at.sql
-- Track when each client was first sent a portal invite so the admin UI can
-- permanently disable the "Send Login Email" button after the first send.

alter table public.fl_clients
  add column if not exists portal_invited_at timestamptz;

-- Expose the new column through the admin clients RPC
create or replace function public.fl_admin_clients(p_token text)
returns table (
  id                    uuid,
  created_at            timestamptz,
  name                  text,
  email                 text,
  phone                 text,
  source                text,
  client_type           text,
  country_of_residence  text,
  preferred_contact     text,
  preferred_timezone    text,
  notes                 text,
  status                text,
  meta                  jsonb,
  portal_invited_at     timestamptz
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
      id, created_at, name, email, phone, source, client_type,
      country_of_residence, preferred_contact, preferred_timezone,
      notes, status, meta, portal_invited_at
    from public.fl_clients
    order by created_at desc
    limit 500;
end;
$$;
