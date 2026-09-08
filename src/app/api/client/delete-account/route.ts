import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purgeClientData, logDataDeletion } from "@/lib/client-purge.server";
import { sendDataDeletionConfirmed } from "@/lib/email/cms";

/**
 * Client self-service account + data deletion. Requires an active session
 * AND an explicit { confirm: true } — no confirm, no delete. Irreversible.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: boolean };
  if (confirm !== true) {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }

  const clientName = (user.user_metadata?.full_name as string | undefined) || user.email.split("@")[0];

  const summary = await purgeClientData({ clientId: user.id, email: user.email });
  await logDataDeletion(summary, "client");
  // Awaited deliberately — a fire-and-forget send here can get cut off when
  // the serverless function freezes right after the response is returned.
  await sendDataDeletionConfirmed(user.email, clientName, "client").catch(() => null);

  return NextResponse.json({ ok: true });
}
