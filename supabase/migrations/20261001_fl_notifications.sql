-- ============================================================
-- Ferguson Law — Push & In-App Notification tables (2026-10-01)
-- Creates:
--   1. fl_notifications  — in-app notification feed
--   2. fl_notify_client  — RPC to insert a client notification
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. fl_notifications
-- ---------------------------------------------------------------------------
create table if not exists public.fl_notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_ref    text        not null,
  user_role   text        not null default 'client',
  site        text        not null default 'ferguson-law',
  event_type  text,
  title       text        not null,
  body        text,
  deep_link   text,
  icon        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists fl_notifications_user_ref_idx
  on public.fl_notifications (user_ref, site, created_at desc);

alter table public.fl_notifications enable row level security;

-- Service role has full access (all reads/writes are server-side via admin client)
drop policy if exists "fl_notifications_service" on public.fl_notifications;
create policy "fl_notifications_service"
  on public.fl_notifications for all
  using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 2. fl_notify_client RPC
--    Called by cms-notify.server.ts when a matter milestone is completed.
--    Inserts an in-app notification for the client.
-- ---------------------------------------------------------------------------
create or replace function public.fl_notify_client(
  p_user_id   uuid,
  p_matter_id uuid,
  p_title     text,
  p_body      text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into fl_notifications (
    user_ref,
    user_role,
    site,
    event_type,
    title,
    body,
    deep_link
  ) values (
    p_user_id::text,
    'client',
    'ferguson-law',
    'matter_update',
    p_title,
    p_body,
    '/dashboard/matters/' || p_matter_id::text
  );
end;
$$;
