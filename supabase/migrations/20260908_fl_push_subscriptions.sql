-- fl_push_subscriptions: stores Web Push subscriptions for Ferguson Law & H.O.M.E. PWAs
create table if not exists fl_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_role    text not null default 'public',
  user_ref     text,
  site         text not null default 'ferguson-law',
  last_used    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table fl_push_subscriptions enable row level security;

-- Only service role can read/write (push is server-side only)
create policy "service role full access" on fl_push_subscriptions
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
