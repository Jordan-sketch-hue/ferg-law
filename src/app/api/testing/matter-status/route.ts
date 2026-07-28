import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin.rpc("fl_test_matter_status");
  return NextResponse.json(data ?? []);
}
