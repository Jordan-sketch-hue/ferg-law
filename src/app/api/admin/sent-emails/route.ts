import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token: string };

    if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

    const supabase = await createClient();
    const { data: isAdmin, error: authErr } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (authErr || !isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("fl_email_log")
      .select("id, created_at, to_email, to_name, subject, body_preview, status, resend_id, context")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ emails: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
