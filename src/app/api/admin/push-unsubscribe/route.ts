import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, endpoint } = await req.json() as { token?: string; endpoint?: string };

  const supabase = createAdminClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token ?? "" });
  if (!isAdmin) return Response.json({ ok: false }, { status: 401 });

  if (endpoint) {
    await supabase.from("fl_push_subscriptions").delete().eq("endpoint", endpoint);
  } else {
    await supabase.from("fl_push_subscriptions").delete().eq("user_role", "admin").eq("user_ref", token ?? "");
  }

  return Response.json({ ok: true });
}
