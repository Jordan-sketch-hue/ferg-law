/**
 * POST /api/auth/passkey-authenticate
 * Body: { email, credential: AuthenticationResponseJSON }
 *
 * Verifies the WebAuthn assertion and returns a Supabase magic-link token
 * that the client can exchange for a session.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

const RP_ID     = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
  : "fergusonlawja.com";
const RP_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fergusonlawja.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; credential?: AuthenticationResponseJSON };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email || !body.credential) {
      return NextResponse.json({ error: "Missing email or credential." }, { status: 400 });
    }

    const challengeRaw = req.cookies.get("fl_wac")?.value;
    if (!challengeRaw) {
      return NextResponse.json({ error: "Challenge expired. Please try again." }, { status: 400 });
    }
    const expectedChallenge = JSON.parse(challengeRaw) as string;

    const supabase = createAdminClient();

    // Look up stored credential
    const credentialId = body.credential.id;
    const { data: stored, error: fetchErr } = await supabase
      .from("fl_passkeys")
      .select("*")
      .eq("credential_id", credentialId)
      .eq("user_email", email)
      .maybeSingle();

    if (fetchErr || !stored) {
      return NextResponse.json({ error: "Passkey not found. Please use your password or register a new passkey." }, { status: 404 });
    }

    const verification = await verifyAuthenticationResponse({
      response:            body.credential,
      expectedChallenge,
      expectedOrigin:      RP_ORIGIN,
      expectedRPID:        RP_ID,
      credential: {
        id:         stored.credential_id as string,
        publicKey:  new Uint8Array(Buffer.from(stored.public_key as string, "base64")),
        counter:    stored.counter as number,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Passkey verification failed." }, { status: 401 });
    }

    // Update counter to prevent replay attacks
    await supabase
      .from("fl_passkeys")
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq("credential_id", credentialId);

    // Issue a magic-link token so the client can get a real Supabase session
    const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
      type:  "magiclink",
      email: stored.user_email as string,
    });
    if (linkErr || !link) throw linkErr ?? new Error("Could not generate session token.");

    // Extract the hashed_token from the generated URL
    const url = new URL(link.properties.action_link);
    const tokenHash = url.searchParams.get("token_hash") ?? url.hash.split("token=")[1]?.split("&")[0];

    const res = NextResponse.json({ ok: true, email: stored.user_email, tokenHash });
    res.cookies.delete("fl_wac");
    return res;
  } catch (err) {
    console.error("[passkey-authenticate]", err);
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}
