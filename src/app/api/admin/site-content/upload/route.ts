import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

async function getAdminEmail(token: string): Promise<string | null> {
  if (!token) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("fl_admin_whoami", { p_token: token });
  return !error && typeof data === "string" && data ? data : null;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token") as string;
  const file  = form.get("file") as File | null;
  const page_slug = form.get("page_slug") as string;
  const block_key = form.get("block_key") as string;

  const adminEmail = await getAdminEmail(token);
  if (!adminEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { error: dbErr } = await supabase.from("fl_site_blocks").upsert({
    page_slug, block_key, content_type: "image", value: publicUrl,
    updated_at: new Date().toISOString(),
    updated_by: adminEmail,
  }, { onConflict: "page_slug,block_key" });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ url: publicUrl });
}
