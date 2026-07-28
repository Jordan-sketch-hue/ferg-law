/**
 * GET /api/admin/zoom/test
 * Tests Zoom Server-to-Server OAuth credentials stored in Vercel env vars.
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? "";
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    return Response.json({
      ok: false,
      status: "not_configured",
      missing: [
        ...(!accountId ? ["ZOOM_ACCOUNT_ID"] : []),
        ...(!clientId ? ["ZOOM_CLIENT_ID"] : []),
        ...(!clientSecret ? ["ZOOM_CLIENT_SECRET"] : []),
      ],
    });
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      { method: "POST", headers: { Authorization: `Basic ${credentials}` } },
    );
    if (!tokenRes.ok) throw new Error(`Zoom OAuth ${tokenRes.status}`);
    const tokenData = await tokenRes.json() as { access_token: string };

    // Verify token works by listing meetings (only needs meeting:write scope)
    const listRes = await fetch("https://api.zoom.us/v2/users/me/meetings?page_size=1", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!listRes.ok) throw new Error(`Zoom API ${listRes.status}`);
    return Response.json({ ok: true, status: "connected", email: null });
  } catch (err) {
    return Response.json({ ok: false, status: "error", error: (err as Error).message }, { status: 500 });
  }
}
