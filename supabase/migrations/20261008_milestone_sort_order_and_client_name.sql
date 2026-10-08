-- Add sort_order to fl_matter_milestones for stable ordering within a phase
ALTER TABLE public.fl_matter_milestones ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Backfill sort_order for existing rows
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY matter_id, phase_order ORDER BY created_at, id) - 1 AS rn
  FROM public.fl_matter_milestones
)
UPDATE public.fl_matter_milestones m SET sort_order = r.rn FROM ranked r WHERE m.id = r.id;

-- Fix fl_admin_cms_milestones to order by sort_order
CREATE OR REPLACE FUNCTION public.fl_admin_cms_milestones(p_token text, p_matter_id uuid)
RETURNS SETOF public.fl_matter_milestones
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  return query select * from public.fl_matter_milestones where matter_id = p_matter_id order by phase_order, sort_order, created_at;
end;
$$;

-- Fix fl_admin_cms_matters to resolve client name from fl_clients when client_id is null
CREATE OR REPLACE FUNCTION public.fl_admin_cms_matters(p_token text)
RETURNS TABLE(
  id uuid, client_id uuid, client_email text, client_name text,
  matter_type text, workflow_type text, current_phase int, status text,
  kyc_status text, title text, notes text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  return query
    select
      m.id, m.client_id,
      coalesce(u.email::text, m.client_email) as client_email,
      coalesce(
        u.raw_user_meta_data->>'full_name',
        split_part(u.email::text, '@', 1),
        c.name,
        m.client_name,
        m.client_email,
        '[no account]'
      ) as client_name,
      m.matter_type, m.workflow_type, m.current_phase, m.status, m.kyc_status,
      m.title, m.notes, m.created_at
    from public.fl_client_matters m
    left join auth.users u on u.id = m.client_id
    left join public.fl_clients c on c.email = lower(m.client_email) and m.client_id is null
    order by m.created_at desc
    limit 500;
end;
$$;

-- Fix fl_open_matter to set sort_order per milestone position in template array
CREATE OR REPLACE FUNCTION public.fl_open_matter(
  p_client_id uuid,
  p_workflow_type text,
  p_title text DEFAULT NULL,
  p_client_name text DEFAULT NULL,
  p_client_email text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
declare
  v_matter_id uuid;
  v_phase     jsonb;
  v_milestone text;
  v_phases    jsonb;
  v_order     int;
  v_ms_idx    int;
begin
  insert into fl_client_matters (client_id, matter_type, workflow_type, title, status, client_name, client_email)
  values (
    p_client_id,
    case when p_workflow_type = 'property_purchase' then 'buying'
         when p_workflow_type = 'property_sale'     then 'selling'
         else 'other' end,
    p_workflow_type, p_title, 'intake', p_client_name, p_client_email
  )
  returning id into v_matter_id;

  select phases into v_phases from fl_workflow_templates where type = p_workflow_type;

  if v_phases is not null then
    for v_phase in select * from jsonb_array_elements(v_phases) loop
      v_order := (v_phase->>'order')::int;
      v_ms_idx := 0;
      for v_milestone in select jsonb_array_elements_text(v_phase->'milestones') loop
        insert into fl_matter_milestones (matter_id, phase_order, phase_name, name, status, sort_order)
        values (v_matter_id, v_order, v_phase->>'name', v_milestone, 'pending', v_ms_idx);
        v_ms_idx := v_ms_idx + 1;
      end loop;
    end loop;
  end if;

  return v_matter_id;
end;
$$;
