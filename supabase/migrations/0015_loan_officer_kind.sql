-- Add loan_officer as a valid partner kind.
-- 1. Drop the old CHECK constraint on fl_partners.kind and add the updated one.
alter table public.fl_partners
  drop constraint if exists fl_partners_kind_check;

alter table public.fl_partners
  add constraint fl_partners_kind_check
  check (kind in ('realtor', 'loan_officer', 'valuator', 'surveyor'));

-- 2. Replace fl_partner_register so it accepts loan_officer.
create or replace function public.fl_partner_register(
  p_email text, p_password text, p_kind text, p_business_name text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  _uid  uuid;
  _hash text;
  _tok  text;
  sl    text;
begin
  if p_kind not in ('realtor','loan_officer','valuator','surveyor') then
    raise exception 'bad kind';
  end if;
  if exists (select 1 from fl_partner_accounts where email = lower(p_email)) then
    raise exception 'email exists';
  end if;
  _hash := crypt(p_password, gen_salt('bf'));
  -- build unique slug
  sl := lower(regexp_replace(p_business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  sl := trim(both '-' from sl);
  while exists (select 1 from fl_partners where slug = sl) loop
    sl := sl || '-' || floor(random()*9000+1000)::int;
  end loop;
  insert into public.fl_partners (kind, business_name, email, slug, status)
    values (p_kind, p_business_name, lower(p_email), sl, 'pending')
    returning id into _uid;
  insert into public.fl_partner_accounts (partner_id, email, pass_hash)
    values (_uid, lower(p_email), _hash);
  _tok := gen_random_uuid()::text;
  insert into public.fl_partner_sessions (partner_id, token)
    values (_uid, _tok);
  return _tok;
end;
$$;
