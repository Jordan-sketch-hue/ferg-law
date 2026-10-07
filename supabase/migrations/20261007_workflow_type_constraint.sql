-- Fix workflow_type CHECK constraint on fl_client_matters to allow all 16 types.
-- The original 0017_cms.sql only allowed 3 values, causing new workflow types
-- like lease_agreement to silently fall back to 'general'.
-- Also fix fl_open_matter to generate a proper title from the workflow type.

-- 1. Drop old 3-value constraint, add new one with all 16 types + general
alter table public.fl_client_matters
  drop constraint if exists fl_client_matters_workflow_type_check;

alter table public.fl_client_matters
  add constraint fl_client_matters_workflow_type_check
  check (workflow_type in (
    'property_purchase',
    'property_sale',
    'lease_agreement',
    'title_search',
    'transfer',
    'power_of_attorney',
    'power_of_attorney_limited',
    'lost_title',
    'first_registration',
    'adverse_possession',
    'subdivision',
    'will_drafting',
    'probate',
    'letters_of_administration',
    'resealing',
    'transmission_of_title',
    'non_contentious_divorce',
    'general'
  ));

-- 2. Replace fl_open_matter to auto-generate a proper display title from workflow_type
--    instead of using the generic 'General Matter' fallback.
create or replace function public.fl_open_matter(
  p_client_id    uuid,
  p_workflow_type text,
  p_title        text default null
) returns uuid language plpgsql security definer as $$
declare
  v_matter_id uuid;
  v_phase     jsonb;
  v_milestone text;
  v_phases    jsonb;
  v_order     int;
  v_title     text;
begin
  -- Auto-generate title from workflow_type if not explicitly provided,
  -- or if caller passed the generic 'General Matter' placeholder.
  if p_title is null or trim(p_title) = '' or lower(trim(p_title)) = 'general matter' then
    v_title := case p_workflow_type
      when 'property_purchase'         then 'Property Purchase'
      when 'property_sale'             then 'Property Sale'
      when 'lease_agreement'           then 'Lease Agreement'
      when 'title_search'              then 'Title Search'
      when 'transfer'                  then 'Transfer'
      when 'power_of_attorney'         then 'Power of Attorney'
      when 'power_of_attorney_limited' then 'Limited Power of Attorney'
      when 'lost_title'                then 'Lost Title Application'
      when 'first_registration'        then 'First Registration'
      when 'adverse_possession'        then 'Adverse Possession'
      when 'subdivision'               then 'Subdivision'
      when 'will_drafting'             then 'Will Drafting'
      when 'probate'                   then 'Probate'
      when 'letters_of_administration' then 'Letters of Administration'
      when 'resealing'                 then 'Resealing of Probate'
      when 'transmission_of_title'     then 'Transmission of Title'
      when 'non_contentious_divorce'   then 'Non-Contentious Divorce'
      else 'General Matter'
    end;
  else
    v_title := p_title;
  end if;

  -- Fetch phases from workflow template
  select phases into v_phases
  from public.fl_workflow_templates
  where type = p_workflow_type;

  -- Insert matter record
  insert into public.fl_client_matters
    (client_id, workflow_type, title, current_phase)
  values
    (p_client_id, coalesce(p_workflow_type, 'general'), v_title, 1)
  returning id into v_matter_id;

  -- Seed milestones from template phases
  if v_phases is not null then
    v_order := 1;
    for v_phase in select * from jsonb_array_elements(v_phases) loop
      for v_milestone in select * from jsonb_array_elements_text(v_phase->'milestones') loop
        insert into public.fl_matter_milestones
          (matter_id, name, phase, phase_order, status)
        values
          (v_matter_id, v_milestone, (v_phase->>'order')::int, v_order, 'pending');
        v_order := v_order + 1;
      end loop;
    end loop;
  end if;

  return v_matter_id;
end;
$$;