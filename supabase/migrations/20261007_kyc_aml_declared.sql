-- Add aml_declared column to fl_client_kyc
-- Required for AML declaration checkbox on KYC form
alter table public.fl_client_kyc
  add column if not exists aml_declared boolean not null default false;
