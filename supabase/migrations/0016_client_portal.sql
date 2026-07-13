-- Client portal: property buyers/sellers track their matter with Ferguson Law.
-- Clients authenticate via Supabase Auth (role = "client" in user_metadata).
-- `professional_id` is nullable — Ferguson Law assigns a partner after intake.

create table if not exists fl_client_matters (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references auth.users(id) on delete cascade,
  matter_type     text not null check (matter_type in ('buying','selling','other')),
  status          text not null default 'intake'
                  check (status in ('intake','in_progress','awaiting_client','awaiting_third_party','completed','on_hold')),
  title           text,
  notes           text,
  professional_id uuid references fl_partners(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Clients can only see their own matters
alter table fl_client_matters enable row level security;

create policy "client_own_matters"
  on fl_client_matters for select
  using (auth.uid() = client_id);

-- Only service role can insert/update matters (Ferguson Law staff via admin)
create policy "service_role_all"
  on fl_client_matters for all
  using (auth.role() = 'service_role');

-- Auto-update updated_at
create or replace function fl_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger fl_client_matters_updated
  before update on fl_client_matters
  for each row execute function fl_set_updated_at();
