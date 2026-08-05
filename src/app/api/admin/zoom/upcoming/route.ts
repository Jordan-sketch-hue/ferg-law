/**
 * GET /api/admin/zoom/upcoming
 * Returns upcoming confirmed appointments that have a zoom_url in meta.
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

  // appointments has no anon SELECT policy — must go through the admin
  // SECURITY DEFINER RPC (same pattern as every other admin/* fetch), not a raw table select.
  const { data, error } = await supabase.rpc("fl_admin_appointments", { p_token: token });

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const now = Date.now();
  type Row = { id: string; ref: string; name: string | null; service: string | null; starts_at: string; status: string; meta: Record<string, string> | null };
  const meetings = ((data ?? []) as Row[])
    .filter(r => r.status === "confirmed" && new Date(r.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 20)
    .map(r => ({
      id: r.id,
      ref: r.ref,
      name: r.name,
      service: r.service,
      starts_at: r.starts_at,
      meeting_url: r.meta?.meeting_url ?? r.meta?.zoom_url ?? null,
      meeting_provider: r.meta?.meeting_provider ?? (r.meta?.zoom_url ? "zoom" : null),
    }));

  return Response.json({ ok: true, meetings });
}
