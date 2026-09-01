/**
 * GET /api/auth/passkey-challenge?mode=register|authenticate&email=...
 *
 * Returns a random challenge for WebAuthn credential creation or assertion.
 * Challenge is stored in an HttpOnly cookie (2 min TTL) to prevent reuse.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions, generateAuthenticationOptions } from "@simplewebauthn/server";
import { createAdminClient } from "@/lib/supabase/server";

const RP_NAME  = "Ferguson Law";
const RP_ID    = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
  : "fergusonlawja.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode  = searchParams.get("mode") ?? "authenticate";
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  try {
    let options: unknown;

    if (mode === "register") {
      if (!email) return NextResponse.json({ error: "Email required for registration." }, { status: 400 });

      // Find existing credentials for this user so we can exclude them
      const supabase = createAdminClient();
      const { data: existing } = await supabase
        .from("fl_passkeys")
        .select("credential_id")
        .eq("user_email", email);

      options = await generateRegistrationOptions({
        rpName:  RP_NAME,
        rpID:    RP_ID,
        userName: email,
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((r) => ({
          id: r.credential_id as string,
          type: "public-key" as const,
        })),
        authenticatorSelection: {
          residentKey:      "preferred",
          userVerification: "preferred",
        },
      });
    } else {
      options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: "preferred",
      });
    }

    const res = NextResponse.json({ ok: true, options });
    res.cookies.set("fl_wac", JSON.stringify((options as { challenge: string }).challenge), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   120,
      path:     "/",
    });
    return res;
  } catch (err) {
    console.error("[passkey-challenge]", err);
    return NextResponse.json({ error: "Could not generate challenge." }, { status: 500 });
  }
}
