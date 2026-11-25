-- GLC AML KYC v2 (Nov 25 2026)
-- Adds fields required by General Legal Council AML guidance update
-- Individual: previous name, employer, mailing address, phones, transaction value, funds origin, third-party, beneficial ownership declaration
-- Entity: mailing address, phone, principal contact JSONB

alter table public.fl_client_kyc
  add column if not exists previous_name text,
  add column if not exists employer text,
  add column if not exists mailing_address text,
  add column if not exists phone_1 text,
  add column if not exists phone_2 text,
  add column if not exists estimated_transaction_value text,
  add column if not exists funds_country_origin text,
  add column if not exists third_party_name text,
  add column if not exists third_party_relationship text,
  add column if not exists third_party_reason text,
  add column if not exists beneficial_own_declaration text
    check (beneficial_own_declaration in ('self','other')),
  add column if not exists entity_mailing_address text,
  add column if not exists entity_phone text,
  add column if not exists entity_principal_contact jsonb;