-- ============================================================================
-- 0020_admin_delete_rpcs.sql — Delete / deactivate operations for admin UI
-- ----------------------------------------------------------------------------
-- Adds the missing destructive operations:
--   1. fl_admin_delete_client      — hard-delete a CRM client (cascades matters)
--   2. fl_admin_delete_lead        — hard-delete a ferguson_leads row
--   3. fl_admin_cancel_booking     — set appointment status = 'cancelled'
--   4. fl_admin_deactivate_invite  — flip booking_invites.active = false
--   5. fl_admin_delete_invite      — hard-delete a booking_invites row
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Delete a CRM client (cascades fl_matters via FK on delete cascade)
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_delete_client(
  p_token text,
  p_id    uuid
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  delete from public.fl_clients where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Delete a lead
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_delete_lead(
  p_token text,
  p_id    uuid
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  delete from public.ferguson_leads where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Cancel a booking (soft — keeps the row, frees the slot)
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_cancel_booking(
  p_token text,
  p_id    uuid
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  update public.appointments set status = 'cancelled' where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Deactivate an invite (makes the link stop working without deleting audit trail)
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_deactivate_invite(
  p_token text,
  p_code  text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  update public.booking_invites set active = false where code = p_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Hard-delete an invite
-- ---------------------------------------------------------------------------
create or replace function public.fl_admin_delete_invite(
  p_token text,
  p_code  text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.fl_is_admin(p_token) then raise exception 'unauthorized'; end if;
  delete from public.booking_invites where code = p_code;
end;
$$;

-- Grants
revoke all on function public.fl_admin_delete_client(text, uuid)      from public;
revoke all on function public.fl_admin_delete_lead(text, uuid)         from public;
revoke all on function public.fl_admin_cancel_booking(text, uuid)      from public;
revoke all on function public.fl_admin_deactivate_invite(text, text)   from public;
revoke all on function public.fl_admin_delete_invite(text, text)       from public;

grant execute on function public.fl_admin_delete_client(text, uuid)      to anon, authenticated;
grant execute on function public.fl_admin_delete_lead(text, uuid)         to anon, authenticated;
grant execute on function public.fl_admin_cancel_booking(text, uuid)      to anon, authenticated;
grant execute on function public.fl_admin_deactivate_invite(text, text)   to anon, authenticated;
grant execute on function public.fl_admin_delete_invite(text, text)       to anon, authenticated;
