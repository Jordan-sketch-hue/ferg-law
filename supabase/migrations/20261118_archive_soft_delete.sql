-- 20261118_archive_soft_delete.sql
-- Converts hard-delete archive to soft-delete for leads and clients.

alter table public.ferguson_leads
  add column if not exists archived_at timestamptz default null;

alter table public.fl_clients
  add column if not exists archived_at timestamptz default null;

create or replace function public.fl_admin_delete_lead(
  p_token text, p_id uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  update public.ferguson_leads set archived_at = now() where id = p_id;
end;
$$;

create or replace function public.fl_admin_delete_client(
  p_token text, p_id uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  update public.fl_clients set archived_at = now() where id = p_id;
end;
$$;

create or replace function public.fl_admin_restore_lead(
  p_token text, p_id uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  update public.ferguson_leads set archived_at = null where id = p_id;
end;
$$;

create or replace function public.fl_admin_restore_client(
  p_token text, p_id uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  update public.fl_clients set archived_at = null where id = p_id;
end;
$$;

grant execute on function public.fl_admin_restore_lead(text, uuid)   to anon, authenticated;
grant execute on function public.fl_admin_restore_client(text, uuid) to anon, authenticated;
