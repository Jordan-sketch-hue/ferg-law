-- ============================================================================
-- 0012_ebook_purchases.sql — H.O.M.E. Buyers Guide payment gate
-- ============================================================================
-- Adds table to track ebook purchase receipts. Similar to the booking payment
-- flow, but for guide downloads. No complex state — just created_at, customer
-- email, amount paid, and status (pending/paid/free).

create table if not exists public.ebook_purchases (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  order_id        text unique not null,
  email           text not null,
  amount          numeric not null,
  currency        text not null default 'JMD',
  provider        text not null default 'wipay',
  provider_txn    text,
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed', 'free')),
  meta            jsonb not null default '{}'::jsonb
);

create index if not exists ebook_purchases_order_id_idx on public.ebook_purchases (order_id);
create index if not exists ebook_purchases_email_idx on public.ebook_purchases (email);

-- RLS: no anon policies. Access via SECURITY DEFINER functions or service-role only.
alter table public.ebook_purchases enable row level security;

-- ---------------------------------------------------------------------------
-- fl_check_ebook_access — read-only check: has this email paid for the guide?
-- ---------------------------------------------------------------------------
create or replace function public.fl_check_ebook_access(p_email text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists(
    select 1 from public.ebook_purchases
    where email = lower(p_email)
      and status = 'paid'
      and (meta->>'free' = 'false' or meta->>'free' is null)
  );
end;
$$;

grant execute on function public.fl_check_ebook_access(text) to anon, authenticated;
