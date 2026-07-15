/**
 * POST /api/client/start-matter — self-serve intake for the authenticated
 * client. Opens a matter immediately instead of waiting on staff, for
 * clients who registered before intake was captured at signup.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { intent } = (await req.json()) as { intent?: "property_purchase" | "property_sale" | "general" };

  const admin = createAdminClient();
  const { data: matterId, error } = await admin.rpc("fl_open_matter", {
    p_client_id: user.id,
    p_workflow_type: intent ?? "general",
    p_title: null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, matterId });
}
