import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** Mark all unread client messages in a matter as read. Called when staff opens the Messages tab. */
export async function POST(req: NextRequest) {
  try {
    const { token, matterId } = (await req.json()) as { token: string; matterId: string };
    if (!token || !matterId) return NextResponse.json({ error: "Missing fields." }, { status: 400 });

    const supabase = createAdminClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    await supabase
      .from("fl_matter_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("matter_id", matterId)
      .eq("sender_type", "client")
      .is("read_at", null);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
