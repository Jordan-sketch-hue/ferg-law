-- ============================================================================
-- 0007_payment_write_rpcs.sql — privileged payment writes via SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- The booking + payment-return routes run server-side but on the publishable
-- (anon) key (no service-role key is shipped anywhere). `payments` is
-- intentionally server-only (no anon policy) and `appointments` has no anon
-- SELECT/UPDATE. So the routes can't write the money state directly. These two
-- definer functions are the bridge (same pattern as taken_slots / fl_admin_*):
--   • fl_record_payment  — insert the pending/free payments audit row.
--   • fl_settle_payment  — atomically settle a checkout return (paid/failed):
--       flips payments + appointment + lead, and RETURNS the appointment detail
--       the route needs to send the confirmation email, plus a `newly_paid`
--       flag so re-hits never double-send.
-- OUT columns are r_*-prefixed to avoid name clashes with table columns inside
-- the body (a classic plpgsql OUT-param/column ambiguity trap).
-- ============================================================================

create or replace function public.fl_record_payment(
  p_order_id text,
  p_ref      text,
  p_amount   numeric,
  p_currency text,
  p_provider text,
  p_status   text,
  p_meta     jsonb
) returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  insert into public.payments (order_id, appointment_ref, amount, currency, provider, status, meta)
  values (
    p_order_id, p_ref, p_amount,
    coalesce(p_currency, 'JMD'),
    coalesce(p_provider, 'wipay'),
    coalesce(p_status, 'pending'),
    coalesce(p_meta, '{}'::jsonb)
  )
  on conflict (order_id) do nothing;
end;
$$;

create or replace function public.fl_settle_payment(
  p_order_id text,
  p_paid     boolean,
  p_txn      text
) returns table (
  r_ref     text,
  r_name    text,
  r_email   text,
  r_service text,
  r_starts  timestamptz,
  newly_paid boolean
)
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_ref  text;
  v_prev text;
begin
  select p.appointment_ref, p.status into v_ref, v_prev
  from public.payments p where p.order_id = p_order_id;
  if v_ref is null then v_ref := p_order_id; end if;

  if p_paid then
    if v_prev is distinct from 'paid' then
      update public.payments set status = 'paid', provider_txn = p_txn where order_id = p_order_id;
      update public.appointments set status = 'confirmed', payment_status = 'paid' where ref = v_ref;
      update public.ferguson_leads set status = 'contacted' where ref = v_ref;
      return query select a.ref, a.name, a.email, a.service, a.starts_at, true
                   from public.appointments a where a.ref = v_ref;
    else
      return query select a.ref, a.name, a.email, a.service, a.starts_at, false
                   from public.appointments a where a.ref = v_ref;
    end if;
  else
    update public.payments set status = 'failed' where order_id = p_order_id;
    update public.appointments set payment_status = 'unpaid' where ref = v_ref;
    return query select a.ref, a.name, a.email, a.service, a.starts_at, false
                 from public.appointments a where a.ref = v_ref;
  end if;
end;
$$;

revoke all on function public.fl_record_payment(text, text, numeric, text, text, text, jsonb) from public;
revoke all on function public.fl_settle_payment(text, boolean, text) from public;
grant execute on function public.fl_record_payment(text, text, numeric, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.fl_settle_payment(text, boolean, text) to anon, authenticated;
