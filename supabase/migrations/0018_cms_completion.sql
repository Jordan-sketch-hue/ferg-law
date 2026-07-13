-- ============================================================================
-- 0018_cms_completion.sql — Case Management System: finish what 0017 started
-- ----------------------------------------------------------------------------
-- 0017_cms.sql created the schema (fl_client_matters workflow columns,
-- fl_client_kyc, fl_matter_milestones, fl_matter_messages, fl_matter_files,
-- fl_workflow_templates, fl_open_matter) and the ADMIN UI (CmsTab in
-- AdminDashboard.tsx) was built against it — but the admin-side RPCs it calls
-- (fl_admin_cms_*) were never written, so the whole "Case Management" admin
-- tab has been throwing on every load. This migration:
--   1. Adds every fl_admin_cms_* RPC the admin UI already calls.
--   2. Adds a client search RPC (replaces raw-UUID paste with an email lookup).
--   3. Adds KYC review RPCs (admin approve/flag a submitted KYC record).
--   4. Adds staff file upload + notification-preference + payment/receipt
--      tables and RPCs (onboarding/DD/KYC + payment confirmation + receipt
--      issuance, per the brief).
--   5. Creates the fl-matter-files storage bucket + policies (the client
--      portal already uploads to it — the bucket itself was never created).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Storage bucket for matter file uploads
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fl-matter-files', 'fl-matter-files', true)
on conflict (id) do nothing;

drop policy if exists "fl_matter_files_authenticated_insert" on storage.objects;
create policy "fl_matter_files_authenticated_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fl-matter-files');

drop policy if exists "fl_matter_files_public_read" on storage.objects;
create policy "fl_matter_files_public_read"
  on storage.objects for select
  using (bucket_id = 'fl-matter-files');

-- ---------------------------------------------------------------------------
-- 2. Client notification preferences (email always available via auth.users;
--    WhatsApp requires a phone number the client opts to provide)
-- ---------------------------------------------------------------------------
create table if not exists public.fl_client_contacts (
  client_id        uuid primary key references auth.users(id) on delete cascade,
  phone            text,
  notify_email     boolean not null default true,
  notify_whatsapp  boolean not null default false,
  updated_at       timestamptz not null default now()
);

alter table public.fl_client_contacts enable row level security;

drop policy if exists "contact_own_all" on public.fl_client_contacts;
create policy "contact_own_all"
  on public.fl_client_contacts for all
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

drop policy if exists "contact_service" on public.fl_client_contacts;
create policy "contact_service"
  on public.fl_client_contacts for all
  using (auth.role() = 'service_role');

create trigger fl_client_contacts_updated
  before update on public.fl_client_contacts
  for each row execute function public.fl_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Matter payments — one row per payment event, tied to a matter and
--    (optionally) a milestone. Confirming a payment is a distinct step from
--    recording it, and issuing a receipt is a distinct step from confirming —
--    each is an explicit admin action so nothing is auto-assumed paid.
-- ---------------------------------------------------------------------------
create sequence if not exists public.fl_receipt_seq;

create table if not exists public.fl_matter_payments (
  id               uuid primary key default gen_random_uuid(),
  matter_id        uuid not null references public.fl_client_matters(id) on delete cascade,
  milestone_id     uuid references public.fl_matter_milestones(id) on delete set null,
  kind             text not null check (kind in ('deposit','balance','fee','disbursement','other')),
  direction        text not null default 'in' check (direction in ('in','out')),
  amount_jmd       numeric not null,
  method           text check (method in ('wipay','bank_transfer','cash','cheque','other')),
  reference        text,
  status           text not null default 'pending' check (status in ('pending','confirmed','failed')),
  confirmed_at     timestamptz,
  receipt_issued   boolean not null default false,
  receipt_number   text,
  receipt_issued_at timestamptz,
  notes            text,
  created_at       timestamptz not null default now()
);

alter table public.fl_matter_payments enable row level security;
-- No anon/authenticated policies — all access via SECURITY DEFINER RPCs below.

create index if not exists fl_matter_payments_matter_id_idx on public.fl_matter_payments (matter_id);

-- ===========================================================================
-- ADMIN RPCs — every one gated by fl_is_admin(p_token), matching the
-- convention used throughout 0004/0005/0006/0009/0013.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- fl_admin_cms_matters — all CMS matters with client name/email joined in.
-- ---------------------------------------------------------------------------
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
      m.id, m.client_id, u.email::text,
      coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
      m.matter_type, m.workflow_type, m.current_phase, m.status, m.kyc_status,
      m.title, m.notes, m.created_at
    from public.fl_client_matters m
    join auth.users u on u.id = m.client_id
    order by m.created_at desc
    limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_milestones / fl_admin_cms_messages / fl_admin_cms_files
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_milestones(p_token text, p_matter_id uuid)
returns setof public.fl_matter_milestones
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
    select * from public.fl_matter_milestones
    where matter_id = p_matter_id
    order by phase_order, created_at;
end;
$$;

