-- ============================================================================
-- 0019_missing_admin_rpcs.sql — Wire up every admin RPC the UI calls but
-- that was never defined in any previous migration.
-- ----------------------------------------------------------------------------
-- Missing items fixed here:
--   1. fl_admin_login / fl_admin_whoami / fl_admin_set_password / fl_admin_set_email
--   2. fl_inbound_emails table + fl_admin_emails RPC
--   3. fl_home_inquiries table + fl_admin_home_inquiries / fl_admin_home_inquiry_status RPCs
--   4. fl_admin_matter_milestones / fl_admin_upsert_milestone / fl_admin_delete_milestone
--   5. fl_blocked_slots table + fl_admin_list_blocked_slots / fl_admin_block_slot / fl_admin_unblock_slot
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: resolve admin credentials table (used across auth RPCs)
-- We store admin accounts in a private table. If it doesn't exist, create it
-- and seed from any existing token in fl_admin_config.
-- ---------------------------------------------------------------------------
create table if not exists private.fl_admin_accounts (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  pw_hash      text not null,
  token        text unique not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 1a. fl_admin_login — email + password → returns token or raises exception
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_login(
  p_email    text,
  p_password text
) returns text
language plpgsql security definer set search_path = public, private
as $$
declare
  v_row private.fl_admin_accounts;
begin
  select * into v_row
  from private.fl_admin_accounts
  where lower(email) = lower(trim(p_email));

  if not found then
    raise exception 'invalid_credentials';
  end if;

  if v_row.pw_hash <> crypt(p_password, v_row.pw_hash) then
    raise exception 'invalid_credentials';
  end if;

  return v_row.token;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1b. fl_admin_whoami — token → email (for header display)
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_whoami(
  p_token text
) returns text
language plpgsql security definer set search_path = public, private
as $$
declare
  v_email text;
begin
  if not fl_is_admin(p_token) then return null; end if;

  select email into v_email
  from private.fl_admin_accounts
  where token = p_token;

  return v_email;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1c. fl_admin_set_password — change own password
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_set_password(
  p_token   text,
  p_current text,
  p_new     text
) returns void
language plpgsql security definer set search_path = public, private
as $$
declare
  v_row private.fl_admin_accounts;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;

  select * into v_row
  from private.fl_admin_accounts
  where token = p_token;

  if not found then raise exception 'account_not_found'; end if;

  if v_row.pw_hash <> crypt(p_current, v_row.pw_hash) then
    raise exception 'wrong_current_password';
  end if;

  if char_length(p_new) < 8 then raise exception 'password_too_short'; end if;

  update private.fl_admin_accounts
  set pw_hash = crypt(p_new, gen_salt('bf'))
  where token = p_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1d. fl_admin_set_email — change own email
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_set_email(
  p_token     text,
  p_new_email text
) returns void
language plpgsql security definer set search_path = public, private
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;

  update private.fl_admin_accounts
  set email = lower(trim(p_new_email))
  where token = p_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Inbound email inbox
-- ---------------------------------------------------------------------------
create table if not exists public.fl_inbound_emails (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  from_email  text not null,
  from_name   text,
  to_email    text,
  subject     text,
  body_text   text,
  body_html   text,
  reply_to    text,
  thread_id   text,
  read        boolean not null default false,
  replied     boolean not null default false
);

alter table public.fl_inbound_emails enable row level security;

drop policy if exists "fl_inbound_emails_service" on public.fl_inbound_emails;
create policy "fl_inbound_emails_service"
  on public.fl_inbound_emails for all
  using (auth.role() = 'service_role');

-- fl_admin_emails — return all inbound emails newest first
create or replace function public.fl_admin_emails(
  p_token text
) returns setof public.fl_inbound_emails
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query
    select * from public.fl_inbound_emails order by created_at desc;
end;
$$;

-- fl_admin_mark_email_read — mark a single email read
create or replace function public.fl_admin_mark_email_read(
  p_token text,
  p_id    uuid
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  update public.fl_inbound_emails set read = true where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. H.O.M.E. property inquiries
-- ---------------------------------------------------------------------------
create table if not exists public.fl_home_inquiries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  property_id     text,
  property_title  text,
  from_name       text,
  from_email      text,
  from_phone      text,
  message         text,
  status          text not null default 'new'
);

alter table public.fl_home_inquiries enable row level security;

drop policy if exists "fl_home_inquiries_service" on public.fl_home_inquiries;
create policy "fl_home_inquiries_service"
  on public.fl_home_inquiries for all
  using (auth.role() = 'service_role');

-- Anonymous insert so visitors can submit inquiries
drop policy if exists "fl_home_inquiries_anon_insert" on public.fl_home_inquiries;
create policy "fl_home_inquiries_anon_insert"
  on public.fl_home_inquiries for insert
  to anon
  with check (true);

create or replace function public.fl_admin_home_inquiries(
  p_token text
) returns setof public.fl_home_inquiries
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query
    select * from public.fl_home_inquiries order by created_at desc;
end;
$$;

create or replace function public.fl_admin_home_inquiry_status(
  p_token  text,
  p_id     uuid,
  p_status text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  update public.fl_home_inquiries set status = p_status where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Standalone matter milestones (MattersTab — separate from CmsTab workflow)
-- These operate on fl_matters (the CRM pipeline), not fl_client_matters.
-- ---------------------------------------------------------------------------
create table if not exists public.fl_matter_notes (
  id              uuid primary key default gen_random_uuid(),
  matter_id       uuid not null references public.fl_matters(id) on delete cascade,
  title           text not null,
  description     text,
  status          text not null default 'pending',
  due_at          timestamptz,
  notify_client   boolean not null default false,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.fl_matter_notes enable row level security;

drop policy if exists "fl_matter_notes_service" on public.fl_matter_notes;
create policy "fl_matter_notes_service"
  on public.fl_matter_notes for all
  using (auth.role() = 'service_role');

create or replace function public.fl_admin_matter_milestones(
  p_token    text,
  p_matter_id uuid
) returns setof public.fl_matter_notes
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query
    select * from public.fl_matter_notes
    where matter_id = p_matter_id
    order by created_at asc;
end;
$$;

create or replace function public.fl_admin_upsert_milestone(
  p_token         text,
  p_matter_id     uuid,
  p_title         text,
  p_description   text    default null,
  p_status        text    default 'pending',
  p_due_date      text    default null,
  p_notify_client boolean default false,
  p_id            uuid    default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_due timestamptz;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;

  if p_due_date is not null and p_due_date <> '' then
    v_due := p_due_date::timestamptz;
  end if;

  if p_id is not null then
    update public.fl_matter_notes set
      title         = p_title,
      description   = p_description,
      status        = p_status,
      due_at        = v_due,
      notify_client = p_notify_client,
      completed_at  = case when p_status = 'done' and completed_at is null then now() else completed_at end,
      updated_at    = now()
    where id = p_id and matter_id = p_matter_id
    returning id into v_id;
  else
    insert into public.fl_matter_notes
      (matter_id, title, description, status, due_at, notify_client)
    values
      (p_matter_id, p_title, p_description, p_status, v_due, p_notify_client)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.fl_admin_delete_milestone(
  p_token text,
  p_id    uuid
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  delete from public.fl_matter_notes where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Blocked booking slots
-- ---------------------------------------------------------------------------
create table if not exists public.fl_blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null unique,
  created_at timestamptz not null default now()
);

alter table public.fl_blocked_slots enable row level security;

drop policy if exists "fl_blocked_slots_service" on public.fl_blocked_slots;
create policy "fl_blocked_slots_service"
  on public.fl_blocked_slots for all
  using (auth.role() = 'service_role');

create or replace function public.fl_admin_list_blocked_slots(
  p_token text
) returns table (id uuid, starts_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query
    select b.id, b.starts_at from public.fl_blocked_slots b
    order by b.starts_at asc;
end;
$$;

create or replace function public.fl_admin_block_slot(
  p_token    text,
  p_starts_at text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  insert into public.fl_blocked_slots (starts_at)
  values (p_starts_at::timestamptz)
  on conflict (starts_at) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.fl_admin_unblock_slot(
  p_token text,
  p_id    uuid
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  delete from public.fl_blocked_slots where id = p_id;
end;
$$;
