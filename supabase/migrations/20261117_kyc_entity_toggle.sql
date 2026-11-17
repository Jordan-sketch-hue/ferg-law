-- KYC Entity/Individual toggle (Nov 2026)
-- Adds entity fields and ID expiry to fl_client_kyc per FATF / POCA 2007

alter table public.fl_client_kyc
  -- type discriminator
  add column if not exists kyc_type text not null default 'individual'
    check (kyc_type in ('individual','entity')),

  -- Enhanced individual fields
  add column if not exists id_expiry_date date,
  add column if not exists id2_type text,
  add column if not exists id2_number text,
  add column if not exists id2_expiry_date date,
  add column if not exists id2_doc_url text,

  -- Entity — registration
  add column if not exists entity_name text,
  add column if not exists entity_type text,
  add column if not exists entity_registration_number text,
  add column if not exists entity_date_of_incorporation date,
  add column if not exists entity_country_of_incorporation text,
  add column if not exists entity_registered_address text,
  add column if not exists entity_principal_address text,
  add column if not exists entity_nature_of_business text,
  add column if not exists entity_trn text,
  add column if not exists entity_resolution_url text,
  add column if not exists entity_directors jsonb,
  add column if not exists entity_beneficial_owners jsonb,
  add column if not exists entity_authorised_signatories jsonb,
  add column if not exists entity_has_pep_director boolean,
  add column if not exists entity_pep_details text;

create index if not exists fl_client_kyc_type_idx on public.fl_client_kyc (kyc_type);
