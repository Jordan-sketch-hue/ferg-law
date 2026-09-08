-- ============================================================================
-- 0027_matter_status_cancelled.sql — add "cancelled" as a valid matter status
-- ----------------------------------------------------------------------------
-- Owen flagged (WhatsApp, 2026-09-03) that there was no way to close/cancel a
-- matter when a prospective client decides not to proceed — the status
-- dropdown in the CMS tab only offered active-workflow states.
-- ============================================================================

alter table public.fl_client_matters drop constraint fl_client_matters_status_check;
alter table public.fl_client_matters add constraint fl_client_matters_status_check
  check (status = any (array['intake','in_progress','awaiting_client','awaiting_third_party','completed','on_hold','cancelled']));
