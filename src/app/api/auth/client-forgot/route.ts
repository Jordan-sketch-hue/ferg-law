import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function originFrom(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host") || "fergusonlawja.com";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const generic = Response.json({ ok: true });
  let body: { email?: unknown };
  try { body = await req.json(); } catch { return generic; }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!emailRe.test(email)) return generic;

  try {
    const supabase = createAdminClient();
    const redirectTo = `${originFrom(req)}/auth/callback`;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  } catch { /* swallow — never reveal internal state */ }
  return generic;
}
