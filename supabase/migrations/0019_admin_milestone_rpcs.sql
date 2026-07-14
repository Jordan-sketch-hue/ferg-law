-- Admin RPCs for case milestone tracking
-- fl_admin_matter_milestones, fl_admin_upsert_milestone, fl_admin_delete_milestone

-- ── 1. List milestones for a matter ────────────────────────────────────────
create or replace function public.fl_admin_matter_milestones(
  p_token     text,
  p_matter_id uuid
)
returns table (
  id           uuid,
  matter_id    uuid,
  title        text,
  description  text,
  status       text,
  due_date     text,
  completed_at text,
  notify_client boolean,
  created_at   text
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    m.id,
    m.matter_id,
    m.name                                       as title,
    m.notes                                      as description,
    case m.status
      when 'done' then 'completed'
      else m.status
    end                                          as status,
    to_char(m.due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as due_date,
    to_char(m.completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as completed_at,
    false                                        as notify_client,
    to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
  from fl_matter_milestones m
  where m.matter_id = p_matter_id
  order by m.phase_order, m.created_at;
end;
$$;

-- ── 2. Upsert a milestone (create or update) ───────────────────────────────
create or replace function public.fl_admin_upsert_milestone(
  p_token         text,
  p_matter_id     uuid,
  p_title         text,
  p_id            uuid      default null,
  p_description   text      default null,
  p_status        text      default 'pending',
  p_due_date      text      default null,
  p_notify_client boolean   default false
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_status  text;
  v_due_at  timestamptz;
  v_done_at timestamptz;
  v_result  uuid;
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  -- Map UI status → table status
  v_status := case p_status
    when 'completed' then 'done'
    when 'in_progress' then 'in_progress'
    when 'blocked' then 'blocked'
    else 'pending'
  end;

  v_due_at  := case when p_due_date is not null and p_due_date <> '' then p_due_date::timestamptz else null end;
  v_done_at := case when v_status = 'done' then now() else null end;

  if p_id is null then
    -- Insert new milestone (assign to a generic phase)
    insert into fl_matter_milestones (matter_id, phase_order, phase_name, name, status, due_at, completed_at, notes)
    values (p_matter_id, 99, 'Custom', p_title, v_status, v_due_at, v_done_at, p_description)
    returning id into v_result;
  else
    -- Update existing
    update fl_matter_milestones
    set
      name         = p_title,
      notes        = p_description,
      status       = v_status,
      due_at       = v_due_at,
      completed_at = coalesce(v_done_at, completed_at)
    where id = p_id and matter_id = p_matter_id;
    v_result := p_id;
  end if;

  return v_result;
end;
$$;

-- ── 3. Delete a milestone ──────────────────────────────────────────────────
create or replace function public.fl_admin_delete_milestone(
  p_token text,
  p_id    uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  delete from fl_matter_milestones where id = p_id;
end;
$$;
