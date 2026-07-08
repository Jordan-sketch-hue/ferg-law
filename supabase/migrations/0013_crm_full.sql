-- ============================================================================
-- 0013_crm_full.sql — Full CRM expansion: clients, matters, availability
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fl_clients — CRM client records
-- ---------------------------------------------------------------------------
create table if not exists public.fl_clients (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  name                  text not null,
  email                 text,
  phone                 text,
  source                text check (source in ('chatbot','booking','referral','direct')),
  client_type           text check (client_type in ('individual','corporate','diaspora')),
  country_of_residence  text,
  preferred_contact     text check (preferred_contact in ('whatsapp','email','phone')),
  preferred_timezone    text,
  notes                 text,
  status                text not null default 'prospect'
                          check (status in ('active','inactive','prospect')),
  meta                  jsonb not null default '{}'::jsonb
);

alter table public.fl_clients enable row level security;
-- No anon SELECT — all reads via SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- fl_matters — per-client matter pipeline
-- ---------------------------------------------------------------------------
create table if not exists public.fl_matters (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  client_id             uuid references public.fl_clients(id) on delete cascade,
  ref                   text unique not null,
  matter_type           text check (matter_type in ('conveyancing','estate','commercial','notarial','diaspora','other')),
  stage                 text not null default 'enquiry'
                          check (stage in ('enquiry','consultation_booked','consultation_done','retainer','active','closed')),
  property_address      text,
  title_type            text,
  nht_eligible          boolean,
  estate_value_jmd      bigint,
  executor_name         text,
  business_type         text,
  transaction_value_jmd bigint,
  description           text,
  priority              text not null default 'standard'
                          check (priority in ('standard','urgent')),
  payment_status        text not null default 'unpaid'
                          check (payment_status in ('unpaid','deposit_paid','paid')),
  assigned_ref          text,
  notes                 text,
  closed_at             timestamptz,
  meta                  jsonb not null default '{}'::jsonb
);

alter table public.fl_matters enable row level security;
-- No anon SELECT — all reads via SECURITY DEFINER RPCs.

create index if not exists fl_matters_client_id_idx on public.fl_matters (client_id);
create index if not exists fl_matters_stage_idx on public.fl_matters (stage);

-- ---------------------------------------------------------------------------
-- fl_availability — weekly schedule template
-- ---------------------------------------------------------------------------
create table if not exists public.fl_availability (
  id                    uuid primary key default gen_random_uuid(),
  day_of_week           int not null check (day_of_week between 0 and 6),
  start_time            time not null,
  end_time              time not null,
  slot_duration_minutes int not null default 20,
  active                boolean not null default true
);

alter table public.fl_availability enable row level security;

-- anon may read availability (needed for public slot calculation)
drop policy if exists "anon select fl_availability" on public.fl_availability;
create policy "anon select fl_availability"
  on public.fl_availability for select to anon, authenticated
  using (true);

-- Seed Mon-Fri (1=Mon … 5=Fri) 9am-5pm 20-min slots if not already seeded
insert into public.fl_availability (day_of_week, start_time, end_time, slot_duration_minutes, active)
select d, '09:00'::time, '17:00'::time, 20, true
from unnest(array[1,2,3,4,5]) as t(d)
where not exists (select 1 from public.fl_availability where day_of_week = d)
on conflict do nothing;

