import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { notify_email } = (await req.json()) as { notify_email: string };
    if (!notify_email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

    const id = Math.random().toString(36).slice(2, 10).toUpperCase();
    const admin = createAdminClient();
    await admin.from("fl_test_sessions").insert({ id, notify_email: notify_email.trim().toLowerCase(), step: 0 });

    return NextResponse.json({ session_id: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
