-- ============================================================================
-- 0028_email_log_full_body.sql — stop truncating sent emails to 300 chars
-- ----------------------------------------------------------------------------
-- fl_email_log.body_preview was always capped at 300 characters for the list
-- row summaries, but the Sent-email detail view in the admin Email tab was
-- rendering that same truncated field, so opening a sent email showed it cut
-- off mid-sentence. body_preview stays as-is for list rows; body_full holds
-- the untruncated text for the detail view.
-- ============================================================================

alter table public.fl_email_log add column if not exists body_full text;
