/**
 * POST /api/auth/forgot
 *
 * Body: { scope: "partner" | "admin", email }
 *
 * Mints a one-time, one-hour reset token via the service-role-only RPC
 * fl_mint_reset and emails a "set your password" link. ALWAYS returns a
 * generic { ok: true } regardless of whether the email exists, so the
 * endpoint can't be used to enumerate accounts. Email send + token mint are
 * best-effort — a quiet failure never reveals anything to the caller.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPasswordReset } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function originFrom(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host") || "localhost:3041";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: { scope?: unknown; email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const scope = String(body.scope ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  if (scope !== "partner" && scope !== "admin") {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Always answer the same way (don't reveal whether the address exists).
  const generic = Response.json({ ok: true });
  if (!emailRe.test(email)) return generic;

  try {
    const supabase = createAdminClient();
    const { data: token, error } = await supabase.rpc("fl_mint_reset", {
      p_scope: scope,
      p_email: email,
    });
    // No account (token null) or RPC unavailable → say nothing, return generic.
    if (error || !token) return generic;

    const link = `${originFrom(req)}/reset?token=${encodeURIComponent(token as string)}`;
    await sendPasswordReset({ to: email, link, scope });
  } catch {
    /* swallow — never reveal internal state */
  }
  return generic;
}
