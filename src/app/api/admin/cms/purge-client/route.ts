import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purgeClientData, logDataDeletion } from "@/lib/client-purge.server";
import { sendDataDeletionConfirmed } from "@/lib/email/cms";

/**
 * Staff-triggered full data purge for one client — login access, client
 * profile, every matter, KYC, messages, files (DB rows + Storage objects),
 * payments, appointments, and email log. Irreversible.
 *
 * Requires { confirm: true } in the body on top of the admin token, so a
 * stray double-click or retry can't fire this a second time silently.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, clientId, clientEmail, clientName, confirm } = (await req.json()) as {
      token: string;
      clientId?: string | null;
      clientEmail: string;
      clientName?: string;
      confirm: boolean;
    };

    if (!token || !clientEmail || !confirm) {
      return NextResponse.json({ error: "Missing token, clientEmail, or confirm." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const summary = await purgeClientData({ clientId: clientId ?? null, email: clientEmail });
    await logDataDeletion(summary, "admin");
    void sendDataDeletionConfirmed(clientEmail, clientName || clientEmail, "admin").catch(() => null);

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