-- ===========================================================================
-- SECURITY DEFINER RPCs
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- fl_admin_clients — all clients, newest first
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_clients(p_token text)
returns setof public.fl_clients
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  return query select * from public.fl_clients order by created_at desc limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_matters — all matters joined with client name
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_matters(p_token text)
returns table (
  id                    uuid,
  created_at            timestamptz,
  client_id             uuid,
  client_name           text,
  ref                   text,
  matter_type           text,
  stage                 text,
  property_address      text,
  title_type            text,
  nht_eligible          boolean,
  estate_value_jmd      bigint,
  executor_name         text,
  business_type         text,
  transaction_value_jmd bigint,
  description           text,
  priority              text,
  payment_status        text,
  assigned_ref          text,
  notes                 text,
  closed_at             timestamptz,
  meta                  jsonb
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
      m.id, m.created_at, m.client_id,
      c.name as client_name,
      m.ref, m.matter_type, m.stage,
      m.property_address, m.title_type, m.nht_eligible,
      m.estate_value_jmd, m.executor_name,
      m.business_type, m.transaction_value_jmd,
      m.description, m.priority, m.payment_status,
      m.assigned_ref, m.notes, m.closed_at, m.meta
    from public.fl_matters m
    left join public.fl_clients c on c.id = m.client_id
    order by m.created_at desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_set_matter_stage
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_set_matter_stage(
  p_token text,
  p_id    uuid,
  p_stage text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  update public.fl_matters
    set stage = p_stage,
        closed_at = case when p_stage = 'closed' then now() else closed_at end
  where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_set_matter_payment
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_set_matter_payment(
  p_token  text,
  p_id     uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  update public.fl_matters set payment_status = p_status where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_upsert_client — create or update client by email/phone match
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_upsert_client(
  p_token   text,
  p_name    text,
  p_email   text default null,
  p_phone   text default null,
  p_type    text default 'individual',
  p_country text default null,
  p_notes   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  -- Try to match existing client by email or phone
  if p_email is not null then
    select id into v_id from public.fl_clients where email = p_email limit 1;
  end if;
  if v_id is null and p_phone is not null then
    select id into v_id from public.fl_clients where phone = p_phone limit 1;
  end if;

  if v_id is not null then
    update public.fl_clients set
      name                 = coalesce(nullif(p_name,''), name),
      email                = coalesce(p_email, email),
      phone                = coalesce(p_phone, phone),
      client_type          = coalesce(nullif(p_type,''), client_type),
      country_of_residence = coalesce(p_country, country_of_residence),
      notes                = coalesce(nullif(p_notes,''), notes)
    where id = v_id;
    return v_id;
  else
    insert into public.fl_clients (name, email, phone, client_type, country_of_residence, notes, source)
    values (p_name, p_email, p_phone, coalesce(nullif(p_type,''),'individual'), p_country, p_notes, 'direct')
    returning id into v_id;
    return v_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_get_availability
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_get_availability(p_token text)
returns setof public.fl_availability
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  return query select * from public.fl_availability order by day_of_week, start_time;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_set_availability
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_set_availability(
  p_token    text,
  p_day      int,
  p_start    time,
  p_end      time,
  p_duration int,
  p_active   boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  update public.fl_availability
    set start_time = p_start,
        end_time   = p_end,
        slot_duration_minutes = p_duration,
        active = p_active
  where day_of_week = p_day;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_available_slots — PUBLIC, anon-callable
-- Returns available slot timestamps (Jamaica local expressed as UTC) for a
-- given window, based on fl_availability schedule minus taken_slots.
-- ---------------------------------------------------------------------------
create or replace function public.fl_available_slots(
  p_from timestamptz,
  p_to   timestamptz
)
returns table (slot_start timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_avail record;
  v_day   date;
  v_cur   timestamptz;
  v_slot  timestamptz;
  v_end   timestamptz;
  v_taken timestamptz[];
begin
  -- Collect taken slots once
  select array_agg(ts) into v_taken
  from public.taken_slots(p_from, p_to) as t(ts);

  if v_taken is null then v_taken := array[]::timestamptz[]; end if;

  -- Iterate each day in window
  v_day := (p_from at time zone 'America/Jamaica')::date;

  while v_day <= (p_to at time zone 'America/Jamaica')::date loop
    -- dow: 0=Sunday in PostgreSQL extract
    for v_avail in
      select * from public.fl_availability
      where day_of_week = extract(isodow from v_day)::int
        and active = true
    loop
      v_cur := (v_day || ' ' || v_avail.start_time)::timestamp at time zone 'America/Jamaica';
      v_end := (v_day || ' ' || v_avail.end_time)::timestamp at time zone 'America/Jamaica';

      while v_cur + (v_avail.slot_duration_minutes || ' minutes')::interval <= v_end loop
        v_slot := v_cur;
        -- Only return future slots not already taken
        if v_slot >= now() and not (v_slot = any(v_taken)) then
          slot_start := v_slot;
          return next;
        end if;
        v_cur := v_cur + (v_avail.slot_duration_minutes || ' minutes')::interval;
      end loop;
    end loop;
    v_day := v_day + 1;
  end loop;
end;
$$;

-- Grant public execute on the anon-callable slot function
grant execute on function public.fl_available_slots(timestamptz, timestamptz) to anon, authenticated;
