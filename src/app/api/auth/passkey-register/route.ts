/**
 * POST /api/auth/passkey-register
 * Body: { email, credential: RegistrationResponseJSON }
 *
 * Verifies the WebAuthn registration response and stores the credential.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/server";

const RP_ID   = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
  : "fergusonlawja.com";
const RP_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fergusonlawja.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; credential?: unknown; name?: string };
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

    // Look up user_id by email
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ });
    if (listErr) throw listErr;
    const user = users.find(u => u.email?.toLowerCase() === email);
    if (!user) {
      return NextResponse.json({ error: "No account found for this email. Please create an account first." }, { status: 404 });
    }

    const verification = await verifyRegistrationResponse({
      response:          body.credential as Parameters<typeof verifyRegistrationResponse>[0]["response"],
      expectedChallenge,
      expectedOrigin:    RP_ORIGIN,
      expectedRPID:      RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Passkey verification failed. Please try again." }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    await supabase.from("fl_passkeys").insert({
      user_id:       user.id,
      user_email:    email,
      credential_id: Buffer.from(credential.id).toString("base64url"),
      public_key:    Buffer.from(credential.publicKey).toString("base64"),
      counter:       credential.counter,
      device_name:   (body.name as string | undefined) ?? "Passkey device",
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.delete("fl_wac");
    return res;
  } catch (err) {
    console.error("[passkey-register]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
