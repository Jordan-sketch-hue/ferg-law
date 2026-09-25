import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { token, id } = (await req.json()) as { token?: string; id?: string };
  if (!token || !id) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const supabase = createAdminClient();

  // Verify admin token
  const { data: valid } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("fl_inbound_emails").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
