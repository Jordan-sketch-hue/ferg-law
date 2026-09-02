/**
 * WebAuthn passkey registration — two-step:
 *   GET  → generates challenge + registration options (stored in Supabase)
 *   POST → verifies response and stores credential
 */
import { NextRequest } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/browser';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RP_NAME = 'Ferguson Law';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'fergusonlawja.com';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'https://fergusonlawja.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userRef = searchParams.get('userRef');
  const userRole = searchParams.get('userRole') || 'admin';
  if (!userRef) return Response.json({ ok: false, error: 'userRef required' }, { status: 400 });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userRef),
    userName: userRef,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
  });

  // Store challenge in Supabase with 5-min TTL (serverless-safe)
  const supabase = createAdminClient();
  await supabase.from('fl_webauthn_challenges').upsert(
    {
      user_ref: userRef,
      user_role: userRole,
      challenge: options.challenge,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    { onConflict: 'user_ref,user_role' }
  );

  return Response.json({ ok: true, options, userRole });
}

export async function POST(req: NextRequest) {
  const { response, userRef, userRole = 'admin', deviceLabel } = await req.json() as {
    response: RegistrationResponseJSON;
    userRef: string;
    userRole: string;
    deviceLabel?: string;
  };
  if (!userRef) return Response.json({ ok: false, error: 'userRef required' }, { status: 400 });

  const supabase = createAdminClient();

  // Fetch and validate challenge from Supabase
  const { data: row } = await supabase
    .from('fl_webauthn_challenges')
    .select('challenge, expires_at')
    .eq('user_ref', userRef)
    .eq('user_role', userRole)
    .single();

  if (!row || new Date(row.expires_at) < new Date()) {
    return Response.json({ ok: false, error: 'Challenge expired — try again' }, { status: 400 });
  }

  // Delete used challenge immediately
  await supabase.from('fl_webauthn_challenges').delete().eq('user_ref', userRef).eq('user_role', userRole);

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: row.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return Response.json({ ok: false, error: 'Verification failed' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;
    const credentialId = Buffer.from(credential.id).toString('base64url');
    const publicKey = Buffer.from(credential.publicKey).toString('base64url');

    const { error } = await supabase.from('fl_webauthn_credentials').upsert(
      {
        user_role: userRole,
        user_ref: userRef,
        credential_id: credentialId,
        public_key: publicKey,
        counter: credential.counter,
        device_label: deviceLabel ?? null,
        last_used: new Date().toISOString(),
      },
      { onConflict: 'credential_id' }
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e: unknown) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
