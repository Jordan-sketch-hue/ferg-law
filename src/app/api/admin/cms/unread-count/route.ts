import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** Returns total unread client messages across ALL matters — for the dashboard badge. */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

    const supabase = createAdminClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const { count } = await supabase
      .from("fl_matter_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_type", "client")
      .is("read_at", null);

    return NextResponse.json({ count: count ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
