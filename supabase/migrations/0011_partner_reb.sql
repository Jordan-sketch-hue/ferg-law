-- ============================================================================
-- 0011_partner_reb.sql — REB registration number for realtor partners
-- ----------------------------------------------------------------------------
-- Real estate agents in Jamaica carry a Real Estate Board (REB) registration
-- number (format S-XXXX, e.g. #S-0006). Add it as an optional field on the
-- partner profile and let it round-trip through the self-management RPC.
-- fl_partner_me + the public profile read both `select *`, so they pick it up
-- automatically once the column exists.
-- ============================================================================

alter table public.fl_partners
  add column if not exists reb_number text;

comment on column public.fl_partners.reb_number is
  'Real Estate Board (Jamaica) registration number for realtors, format S-XXXX (e.g. #S-0006)';

-- Re-create the self-update RPC with reb_number added to the whitelist.
create or replace function public.fl_partner_update(p_token uuid, p_patch jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare pid uuid := public.fl_partner_id(p_token);
begin
  update public.fl_partners set
    business_name = coalesce(p_patch->>'business_name', business_name),
    contact_name  = coalesce(p_patch->>'contact_name', contact_name),
    phone         = coalesce(p_patch->>'phone', phone),
    whatsapp      = coalesce(p_patch->>'whatsapp', whatsapp),
    website       = coalesce(p_patch->>'website', website),
    reb_number    = coalesce(p_patch->>'reb_number', reb_number),
    bio           = coalesce(p_patch->>'bio', bio),
    logo_url      = coalesce(p_patch->>'logo_url', logo_url),
    parishes      = coalesce(
                      case when p_patch ? 'parishes'
                        then array(select jsonb_array_elements_text(p_patch->'parishes')) end,
                      parishes)
  where id = pid;
end; $$;
