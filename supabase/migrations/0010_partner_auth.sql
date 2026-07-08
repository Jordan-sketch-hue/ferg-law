-- ============================================================================
-- 0010_partner_auth.sql — token-based accounts for Partner self-management
-- ----------------------------------------------------------------------------
-- This project ships NO Supabase Auth session and NO service-role key to the
-- browser — the admin console already authenticates with a bcrypt + token
-- pattern (fl_admin / homeready_admin). Partners use the SAME pattern so:
--   • sign-up works instantly (no email-confirmation round-trip), and
--   • all writes go through SECURITY DEFINER RPCs gated by the partner's token,
--     never through RLS keyed to auth.uid() (there is no auth.uid here).
--
-- CREDENTIAL SAFETY: password hashes live in fl_partner_accounts, which has RLS
-- enabled and NO policies — so the public "read approved partners" policy on
-- fl_partners can never expose a hash. Only these definer RPCs touch creds.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---- credential + session tables (locked; only RPCs below touch them) ----
create table if not exists public.fl_partner_accounts (
  partner_id uuid primary key references public.fl_partners(id) on delete cascade,
  email      text not null,
  pass_hash  text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists fl_partner_accounts_email_idx
  on public.fl_partner_accounts (lower(email));
alter table public.fl_partner_accounts enable row level security;

create table if not exists public.fl_partner_sessions (
  token      uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.fl_partners(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.fl_partner_sessions enable row level security;

-- ---- helper: resolve a session token to a partner id (or raise) ----
create or replace function public.fl_partner_id(p_token uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare pid uuid;
begin
  select partner_id into pid from public.fl_partner_sessions where token = p_token;
  if pid is null then raise exception 'unauthorized'; end if;
  return pid;
end; $$;

-- ---- register: make the partner (pending) + account + session ----
create or replace function public.fl_partner_register(
  p_email text, p_password text, p_kind text, p_business_name text
) returns uuid
language plpgsql volatile security definer set search_path = public, extensions as $$
declare pid uuid; tok uuid; base text; sl text; n int := 0;
begin
  if p_kind not in ('realtor','surveyor','valuator') then raise exception 'bad kind'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'weak password'; end if;
  if exists (select 1 from public.fl_partner_accounts where lower(email)=lower(p_email)) then
    raise exception 'email exists';
  end if;

  base := regexp_replace(lower(coalesce(p_business_name,'partner')), '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then base := 'partner'; end if;
  sl := base;
  while exists (select 1 from public.fl_partners where slug = sl) loop
    n := n + 1; sl := base || '-' || n;
  end loop;

  insert into public.fl_partners (kind, business_name, email, slug, status)
    values (p_kind, p_business_name, p_email, sl, 'pending')
    returning id into pid;
  insert into public.fl_partner_accounts (partner_id, email, pass_hash)
    values (pid, p_email, crypt(p_password, gen_salt('bf')));
  insert into public.fl_partner_sessions (partner_id) values (pid) returning token into tok;
  return tok;
end; $$;

-- ---- login ----
create or replace function public.fl_partner_login(p_email text, p_password text)
returns uuid
language plpgsql volatile security definer set search_path = public, extensions as $$
declare pid uuid; tok uuid;
begin
  select partner_id into pid from public.fl_partner_accounts
    where lower(email)=lower(p_email) and pass_hash = crypt(p_password, pass_hash);
  if pid is null then raise exception 'invalid login'; end if;
  insert into public.fl_partner_sessions (partner_id) values (pid) returning token into tok;
  return tok;
end; $$;

-- ---- me: own profile row ----
create or replace function public.fl_partner_me(p_token uuid)
returns setof public.fl_partners
language plpgsql stable security definer set search_path = public as $$
begin
  return query select * from public.fl_partners where id = public.fl_partner_id(p_token);
end; $$;

-- ---- update own profile (whitelisted fields only) ----
create or replace function public.fl_partner_update(p_token uuid, p_patch jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare pid uuid := public.fl_partner_id(p_token);
begin
  update public.fl_partners set
    business_name = coalesce(p_patch->>'business_name', business_name),
    contact_name  = coalesce(p_patch->>'contact_name', contact_name),
    phone         = coalesce(p_patch->>'phone', phone),
    whatsapp      = coalesce(p_patch->>'whatsapp', whatsapp),
    website       = coalesce(p_patch->>'website', website),
    bio           = coalesce(p_patch->>'bio', bio),
    logo_url      = coalesce(p_patch->>'logo_url', logo_url),
    parishes      = coalesce(
                      case when p_patch ? 'parishes'
                        then array(select jsonb_array_elements_text(p_patch->'parishes')) end,
                      parishes)
  where id = pid;
end; $$;

-- ---- own listings / services (all statuses, incl. drafts) ----
create or replace function public.fl_partner_listings(p_token uuid)
returns setof public.fl_partner_listings
language plpgsql stable security definer set search_path = public as $$
begin
  return query select * from public.fl_partner_listings
    where partner_id = public.fl_partner_id(p_token) order by created_at desc;
end; $$;

create or replace function public.fl_partner_services(p_token uuid)
returns setof public.fl_partner_services
language plpgsql stable security definer set search_path = public as $$
begin
  return query select * from public.fl_partner_services
    where partner_id = public.fl_partner_id(p_token) order by created_at desc;
end; $$;

-- ---- upsert a listing (insert when no id, else update own) ----
create or replace function public.fl_partner_save_listing(p_token uuid, p_data jsonb)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare pid uuid := public.fl_partner_id(p_token); lid uuid;
begin
  lid := nullif(p_data->>'id','')::uuid;
  if lid is null then
    insert into public.fl_partner_listings
      (partner_id, title, description, parish, address, price_jmd, bedrooms, bathrooms, property_type, media, status)
    values (pid,
      coalesce(p_data->>'title','Untitled'), p_data->>'description', p_data->>'parish', p_data->>'address',
      nullif(p_data->>'price_jmd','')::bigint, nullif(p_data->>'bedrooms','')::int, nullif(p_data->>'bathrooms','')::int,
      p_data->>'property_type', coalesce(p_data->'media','[]'::jsonb),
      coalesce(p_data->>'status','published'))
    returning id into lid;
  else
    update public.fl_partner_listings set
      title=coalesce(p_data->>'title',title), description=p_data->>'description', parish=p_data->>'parish',
      address=p_data->>'address', price_jmd=nullif(p_data->>'price_jmd','')::bigint,
      bedrooms=nullif(p_data->>'bedrooms','')::int, bathrooms=nullif(p_data->>'bathrooms','')::int,
      property_type=p_data->>'property_type', media=coalesce(p_data->'media',media),
      status=coalesce(p_data->>'status',status)
    where id=lid and partner_id=pid;
  end if;
  return lid;
end; $$;

create or replace function public.fl_partner_delete_listing(p_token uuid, p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  delete from public.fl_partner_listings where id=p_id and partner_id=public.fl_partner_id(p_token);
end; $$;

create or replace function public.fl_partner_save_service(p_token uuid, p_data jsonb)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare pid uuid := public.fl_partner_id(p_token); sid uuid;
begin
  sid := nullif(p_data->>'id','')::uuid;
  if sid is null then
    insert into public.fl_partner_services (partner_id, name, description, fee_text, fee_jmd, status)
    values (pid, coalesce(p_data->>'name','Service'), p_data->>'description', p_data->>'fee_text',
      nullif(p_data->>'fee_jmd','')::bigint, coalesce(p_data->>'status','published'))
    returning id into sid;
  else
    update public.fl_partner_services set
      name=coalesce(p_data->>'name',name), description=p_data->>'description',
      fee_text=p_data->>'fee_text', fee_jmd=nullif(p_data->>'fee_jmd','')::bigint,
      status=coalesce(p_data->>'status',status)
    where id=sid and partner_id=pid;
  end if;
  return sid;
end; $$;

create or replace function public.fl_partner_delete_service(p_token uuid, p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  delete from public.fl_partner_services where id=p_id and partner_id=public.fl_partner_id(p_token);
end; $$;

-- ---- grants (token check inside each body is the real gate) ----
revoke all on function public.fl_partner_register(text,text,text,text) from public;
revoke all on function public.fl_partner_login(text,text) from public;
grant execute on function public.fl_partner_register(text,text,text,text) to anon, authenticated;
grant execute on function public.fl_partner_login(text,text) to anon, authenticated;
grant execute on function public.fl_partner_me(uuid) to anon, authenticated;
grant execute on function public.fl_partner_update(uuid,jsonb) to anon, authenticated;
grant execute on function public.fl_partner_listings(uuid) to anon, authenticated;
grant execute on function public.fl_partner_services(uuid) to anon, authenticated;
grant execute on function public.fl_partner_save_listing(uuid,jsonb) to anon, authenticated;
grant execute on function public.fl_partner_delete_listing(uuid,uuid) to anon, authenticated;
grant execute on function public.fl_partner_save_service(uuid,jsonb) to anon, authenticated;
grant execute on function public.fl_partner_delete_service(uuid,uuid) to anon, authenticated;

-- ---- relax partner-media bucket to anon insert (no Supabase Auth here),
-- ---- matching the existing pitch-media bucket pattern. ----
drop policy if exists "partner media owner write" on storage.objects;
drop policy if exists "partner media owner update" on storage.objects;
drop policy if exists "partner media owner delete" on storage.objects;
create policy "partner media anon write" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'partner-media');
