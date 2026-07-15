/**
 * GET /api/admin/zoom/test
 * Tests Zoom Server-to-Server OAuth credentials stored in Vercel env vars.
 * Returns { ok, status, email? } — credentials never sent to the client.
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getZoomToken(): Promise<string> {
  const accountId    = process.env.ZOOM_ACCOUNT_ID;
  const clientId     = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("not_configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!res.ok) throw new Error(`Zoom token error ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? "";
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const missing: string[] = [];
  if (!process.env.ZOOM_ACCOUNT_ID)    missing.push("ZOOM_ACCOUNT_ID");
  if (!process.env.ZOOM_CLIENT_ID)     missing.push("ZOOM_CLIENT_ID");
  if (!process.env.ZOOM_CLIENT_SECRET) missing.push("ZOOM_CLIENT_SECRET");

  if (missing.length > 0) {
    return Response.json({ ok: false, status: "not_configured", missing });
  }

  try {
    const accessToken = await getZoomToken();
    const profileRes = await fetch("https://api.zoom.us/v2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json() as { email?: string; first_name?: string; last_name?: string };

    return Response.json({
      ok: true,
      status: "connected",
      email: profile.email ?? null,
      displayName: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null,
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "not_configured") return Response.json({ ok: false, status: "not_configured", missing });
    return Response.json({ ok: false, status: "error", error: msg }, { status: 500 });
  }
}
