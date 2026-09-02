/**
 * WebAuthn passkey authentication — two-step:
 *   GET  → generates authentication options (challenge stored in Supabase)
 *   POST → verifies assertion and returns a session token
 */
import { NextRequest } from 'next/server';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'fergusonlawja.com';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://fergusonlawja.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userRef = searchParams.get('userRef');
  const userRole = searchParams.get('userRole') || 'admin';
  if (!userRef) return Response.json({ ok: false, error: 'userRef required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: creds } = await supabase
    .from('fl_webauthn_credentials')
    .select('credential_id')
    .eq('user_ref', userRef)
    .eq('user_role', userRole);

  if (!creds || creds.length === 0) {
    return Response.json({ ok: false, error: 'No passkey registered for this account' }, { status: 404 });
  }

  const allowCredentials = creds.map((c) => ({
    id: c.credential_id,
    type: 'public-key' as const,
  }));

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials,
  });

  // Store challenge in Supabase (serverless-safe)
  await supabase.from('fl_webauthn_challenges').upsert(
    {
      user_ref: userRef,
      user_role: userRole,
      challenge: options.challenge,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    { onConflict: 'user_ref,user_role' }
  );

  return Response.json({ ok: true, options });
}

export async function POST(req: NextRequest) {
  const { response, userRef, userRole = 'admin' } = await req.json() as {
    response: AuthenticationResponseJSON;
    userRef: string;
    userRole: string;
  };

  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from('fl_webauthn_challenges')
    .select('challenge, expires_at')
    .eq('user_ref', userRef)
    .eq('user_role', userRole)
    .single();

  if (!row || new Date(row.expires_at) < new Date()) {
    return Response.json({ ok: false, error: 'Challenge expired' }, { status: 400 });
  }

  // Delete immediately to prevent replay
  await supabase.from('fl_webauthn_challenges').delete().eq('user_ref', userRef).eq('user_role', userRole);

  const credentialId = response.id;
  const { data: cred } = await supabase
    .from('fl_webauthn_credentials')
    .select('public_key, counter')
    .eq('credential_id', credentialId)
    .eq('user_ref', userRef)
    .single();

  if (!cred) return Response.json({ ok: false, error: 'Credential not found' }, { status: 404 });

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: row.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: credentialId,
        publicKey: Buffer.from(cred.public_key, 'base64url'),
        counter: cred.counter,
      },
    });

    if (!verification.verified) {
      return Response.json({ ok: false, error: 'Verification failed' }, { status: 401 });
    }

    await supabase.from('fl_webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter, last_used: new Date().toISOString() })
      .eq('credential_id', credentialId);

    if (userRole === 'admin') {
      const { data: session } = await supabase.rpc('fl_admin_login_biometric', { p_user_ref: userRef });
      return Response.json({ ok: true, token: session?.token ?? null, userRole });
    }
    if (userRole === 'partner') {
      const { data: session } = await supabase.rpc('fl_partner_login_biometric', { p_user_ref: userRef });
      return Response.json({ ok: true, token: session?.token ?? null, userRole });
    }

    return Response.json({ ok: true, userRole });
  } catch (e: unknown) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
