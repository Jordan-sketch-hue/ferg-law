import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const VALID_TOKENS = [
  process.env.FL_ADMIN_TOKEN_JORDAN ?? "jst-jordan-2026",
  process.env.FL_ADMIN_TOKEN_OWEN   ?? "ferguson-admin-2026",
];

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token") as string;
  const file  = form.get("file") as File | null;
  const page_slug = form.get("page_slug") as string;
  const block_key = form.get("block_key") as string;

  if (!VALID_TOKENS.includes(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `cms/${page_slug}/${block_key}-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const supabase = createAdminClient();

  const { error: upErr } = await supabase.storage
    .from("site-media")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from("site-media").getPublicUrl(path);

  const uploadTable = form.get("site") === "home" ? "home_site_blocks" : "fl_site_blocks";
  const { error: dbErr } = await supabase.from(uploadTable).upsert({
    page_slug, block_key, content_type: "image", value: publicUrl,
    updated_at: new Date().toISOString(),
    updated_by: token.includes("jordan") ? "Jordan" : "Owen",
  }, { onConflict: "page_slug,block_key" });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ url: publicUrl });
}
