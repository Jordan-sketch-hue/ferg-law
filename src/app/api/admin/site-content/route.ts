import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const VALID_TOKENS = [
  process.env.FL_ADMIN_TOKEN_JORDAN  ?? "jst-jordan-2026",
  process.env.FL_ADMIN_TOKEN_OWEN    ?? "ferguson-admin-2026",
];

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    token: string;
    page_slug: string;
    block_key: string;
    content_type: string;
    value: string;
    label?: string;
  };

  if (!VALID_TOKENS.includes(body.token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("fl_site_blocks").upsert({
    page_slug:    body.page_slug,
    block_key:    body.block_key,
    content_type: body.content_type,
    value:        body.value,
    label:        body.label,
    updated_at:   new Date().toISOString(),
    updated_by:   body.token.includes("jordan") ? "Jordan" : "Owen",
  }, { onConflict: "page_slug,block_key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  if (!VALID_TOKENS.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fl_site_blocks")
    .select("*")
    .order("page_slug")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
