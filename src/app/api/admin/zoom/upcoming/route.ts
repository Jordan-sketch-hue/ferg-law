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

  const { data, error } = await supabase
    .from("appointments")
    .select("ref, name, service, starts_at, meta")
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const meetings = (data ?? [])
    .map(r => {
      const meta = r.meta as Record<string, string> | null;
      return {
        ref: r.ref,
        name: r.name,
        service: r.service,
        starts_at: r.starts_at,
        meeting_url: meta?.meeting_url ?? meta?.zoom_url ?? null,
        meeting_provider: meta?.meeting_provider ?? (meta?.zoom_url ? "zoom" : null),
      };
    });

  return Response.json({ ok: true, meetings });
}
