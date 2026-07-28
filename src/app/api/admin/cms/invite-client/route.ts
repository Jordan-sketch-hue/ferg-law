import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendClientPortalInvite } from "@/lib/email/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { email, clientName, matterTitle } = (await req.json()) as {
      email: string;
      clientName?: string;
      matterTitle?: string;
    };

    if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

    const admin = createAdminClient();
    const { error: authErr } = await admin.rpc("fl_is_admin", { p_token: token });
    if (authErr) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const result = await sendClientPortalInvite(email.trim().toLowerCase(), clientName || "there", matterTitle);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
