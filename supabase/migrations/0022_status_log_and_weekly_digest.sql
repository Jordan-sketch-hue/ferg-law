-- ============================================================
-- Weekly client digest support:
--   1. Log table capturing every milestone status change, so the
--      weekly digest can show "3 most recent status changes"
--      without spamming a real-time email per change.
--   2. RPC for staff to set/clear a milestone's due date (e.g. the
--      Agreement's Letter of Undertaking deadline) so the digest
--      can surface "X days remaining" alerts.
-- ============================================================

create table if not exists fl_milestone_status_log (
  id             uuid primary key default gen_random_uuid(),
  matter_id      uuid not null references fl_client_matters(id) on delete cascade,
  milestone_id   uuid not null references fl_matter_milestones(id) on delete cascade,
  phase_name     text not null,
  milestone_name text not null,
  old_status     text,
  new_status     text not null,
  changed_at     timestamptz not null default now()
);

create index if not exists fl_milestone_status_log_matter_idx on fl_milestone_status_log(matter_id, changed_at desc);

alter table fl_milestone_status_log enable row level security;

create policy "status_log_client_read" on fl_milestone_status_log for select
  using (exists (
    select 1 from fl_client_matters m
    where m.id = matter_id and m.client_id = auth.uid()
  ));

create policy "status_log_service" on fl_milestone_status_log for all
  using (auth.role() = 'service_role');

create or replace function fl_log_milestone_status_change()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into fl_milestone_status_log (matter_id, milestone_id, phase_name, milestone_name, old_status, new_status)
    values (new.matter_id, new.id, new.phase_name, new.name, old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists fl_matter_milestones_log_status on fl_matter_milestones;
create trigger fl_matter_milestones_log_status
  after update on fl_matter_milestones
  for each row execute function fl_log_milestone_status_change();

-- ── Staff RPC: set/clear a milestone's due date ────────────
create or replace function public.fl_admin_cms_set_milestone_due(
  p_token   text,
  p_id      uuid,
  p_due_at  timestamptz default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  update public.fl_matter_milestones
    set due_at = p_due_at
    where id = p_id;
end;
$$;

revoke all on function public.fl_admin_cms_set_milestone_due(text, uuid, timestamptz) from public;
grant execute on function public.fl_admin_cms_set_milestone_due(text, uuid, timestamptz) to anon, authenticated;