create or replace function public.fl_admin_cms_messages(p_token text, p_matter_id uuid)
returns setof public.fl_matter_messages
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  -- mark client messages as read the moment staff opens the thread
  update public.fl_matter_messages
    set read_at = now()
    where matter_id = p_matter_id and sender_type = 'client' and read_at is null;
  return query
    select * from public.fl_matter_messages
    where matter_id = p_matter_id
    order by created_at;
end;
$$;

create or replace function public.fl_admin_cms_files(p_token text, p_matter_id uuid)
returns setof public.fl_matter_files
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
    select * from public.fl_matter_files
    where matter_id = p_matter_id
    order by created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_update_milestone — flips a milestone's status. When a phase's
-- final milestone is marked done, the NEXT phase's first-pending milestone is
-- auto-promoted to in_progress (the "trigger" the brief asks for: completing
-- a phase unlocks the next one without a human re-checking every row).
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_update_milestone(
  p_token  text,
  p_id     uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matter_id uuid;
  v_phase     int;
  v_remaining int;
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  update public.fl_matter_milestones
    set status = p_status,
        completed_at = case when p_status = 'done' then now() else completed_at end
    where id = p_id
    returning matter_id, phase_order into v_matter_id, v_phase;

  if p_status = 'done' then
    select count(*) into v_remaining
      from public.fl_matter_milestones
      where matter_id = v_matter_id and phase_order = v_phase and status <> 'done';

    if v_remaining = 0 then
      update public.fl_matter_milestones
        set status = 'in_progress'
        where id = (
          select id from public.fl_matter_milestones
          where matter_id = v_matter_id and phase_order = v_phase + 1 and status = 'pending'
          order by created_at limit 1
        );
      update public.fl_client_matters
        set current_phase = v_phase + 1
        where id = v_matter_id and current_phase = v_phase;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_update_matter_status
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_update_matter_status(
  p_token     text,
  p_matter_id uuid,
  p_status    text
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
  update public.fl_client_matters set status = p_status where id = p_matter_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_send_message — staff reply into the 2-way thread.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_send_message(
  p_token     text,
  p_matter_id uuid,
  p_body      text,
  p_label     text default 'Ferguson Law'
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
  insert into public.fl_matter_messages (matter_id, sender_type, sender_label, body)
  values (p_matter_id, 'staff', p_label, p_body)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_upload_file — staff-side file record (the actual bytes are
-- uploaded via the service-role API route, which then calls this to log it).
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_upload_file(
  p_token     text,
  p_matter_id uuid,
  p_file_name text,
  p_file_url  text,
  p_file_size int,
  p_mime_type text
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
  insert into public.fl_matter_files (matter_id, uploader_type, file_name, file_url, file_size, mime_type)
  values (p_matter_id, 'staff', p_file_name, p_file_url, p_file_size, p_mime_type)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_open_matter — token-gated wrapper around fl_open_matter.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_open_matter(
  p_token        text,
  p_client_id    uuid,
  p_workflow_type text,
  p_title        text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  return public.fl_open_matter(p_client_id, p_workflow_type, p_title);
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_client_search — email lookup so admin never has to paste a
-- raw UUID to open a matter. Searches auth.users by email substring.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_client_search(p_token text, p_query text)
returns table (id uuid, email text, full_name text)
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
    select u.id, u.email::text, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
    from auth.users u
    where u.email ilike '%' || p_query || '%'
    order by u.created_at desc
    limit 20;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_kyc_get — fetch a client's KYC/AML submission for review.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_kyc_get(p_token text, p_client_id uuid)
returns setof public.fl_client_kyc
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  return query select * from public.fl_client_kyc where client_id = p_client_id order by created_at desc limit 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_admin_cms_kyc_review — approve or flag a KYC submission. Keeps every
-- matter belonging to that client in sync (kyc_status is checked per-matter
-- in the UI, but the underlying compliance record is per-client).
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_kyc_review(
  p_token   text,
  p_kyc_id  uuid,
  p_status  text,
  p_notes   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  if p_status not in ('approved','flagged') then
    raise exception 'invalid kyc status: %', p_status;
  end if;

  update public.fl_client_kyc
    set status = p_status, reviewer_notes = p_notes, reviewed_at = now()
    where id = p_kyc_id
    returning client_id into v_client_id;

  update public.fl_client_matters
    set kyc_status = p_status
    where client_id = v_client_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fl_client_contacts (admin read) — so the admin UI can show/opt whether the
-- client wants WhatsApp updates before the notify dispatcher sends one.
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_client_contact(p_token text, p_client_id uuid)
returns setof public.fl_client_contacts
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  return query select * from public.fl_client_contacts where client_id = p_client_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payments: list / record / confirm / issue receipt
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_payments(p_token text, p_matter_id uuid)
returns setof public.fl_matter_payments
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  return query select * from public.fl_matter_payments where matter_id = p_matter_id order by created_at desc;
end;
$$;

create or replace function public.fl_admin_cms_add_payment(
  p_token      text,
  p_matter_id  uuid,
  p_kind       text,
  p_amount_jmd numeric,
  p_method     text default null,
  p_reference  text default null,
  p_notes      text default null,
  p_milestone_id uuid default null
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
  insert into public.fl_matter_payments (matter_id, milestone_id, kind, amount_jmd, method, reference, notes)
  values (p_matter_id, p_milestone_id, p_kind, p_amount_jmd, p_method, p_reference, p_notes)
  returning id into v_id;
  return v_id;
end;
$$;

-- Confirming a payment does NOT auto-issue a receipt — that is a distinct,
-- explicit admin action (fl_admin_cms_issue_receipt) so a formal receipt is
-- never sent before staff has actually verified the funds landed.
create or replace function public.fl_admin_cms_confirm_payment(p_token text, p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;
  update public.fl_matter_payments
    set status = 'confirmed', confirmed_at = now()
    where id = p_payment_id;
end;
$$;

create or replace function public.fl_admin_cms_issue_receipt(p_token text, p_payment_id uuid)
returns table (receipt_number text, amount_jmd numeric, matter_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  v_number := 'FL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.fl_receipt_seq')::text, 4, '0');

  update public.fl_matter_payments p
    set receipt_issued = true, receipt_number = v_number, receipt_issued_at = now()
    where p.id = p_payment_id and p.status = 'confirmed'
    returning v_number, p.amount_jmd, p.matter_id into receipt_number, amount_jmd, matter_id;

  if receipt_number is null then
    raise exception 'payment must be confirmed before a receipt can be issued';
  end if;

  return next;
end;
$$;

-- ===========================================================================
-- Grants — all fl_admin_cms_* are anon-callable at the Postgres level (the
-- fl_is_admin(p_token) check inside is the real gate, matching 0005/0006/0009).
-- ===========================================================================
revoke all on function public.fl_admin_cms_matters(text)                                       from public;
revoke all on function public.fl_admin_cms_milestones(text, uuid)                               from public;
revoke all on function public.fl_admin_cms_messages(text, uuid)                                 from public;
revoke all on function public.fl_admin_cms_files(text, uuid)                                    from public;
revoke all on function public.fl_admin_cms_update_milestone(text, uuid, text)                   from public;
revoke all on function public.fl_admin_cms_update_matter_status(text, uuid, text)                from public;
revoke all on function public.fl_admin_cms_send_message(text, uuid, text, text)                  from public;
revoke all on function public.fl_admin_cms_upload_file(text, uuid, text, text, int, text)        from public;
revoke all on function public.fl_admin_cms_open_matter(text, uuid, text, text)                   from public;
revoke all on function public.fl_admin_cms_client_search(text, text)                             from public;
revoke all on function public.fl_admin_cms_kyc_get(text, uuid)                                   from public;
revoke all on function public.fl_admin_cms_kyc_review(text, uuid, text, text)                    from public;
revoke all on function public.fl_admin_cms_client_contact(text, uuid)                             from public;
revoke all on function public.fl_admin_cms_payments(text, uuid)                                  from public;
revoke all on function public.fl_admin_cms_add_payment(text, uuid, text, numeric, text, text, text, uuid) from public;
revoke all on function public.fl_admin_cms_confirm_payment(text, uuid)                            from public;
revoke all on function public.fl_admin_cms_issue_receipt(text, uuid)                              from public;

grant execute on function public.fl_admin_cms_matters(text)                                       to anon, authenticated;
grant execute on function public.fl_admin_cms_milestones(text, uuid)                               to anon, authenticated;
grant execute on function public.fl_admin_cms_messages(text, uuid)                                 to anon, authenticated;
grant execute on function public.fl_admin_cms_files(text, uuid)                                    to anon, authenticated;
grant execute on function public.fl_admin_cms_update_milestone(text, uuid, text)                   to anon, authenticated;
grant execute on function public.fl_admin_cms_update_matter_status(text, uuid, text)                to anon, authenticated;
grant execute on function public.fl_admin_cms_send_message(text, uuid, text, text)                  to anon, authenticated;
grant execute on function public.fl_admin_cms_upload_file(text, uuid, text, text, int, text)        to anon, authenticated;
grant execute on function public.fl_admin_cms_open_matter(text, uuid, text, text)                   to anon, authenticated;
grant execute on function public.fl_admin_cms_client_search(text, text)                             to anon, authenticated;
grant execute on function public.fl_admin_cms_kyc_get(text, uuid)                                   to anon, authenticated;
grant execute on function public.fl_admin_cms_kyc_review(text, uuid, text, text)                    to anon, authenticated;
grant execute on function public.fl_admin_cms_client_contact(text, uuid)                             to anon, authenticated;
grant execute on function public.fl_admin_cms_payments(text, uuid)                                  to anon, authenticated;
grant execute on function public.fl_admin_cms_add_payment(text, uuid, text, numeric, text, text, text, uuid) to anon, authenticated;
grant execute on function public.fl_admin_cms_confirm_payment(text, uuid)                            to anon, authenticated;
grant execute on function public.fl_admin_cms_issue_receipt(text, uuid)                              to anon, authenticated;
