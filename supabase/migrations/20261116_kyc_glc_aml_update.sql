-- GLC AML Guidance update (Nov 2026): add occupation, country_of_residence,
-- source_of_wealth, and purpose_of_transaction to fl_client_kyc
alter table public.fl_client_kyc
  add column if not exists occupation text,
  add column if not exists country_of_residence text,
  add column if not exists source_of_wealth text,
  add column if not exists purpose_of_transaction text;
