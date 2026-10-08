-- 20261008_fix_cms_matters_left_join.sql
-- Fix: fl_admin_cms_matters used INNER JOIN on auth.users, which silently
-- dropped matters whose auth account had been deleted or whose client_id
-- didn't resolve to an active auth user. Switching to LEFT JOIN ensures all
-- matters are always returned regardless of auth account state.

create or replace function public.fl_admin_cms_matters(p_token text)
returns table (
  id             uuid,
  client_id      uuid,
  client_email   text,
  client_name    text,
  matter_type    text,
  workflow_type  text,
  current_phase  int,
  status         text,
  kyc_status     text,
  title          text,
  notes          text,
  created_at     timestamptz
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
      m.id, m.client_id,
      u.email::text,
      coalesce(
        u.raw_user_meta_data->>'full_name',
        split_part(u.email::text, '@', 1),
        '[no account]'
      ) as client_name,
      m.matter_type, m.workflow_type, m.current_phase, m.status, m.kyc_status,
      m.title, m.notes, m.created_at
    from public.fl_client_matters m
    left join auth.users u on u.id = m.client_id
    order by m.created_at desc
    limit 500;
end;
$$;
