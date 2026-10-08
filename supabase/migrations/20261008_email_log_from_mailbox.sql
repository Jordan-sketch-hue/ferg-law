-- 20261008_email_log_from_mailbox.sql
-- Add from_mailbox to fl_email_log so the admin sent-box can be filtered
-- by which mailbox (contact@ vs owen@) dispatched each email.
-- All existing rows default to 'contact' since that's the only FROM address used.

alter table public.fl_email_log
  add column if not exists from_mailbox text not null default 'contact';
