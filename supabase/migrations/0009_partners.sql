-- ============================================================================
-- 0009_partners.sql — Partner Directory (realtors, surveyors, valuators)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   A self-managed professional directory layered onto the Ferguson Law site.
--   "Partners" (NOT the firm's legal clients) are realtors, surveyors and
--   valuators who each get a profile page they manage themselves:
--     • realtors  → post property LISTINGS with photos/video
--     • surveyors / valuators → post SERVICES with fees
--   Every public partner page carries a Ferguson Law disclaimer (rendered in the
--   UI) — the firm lists them but does not endorse or take liability for them.
--   Visitors (clients) reach it from a clear "Find a Professional" link on the
--   main site.
--
-- WHO IS WHO (terminology — see project_ferguson_law memory)
--   Client  = a person Ferguson Law represents (conveyancing matter). PRIVATE.
--   Partner = a realtor/surveyor/valuator listed in the directory. PUBLIC.
--
-- SUPERSEDES the empty, unused `public.fl_pro_listings` stub (a flat one-row
--   model that could not represent one-partner-to-many-listings). Dropped below.
--
-- SECURITY MODEL
--   • The directory is PUBLIC by design — visitors browse it to find a pro, so
--     approved partners + published listings/services are world-readable
--     (contact details included; partners WANT to be contacted).
--   • A partner can manage ONLY their own rows — RLS keyed to auth.uid()
--     (partners authenticate via Supabase Auth).
--   • New partners land 'pending' and are invisible until the firm approves them
--     through the token-gated admin RPCs (same fl_is_admin gate as the CRM).
-- ============================================================================

-- Remove the superseded empty stub (0 rows, referenced by no app code).
drop table if exists public.fl_pro_listings cascade;

-- ---------------------------------------------------------------------------
-- updated_at helper (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.fl_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- fl_partners — one row per professional, linked to their Supabase Auth user.
-- ===========================================================================
create table if not exists public.fl_partners (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  user_id       uuid unique references auth.users(id) on delete set null,
  kind          text not null check (kind in ('realtor', 'surveyor', 'valuator')),
  business_name text not null,
  contact_name  text,
  email         text,
  phone         text,
  whatsapp      text,
  website       text,
  parishes      text[] not null default '{}',
  bio           text,
  logo_url      text,
  slug          text unique,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'suspended')),
  featured      boolean not null default false
);

create index if not exists fl_partners_kind_status_idx on public.fl_partners (kind, status);
create index if not exists fl_partners_user_idx on public.fl_partners (user_id);

drop trigger if exists fl_partners_touch on public.fl_partners;
create trigger fl_partners_touch before update on public.fl_partners
  for each row execute function public.fl_touch_updated_at();

-- ===========================================================================
-- fl_partner_listings — realtor property listings (photos/video).
-- ===========================================================================
create table if not exists public.fl_partner_listings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  partner_id    uuid not null references public.fl_partners(id) on delete cascade,
  title         text not null,
  description   text,
  parish        text,
  address       text,
  price_jmd     bigint,
  bedrooms      int,
  bathrooms     int,
  property_type text,
  -- media = jsonb array of { type: 'image' | 'video', url: text }
  media         jsonb not null default '[]'::jsonb,
  status        text not null default 'published'
                  check (status in ('draft', 'published', 'archived')),
  featured      boolean not null default false
);

create index if not exists fl_partner_listings_partner_idx on public.fl_partner_listings (partner_id);
create index if not exists fl_partner_listings_status_idx on public.fl_partner_listings (status);

drop trigger if exists fl_partner_listings_touch on public.fl_partner_listings;
create trigger fl_partner_listings_touch before update on public.fl_partner_listings
  for each row execute function public.fl_touch_updated_at();

-- ===========================================================================
-- fl_partner_services — surveyor / valuator services + fees.
-- ===========================================================================
create table if not exists public.fl_partner_services (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  partner_id  uuid not null references public.fl_partners(id) on delete cascade,
  name        text not null,
  description text,
  -- fee kept as free text ("From J$25,000", "J$15,000 / acre") so partners can
  -- price however their trade does; optional numeric for sorting/filters.
  fee_text    text,
  fee_jmd     bigint,
  status      text not null default 'published'
                check (status in ('draft', 'published', 'archived'))
);

