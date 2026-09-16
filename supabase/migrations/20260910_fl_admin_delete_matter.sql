-- fl_admin_delete_matter — hard-delete a single matter row.
create or replace function public.fl_admin_delete_matter(
  p_token text,
  p_id    uuid
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  delete from public.fl_matters where id = p_id;
end;
$$;

revoke all on function public.fl_admin_delete_matter(text, uuid) from public;
grant execute on function public.fl_admin_delete_matter(text, uuid) to anon, authenticated;