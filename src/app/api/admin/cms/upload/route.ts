import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Staff file upload into a matter — service-role storage write, then logged via fl_admin_cms_upload_file. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = form.get("token");
    const matterId = form.get("matterId");
    const file = form.get("file");

    if (typeof token !== "string" || typeof matterId !== "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();
    const ext = file.name.split(".").pop();
    const path = `matters/${matterId}/${Date.now()}.${ext}`;

    const { error: upErr } = await admin.storage.from("fl-matter-files").upload(path, file);
    if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 502 });

    const { data: { publicUrl } } = admin.storage.from("fl-matter-files").getPublicUrl(path);

    const { data: fileId, error: rpcErr } = await admin.rpc("fl_admin_cms_upload_file", {
      p_token: token,
      p_matter_id: matterId,
      p_file_name: file.name,
      p_file_url: publicUrl,
      p_file_size: file.size,
      p_mime_type: file.type,
    });
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: fileId, url: publicUrl, name: file.name, size: file.size, mimeType: file.type });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
