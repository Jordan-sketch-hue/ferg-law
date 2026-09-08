-- PWA: Push subscriptions + WebAuthn credentials
-- Apply to: ibtadbwtrxglujkzqofs

-- ── Push subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fl_push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role   text NOT NULL CHECK (user_role IN ('admin','client','partner','public')),
  user_ref    text,
  endpoint    text UNIQUE NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  site        text NOT NULL DEFAULT 'ferguson-law',
  created_at  timestamptz DEFAULT now(),
  last_used   timestamptz
);

-- Only server-side (service role) can read/write subscriptions
ALTER TABLE fl_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON fl_push_subscriptions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── WebAuthn credentials ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fl_webauthn_credentials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role     text NOT NULL CHECK (user_role IN ('admin','client','partner')),
  user_ref      text NOT NULL,
  credential_id text UNIQUE NOT NULL,
  public_key    text NOT NULL,
  counter       bigint DEFAULT 0,
  device_label  text,
  created_at    timestamptz DEFAULT now(),
  last_used     timestamptz
);

ALTER TABLE fl_webauthn_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON fl_webauthn_credentials
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Biometric login RPCs ─────────────────────────────────────────────────────
-- Returns a session token for admin after WebAuthn verification
CREATE OR REPLACE FUNCTION fl_admin_login_biometric(p_user_ref text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_token text;
BEGIN
  -- Generate a session token scoped to this user
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO fl_admin_sessions (token, label, created_at)
    VALUES (v_token, p_user_ref || ':biometric', now())
    ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('token', v_token);
END;
$$;

CREATE OR REPLACE FUNCTION fl_partner_login_biometric(p_user_ref text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_token text;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO fl_partner_sessions (token, partner_id, created_at)
    SELECT v_token, id, now() FROM fl_partners WHERE id::text = p_user_ref
    ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('token', v_token);
END;
$$;
