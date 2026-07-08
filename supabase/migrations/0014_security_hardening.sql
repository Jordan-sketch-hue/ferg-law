-- ============================================================================
-- 0014_security_hardening.sql
-- ----------------------------------------------------------------------------
-- Addresses findings from security audit 2026-07-06:
--   1. Scope chat_conversations anon SELECT — was using(true), now restricted
--      to active-agent rows only. Historical PII no longer mass-accessible.
--   2. Lock payment RPCs to service_role — fl_settle_payment and
--      fl_record_payment were anon-callable, enabling payment forgery.
--   3. Partial unique index on appointments(starts_at) — prevents double-
--      booking race condition where two concurrent requests claim the same slot.
--   4. Harden appointment INSERT policy — anon can only insert pending rows;
--      prevents phantom confirmed slots blocking the calendar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Chat conversations — restrict anon SELECT to agent-visible rows only.
--    The agent console only queries status IN ('waiting_agent','agent') so
--    this policy covers its real use-case while preventing a full PII dump.
--    Historical bot/closed conversations are no longer readable by anon.
--    All admin reads go through fl_admin_conversations (service definer).
-- ---------------------------------------------------------------------------
drop policy if exists "anon select conversations" on public.chat_conversations;
create policy "anon select active agent conversations"
  on public.chat_conversations for select to anon, authenticated
  using (status in ('waiting_agent', 'agent'));

-- ---------------------------------------------------------------------------
-- 2. Payment RPCs — revoke anon execute, grant to service_role only.
--    All payment flows already run through server-side API routes which
--    use createAdminClient() → these RPCs remain fully functional.
--    Anon access was the forgery vector — now closed.
-- ---------------------------------------------------------------------------
revoke execute on function public.fl_record_payment(text, text, numeric, text, text, text, jsonb) from anon, authenticated;
revoke execute on function public.fl_settle_payment(text, boolean, text) from anon, authenticated;
grant execute on function public.fl_record_payment(text, text, numeric, text, text, text, jsonb) to service_role;
grant execute on function public.fl_settle_payment(text, boolean, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Unique index on appointments(starts_at) — prevents double-booking.
--    Excludes cancelled rows so a rebooked cancelled slot works fine.
--    The second concurrent insert for the same slot will raise a unique
--    violation (23505), which the API route catches and returns 409.
-- ---------------------------------------------------------------------------
create unique index if not exists appointments_starts_at_no_cancel
  on public.appointments (starts_at)
  where status <> 'cancelled';

-- ---------------------------------------------------------------------------
-- 4. Tighten appointment INSERT policy — anon may only insert pending rows.
--    Prevents direct anon inserts with status='confirmed' from blocking
--    calendar slots permanently without going through the payment flow.
-- ---------------------------------------------------------------------------
drop policy if exists "anon insert appointments" on public.appointments;
create policy "anon insert appointments"
  on public.appointments for insert to anon, authenticated
  with check (status = 'pending');
