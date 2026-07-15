import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { token, id } = (await req.json()) as { token: string; id: string };
    if (!token || !id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const supabase = await createClient();
    await supabase.rpc("fl_admin_email_read", { p_token: token, p_id: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
