-- ============================================================================
-- 0026_client_data_deletion.sql — audit trail for client data purges
-- ----------------------------------------------------------------------------
-- The actual deletion runs in application code (src/lib/client-purge.server.ts)
-- via the service-role client, because it has to touch Storage objects
-- (blocked from raw SQL by storage.protect_delete()) alongside the fl_* rows.
-- This table exists so that once a client's data is gone, there's still a
-- record of what was deleted, when, and who asked for it — since after the
-- purge runs there is nothing left in fl_clients/fl_client_matters/etc. to
-- reconstruct that from.
-- ============================================================================

create table if not exists public.fl_data_deletions (
  id            uuid primary key default gen_random_uuid(),
  client_email  text not null,
  client_id     uuid,
  requested_by  text not null check (requested_by in ('client', 'admin')),
  requested_by_label text,
  summary       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.fl_data_deletions enable row level security;
-- No anon/authenticated policies at all — written only by the service-role
-- client from the purge routes, read only via Supabase Studio / admin tooling.

create index if not exists fl_data_deletions_email_idx on public.fl_data_deletions (client_email);
create index if not exists fl_data_deletions_created_idx on public.fl_data_deletions (created_at desc);
