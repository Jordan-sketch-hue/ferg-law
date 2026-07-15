-- Add TRN (Tax Registration Number) to KYC — required for JA property transactions
alter table public.fl_client_kyc
  add column if not exists trn text;

-- Add phone number collected at signup to client matters linkage via auth metadata
-- (phone is stored in auth.users.raw_user_meta_data at signup; no schema change needed)
