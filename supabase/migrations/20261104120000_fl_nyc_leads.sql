create table if not exists fl_nyc_leads (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  email         text not null,
  phone         text,
  answers       jsonb,
  score         integer,
  segment       text check (segment in ('hot','warm','cold')),
  source        text default 'nyc2026-quiz',
  event         text default 'nyc2026',
  created_at    timestamptz default now(),
  unique (email, event)
);

alter table fl_nyc_leads enable row level security;

create policy "service role full access"
  on fl_nyc_leads
  for all
  using (true)
  with check (true);