create index if not exists fl_partner_services_partner_idx on public.fl_partner_services (partner_id);

drop trigger if exists fl_partner_services_touch on public.fl_partner_services;
create trigger fl_partner_services_touch before update on public.fl_partner_services
  for each row execute function public.fl_touch_updated_at();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.fl_partners         enable row level security;
alter table public.fl_partner_listings enable row level security;
alter table public.fl_partner_services enable row level security;

-- ---- Public read: only APPROVED partners and their PUBLISHED content ----
drop policy if exists "public read approved partners" on public.fl_partners;
create policy "public read approved partners"
  on public.fl_partners for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "public read published listings" on public.fl_partner_listings;
create policy "public read published listings"
  on public.fl_partner_listings for select to anon, authenticated
  using (
    status = 'published'
    and exists (select 1 from public.fl_partners p
                where p.id = partner_id and p.status = 'approved')
  );

drop policy if exists "public read published services" on public.fl_partner_services;
create policy "public read published services"
  on public.fl_partner_services for select to anon, authenticated
  using (
    status = 'published'
    and exists (select 1 from public.fl_partners p
                where p.id = partner_id and p.status = 'approved')
  );

-- ---- Partner self-management: a partner owns only their own rows ----
drop policy if exists "partner manages own profile" on public.fl_partners;
create policy "partner manages own profile"
  on public.fl_partners for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "partner manages own listings" on public.fl_partner_listings;
create policy "partner manages own listings"
  on public.fl_partner_listings for all to authenticated
  using (exists (select 1 from public.fl_partners p
                 where p.id = partner_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.fl_partners p
                      where p.id = partner_id and p.user_id = auth.uid()));

drop policy if exists "partner manages own services" on public.fl_partner_services;
create policy "partner manages own services"
  on public.fl_partner_services for all to authenticated
  using (exists (select 1 from public.fl_partners p
                 where p.id = partner_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.fl_partners p
                      where p.id = partner_id and p.user_id = auth.uid()));

-- ===========================================================================
-- Storage bucket for partner media (logos, listing photos/video).
-- Public read; only authenticated users may write, and only under a path that
-- starts with their own auth.uid() (so partners can't overwrite each other).
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('partner-media', 'partner-media', true)
on conflict (id) do nothing;

drop policy if exists "partner media public read" on storage.objects;
create policy "partner media public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'partner-media');

drop policy if exists "partner media owner write" on storage.objects;
create policy "partner media owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'partner-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "partner media owner update" on storage.objects;
create policy "partner media owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'partner-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "partner media owner delete" on storage.objects;
create policy "partner media owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'partner-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===========================================================================
-- Admin RPCs (token-gated, same fl_is_admin gate as the CRM in 0005).
-- The firm moderates the directory: list everyone (incl. pending), approve,
-- suspend, or feature a partner.
-- ===========================================================================
create or replace function public.fl_admin_partners(p_token text)
returns setof public.fl_partners
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  return query select * from public.fl_partners order by
    (status = 'pending') desc, created_at desc limit 500;
end;
$$;

create or replace function public.fl_admin_set_partner_status(
  p_token text, p_id uuid, p_status text
) returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  if p_status not in ('pending', 'approved', 'suspended') then
    raise exception 'bad status';
  end if;
  update public.fl_partners set status = p_status where id = p_id;
end;
$$;

create or replace function public.fl_admin_set_partner_featured(
  p_token text, p_id uuid, p_featured boolean
) returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  update public.fl_partners set featured = p_featured where id = p_id;
end;
$$;

revoke all on function public.fl_admin_partners(text)                       from public;
revoke all on function public.fl_admin_set_partner_status(text, uuid, text) from public;
revoke all on function public.fl_admin_set_partner_featured(text, uuid, boolean) from public;
grant execute on function public.fl_admin_partners(text)                       to anon, authenticated;
grant execute on function public.fl_admin_set_partner_status(text, uuid, text) to anon, authenticated;
grant execute on function public.fl_admin_set_partner_featured(text, uuid, boolean) to anon, authenticated;
