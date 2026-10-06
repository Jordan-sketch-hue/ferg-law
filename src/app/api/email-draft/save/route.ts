import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const VALID_TOKENS = [
  process.env.FL_ADMIN_TOKEN_JORDAN ?? "jst-jordan-2026",
  process.env.FL_ADMIN_TOKEN_OWEN   ?? "ferguson-admin-2026",
];

export async function POST(req: NextRequest) {
  try {
    const { token, draft } = await req.json() as { token: string; draft: Record<string, string> };
    if (!VALID_TOKENS.includes(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!draft || typeof draft !== "object") return NextResponse.json({ error: "Missing draft" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("fl_email_draft")
      .upsert({ draft_key: "partner-invite", content: draft, updated_at: new Date().toISOString() }, { onConflict: "draft_key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
