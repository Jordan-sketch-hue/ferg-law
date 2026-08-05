-- ============================================================================
-- 0023_fix_admin_open_matter.sql
-- Fix: fl_admin_cms_open_matter was missing p_client_name / p_client_email
-- params that the admin dashboard already sends. PostgREST failed to resolve
-- the overload, throwing "function not found" on every new-client setup.
--
-- New logic:
--   - If p_client_id is provided → use it directly (existing client)
--   - Else if p_client_email provided → look up auth.users by email
--   - If still no match → raise a clear error (do NOT auto-create users here)
--
-- DB: ciggiwpz (J Supreme Conglomerate / Ferguson Law) — ONLY this project.
-- ============================================================================

-- Drop old 4-param overload so the new signature can take its place.
drop function if exists public.fl_admin_cms_open_matter(text, uuid, text, text);

create or replace function public.fl_admin_cms_open_matter(
  p_token         text,
  p_client_id     uuid        default null,
  p_workflow_type text        default 'property_purchase',
  p_title         text        default null,
  p_client_name   text        default null,   -- informational only (for future use)
  p_client_email  text        default null    -- used to look up existing auth user
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := p_client_id;
begin
  if not public.fl_is_admin(p_token) then
    raise exception 'unauthorized';
  end if;

  -- If no client_id supplied, look up by email in auth.users
  if v_client_id is null and p_client_email is not null then
    select id into v_client_id
    from auth.users
    where email = lower(trim(p_client_email))
    limit 1;
  end if;

  if v_client_id is null then
    raise exception 'Client not found. Invite the client to create a portal account first, then open their matter.';
  end if;

  return public.fl_open_matter(v_client_id, p_workflow_type, p_title);
end;
$$;

-- Revoke from public, grant only to anon + authenticated (same pattern as rest of file)
revoke all on function public.fl_admin_cms_open_matter(text, uuid, text, text, text, text) from public;
grant execute on function public.fl_admin_cms_open_matter(text, uuid, text, text, text, text) to anon, authenticated;
