-- fl_admin_delete_lead — permanently remove a lead record.
create or replace function public.fl_admin_delete_lead(p_token text, p_id uuid)
returns void language plpgsql security definer as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  delete from public.ferguson_leads where id = p_id;
end;
$$;

-- fl_admin_delete_appointment — permanently remove a booking record.
create or replace function public.fl_admin_delete_appointment(p_token text, p_id uuid)
returns void language plpgsql security definer as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  delete from public.appointments where id = p_id;
end;
$$;

revoke all on function public.fl_admin_delete_lead(text, uuid)        from public;
revoke all on function public.fl_admin_delete_appointment(text, uuid)  from public;
grant execute on function public.fl_admin_delete_lead(text, uuid)        to anon, authenticated;
grant execute on function public.fl_admin_delete_appointment(text, uuid)  to anon, authenticated;
