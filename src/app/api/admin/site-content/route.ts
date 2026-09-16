import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

async function getAdminEmail(token: string): Promise<string | null> {
  if (!token) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("fl_admin_whoami", { p_token: token });
  return !error && typeof data === "string" && data ? data : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    token: string;
    page_slug: string;
    block_key: string;
    content_type: string;
    value: string;
    label?: string;
  };

  const adminEmail = await getAdminEmail(body.token);
  if (!adminEmail) {
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
    updated_by:   adminEmail,
  }, { onConflict: "page_slug,block_key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  if (!(await getAdminEmail(token))) {
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
