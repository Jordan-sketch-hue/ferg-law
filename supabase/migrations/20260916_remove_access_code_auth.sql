-- Retire shared access-code authentication. Back-office access now requires an
-- account in private.fl_admin_accounts, created and managed by the existing
-- admin-account flow.
CREATE OR REPLACE FUNCTION public.fl_is_admin(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.fl_admin_accounts
    WHERE token = NULLIF(trim(p_token), '')
  );
$$;

REVOKE ALL ON FUNCTION public.fl_is_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fl_is_admin(text) TO anon, authenticated;
