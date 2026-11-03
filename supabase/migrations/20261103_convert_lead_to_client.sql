-- Fix #10: fl_clients default status -> 'active' (was 'prospect')
alter table public.fl_clients
  alter column status set default 'active';

-- Fix #11: RPC to promote a lead to a client record, then archive the lead.
create or replace function public.fl_admin_convert_lead_to_client(
  p_token  text,
  p_lead_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead  record;
  v_cid   uuid;
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  select * into v_lead from public.fl_leads where id = p_lead_id;
  if not found then
    raise exception 'lead not found';
  end if;

  -- Upsert client record (match on email or phone)
  if v_lead.email is not null then
    select id into v_cid from public.fl_clients where email = v_lead.email limit 1;
  end if;
  if v_cid is null and v_lead.phone is not null then
    select id into v_cid from public.fl_clients where phone = v_lead.phone limit 1;
  end if;

  if v_cid is not null then
    update public.fl_clients set
      name   = coalesce(nullif(v_lead.name,''), name),
      email  = coalesce(v_lead.email, email),
      phone  = coalesce(v_lead.phone, phone),
      status = 'active'
    where id = v_cid;
  else
    insert into public.fl_clients (name, email, phone, status, source)
    values (v_lead.name, v_lead.email, v_lead.phone, 'active', 'lead_conversion')
    returning id into v_cid;
  end if;

  -- Archive the lead
  update public.fl_leads set status = 'closed' where id = p_lead_id;

  return v_cid;
end;
$$;