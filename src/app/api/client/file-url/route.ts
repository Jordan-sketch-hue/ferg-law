import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { path } = await req.json() as { path: string };
  if (!path) return NextResponse.json({ error: "Missing path." }, { status: 400 });

  // Only allow clients to get signed URLs for their own matter files
  if (!path.startsWith("matters/")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("fl-matter-files")
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1-year signed URL

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed." }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
