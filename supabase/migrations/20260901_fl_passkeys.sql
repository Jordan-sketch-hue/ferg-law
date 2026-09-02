-- fl_passkeys: stores WebAuthn/Passkey credentials for Ferguson Law users.
-- Raw biometric data never stored here. Only the cryptographic public key + credential ID.

create table if not exists public.fl_passkeys (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  user_email     text not null,
  credential_id  text not null unique,    -- base64url-encoded credential ID
  public_key     text not null,           -- base64-encoded COSE public key
  counter        bigint not null default 0,
  device_name    text default 'Passkey device',
  last_used_at   timestamptz,
  created_at     timestamptz default now()
);

create index if not exists fl_passkeys_user_email_idx on public.fl_passkeys(user_email);
create index if not exists fl_passkeys_user_id_idx    on public.fl_passkeys(user_id);

-- Only authenticated users can see their own passkeys; admin client handles writes.
alter table public.fl_passkeys enable row level security;

create policy "Users can view own passkeys"
  on public.fl_passkeys for select
  using (auth.uid() = user_id);

create policy "Users can delete own passkeys"
  on public.fl_passkeys for delete
  using (auth.uid() = user_id);
