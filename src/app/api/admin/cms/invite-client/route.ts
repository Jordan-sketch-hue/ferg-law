import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendClientPortalInvite } from "@/lib/email/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { email, clientName, matterTitle, clientId } = (await req.json()) as {
      email: string;
      clientName?: string;
      matterTitle?: string;
      clientId?: string;
    };

    if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: isAdmin, error: authErr } = await admin.rpc("fl_is_admin", { p_token: token });
    if (authErr || !isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Validate clientId is a UUID before interpolating into query filter
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (clientId && !UUID_RE.test(clientId)) {
      return NextResponse.json({ error: "invalid clientId" }, { status: 400 });
    }

    // Guard: only send invite if client has at least one active matter
    const emailLower = email.trim().toLowerCase();
    let matterQuery = admin
      .from("fl_client_matters")
      .select("id")
      .not("status", "in", "(archived,closed)");

    if (clientId) {
      matterQuery = matterQuery.or(`client_email.eq.${emailLower},client_id.eq.${clientId}`);
    } else {
      matterQuery = matterQuery.eq("client_email", emailLower);
    }

    const { data: activeMatters } = await matterQuery.limit(1);

    if (!activeMatters || activeMatters.length === 0) {
      return NextResponse.json(
        { error: "No active matter found for this client — invite blocked." },
        { status: 400 }
      );
    }

    const result = await sendClientPortalInvite(emailLower, clientName || "there", matterTitle);

    // Stamp portal_invited_at so the button permanently shows "Sent" after first use
    if (clientId) {
      try {
        await admin
          .from("fl_clients")
          .update({ portal_invited_at: new Date().toISOString() })
          .eq("id", clientId);
      } catch {
        // non-critical — invite already sent
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
