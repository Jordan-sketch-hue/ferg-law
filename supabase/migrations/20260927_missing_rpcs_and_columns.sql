-- ============================================================
-- Ferguson Law — Missing columns + RPCs (2026-09-27)
-- Fixes:
--   1. fl_inbound_emails: add email_id, is_spam columns
--   2. fl_matter_files: add read_at column
--   3. fl_recycle_bin table + RPCs
--   4. fl_tester_feedback table + fl_admin_test_feedback RPC
--   5. fl_admin_cms_activity RPC
--   6. fl_admin_cms_mark_files_read RPC
--   7. fl_admin_cms_kyc_admin_override RPC
--   8. fl_admin_workflow_* RPCs
--   9. fl_admin_cms_unread_counts RPC (referenced but never defined)
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. fl_inbound_emails — add email_id, is_spam (may already exist in prod)
-- ---------------------------------------------------------------------------
alter table public.fl_inbound_emails
  add column if not exists email_id  text,
  add column if not exists is_spam   boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. fl_matter_files — add read_at (may already exist in prod)
-- ---------------------------------------------------------------------------
alter table public.fl_matter_files
  add column if not exists read_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. fl_recycle_bin — soft-delete store for H.O.M.E. inquiries + any record
-- ---------------------------------------------------------------------------
create table if not exists public.fl_recycle_bin (
  id           uuid        primary key default gen_random_uuid(),
  source_table text        not null,
  source_id    uuid        not null,
  label        text,
  record_data  jsonb       not null default '{}',
  deleted_at   timestamptz not null default now()
);

alter table public.fl_recycle_bin enable row level security;

drop policy if exists "fl_recycle_bin_service" on public.fl_recycle_bin;
create policy "fl_recycle_bin_service"
  on public.fl_recycle_bin for all
  using (auth.role() = 'service_role');

-- fl_admin_get_recycle_bin
create or replace function public.fl_admin_get_recycle_bin(p_token text)
returns table (
  id           uuid,
  source_table text,
  source_id    uuid,
  label        text,
  record_data  jsonb,
  deleted_at   timestamptz,
  days_left    int
)
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query
    select
      b.id, b.source_table, b.source_id, b.label, b.record_data, b.deleted_at,
      greatest(0, 30 - extract(day from now() - b.deleted_at)::int) as days_left
    from fl_recycle_bin b
    order by b.deleted_at desc;
end;
$$;

