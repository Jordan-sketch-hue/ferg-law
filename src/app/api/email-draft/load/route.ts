import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fl_email_draft")
      .select("content, updated_at")
      .eq("draft_key", "partner-invite")
      .single();

    if (error || !data) return NextResponse.json({ content: null });
    return NextResponse.json({ content: data.content, updated_at: data.updated_at });
  } catch {
    return NextResponse.json({ content: null });
  }
}