-- fl_admin_restore_from_bin
create or replace function public.fl_admin_restore_from_bin(p_token text, p_bin_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_row fl_recycle_bin;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  select * into v_row from fl_recycle_bin where id = p_bin_id;
  if not found then raise exception 'bin item not found'; end if;

  -- Restore based on source_table
  if v_row.source_table = 'fl_home_inquiries' then
    update fl_home_inquiries set status = 'new'
    where id = v_row.source_id;
  end if;
  -- Generic: remove from bin
  delete from fl_recycle_bin where id = p_bin_id;
end;
$$;

-- fl_admin_purge_from_bin
create or replace function public.fl_admin_purge_from_bin(p_token text, p_bin_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  delete from fl_recycle_bin where id = p_bin_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. fl_tester_feedback table + fl_admin_test_feedback RPC
-- ---------------------------------------------------------------------------
create table if not exists public.fl_tester_feedback (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  tester_name   text        not null,
  tester_role   text,
  persona       text,
  site_tested   text,
  device_type   text,
  rating        int         not null default 3 check (rating between 1 and 5),
  what_worked   text,
  what_didnt    text,
  suggestions   text,
  would_use     boolean
);

alter table public.fl_tester_feedback enable row level security;

drop policy if exists "fl_tester_feedback_anon_insert" on public.fl_tester_feedback;
create policy "fl_tester_feedback_anon_insert"
  on public.fl_tester_feedback for insert
  with check (true);

drop policy if exists "fl_tester_feedback_service" on public.fl_tester_feedback;
create policy "fl_tester_feedback_service"
  on public.fl_tester_feedback for all
  using (auth.role() = 'service_role');

create or replace function public.fl_admin_test_feedback(p_token text)
returns setof public.fl_tester_feedback
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query select * from fl_tester_feedback order by created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. fl_admin_cms_activity — recent message/file activity across all matters
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_activity(p_token text)
returns table (
  activity_id  uuid,
  matter_id    uuid,
  matter_title text,
  client_name  text,
  kind         text,
  body         text,
  created_at   timestamptz,
  read_at      timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query
    -- Messages from clients
    select
      msg.id          as activity_id,
      msg.matter_id,
      m.title         as matter_title,
      coalesce(p.full_name, p.email, 'Client') as client_name,
      'message'::text as kind,
      msg.body,
      msg.created_at,
      msg.read_at
    from fl_matter_messages msg
    join fl_client_matters m on m.id = msg.matter_id
    left join fl_client_profiles p on p.user_id = m.client_id
    where msg.sender_type = 'client'
    union all
    -- Files uploaded by clients
    select
      f.id            as activity_id,
      f.matter_id,
      m.title         as matter_title,
      coalesce(p.full_name, p.email, 'Client') as client_name,
      'file'::text    as kind,
      f.file_name     as body,
      f.created_at,
      f.read_at
    from fl_matter_files f
    join fl_client_matters m on m.id = f.matter_id
    left join fl_client_profiles p on p.user_id = m.client_id
    where f.uploader_type = 'client'
    order by created_at desc
    limit 50;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. fl_admin_cms_mark_files_read — mark all client-uploaded files as read
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_mark_files_read(p_token text, p_matter_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  update fl_matter_files
  set read_at = now()
  where matter_id = p_matter_id
    and uploader_type = 'client'
    and read_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. fl_admin_cms_kyc_admin_override — admin-approve KYC for a matter
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_kyc_admin_override(
  p_token     text,
  p_matter_id uuid,
  p_status    text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_client_id uuid;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  if p_status not in ('pending','submitted','approved','flagged') then
    raise exception 'invalid status';
  end if;

  -- Update matter kyc_status
  update fl_client_matters
  set kyc_status = p_status
  where id = p_matter_id
  returning client_id into v_client_id;

  -- Also update client KYC record if it exists
  if v_client_id is not null then
    update fl_client_kyc
    set status = p_status,
        reviewed_at = now(),
        reviewer_notes = 'Admin override'
    where client_id = v_client_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. fl_admin_workflow_* RPCs — JSONB phase/step management
-- ---------------------------------------------------------------------------

-- Get all templates
create or replace function public.fl_admin_workflow_templates_get(p_token text)
returns setof public.fl_workflow_templates
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query select * from fl_workflow_templates order by name;
end;
$$;

-- Add a new phase to a template
create or replace function public.fl_admin_workflow_add_phase(
  p_token       text,
  p_template_id uuid,
  p_phase_name  text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_phases     jsonb;
  v_new_order  int;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  select phases into v_phases from fl_workflow_templates where id = p_template_id;
  if not found then raise exception 'template not found'; end if;
  v_new_order := jsonb_array_length(v_phases) + 1;
  update fl_workflow_templates
  set phases = phases || jsonb_build_array(jsonb_build_object(
    'order', v_new_order,
    'name', p_phase_name,
    'milestones', '[]'::jsonb
  ))
  where id = p_template_id;
end;
$$;

-- Add a step (milestone) to an existing phase
create or replace function public.fl_admin_workflow_add_step(
  p_token        text,
  p_template_id  uuid,
  p_phase_order  int,
  p_step_name    text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_phases    jsonb;
  v_result    jsonb := '[]'::jsonb;
  v_phase     jsonb;
  v_idx       int;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  select phases into v_phases from fl_workflow_templates where id = p_template_id;
  if not found then raise exception 'template not found'; end if;

  for v_idx in 0 .. jsonb_array_length(v_phases) - 1 loop
    v_phase := v_phases -> v_idx;
    if (v_phase ->> 'order')::int = p_phase_order then
      v_phase := jsonb_set(
        v_phase,
        '{milestones}',
        coalesce(v_phase -> 'milestones', '[]'::jsonb) || jsonb_build_array(p_step_name)
      );
    end if;
    v_result := v_result || jsonb_build_array(v_phase);
  end loop;

  update fl_workflow_templates set phases = v_result where id = p_template_id;
end;
$$;

-- Remove a step (milestone) from a phase by index
create or replace function public.fl_admin_workflow_remove_step(
  p_token        text,
  p_template_id  uuid,
  p_phase_order  int,
  p_step_index   int
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_phases      jsonb;
  v_result      jsonb := '[]'::jsonb;
  v_phase       jsonb;
  v_milestones  jsonb;
  v_new_ms      jsonb := '[]'::jsonb;
  v_mi          int;
  v_idx         int;
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  select phases into v_phases from fl_workflow_templates where id = p_template_id;
  if not found then raise exception 'template not found'; end if;

  for v_idx in 0 .. jsonb_array_length(v_phases) - 1 loop
    v_phase := v_phases -> v_idx;
    if (v_phase ->> 'order')::int = p_phase_order then
      v_milestones := coalesce(v_phase -> 'milestones', '[]'::jsonb);
      v_new_ms := '[]'::jsonb;
      for v_mi in 0 .. jsonb_array_length(v_milestones) - 1 loop
        if v_mi <> p_step_index then
          v_new_ms := v_new_ms || jsonb_build_array(v_milestones -> v_mi);
        end if;
      end loop;
      v_phase := jsonb_set(v_phase, '{milestones}', v_new_ms);
    end if;
    v_result := v_result || jsonb_build_array(v_phase);
  end loop;

  update fl_workflow_templates set phases = v_result where id = p_template_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. fl_admin_cms_unread_counts — per-matter unread message + file counts
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cms_unread_counts(p_token text)
returns table (matter_id uuid, unread_messages int, unread_files int)
language plpgsql security definer set search_path = public
as $$
begin
  if not fl_is_admin(p_token) then raise exception 'unauthorised'; end if;
  return query
    select
      m.id as matter_id,
      count(msg.id) filter (where msg.sender_type = 'client' and msg.read_at is null)::int as unread_messages,
      count(f.id)   filter (where f.uploader_type = 'client' and f.read_at is null)::int   as unread_files
    from fl_client_matters m
    left join fl_matter_messages msg on msg.matter_id = m.id
    left join fl_matter_files    f   on f.matter_id   = m.id
    group by m.id;
end;
$$;
