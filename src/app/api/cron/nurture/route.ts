/**
 * GET /api/cron/nurture — lead nurture for cold chat conversations.
 *
 * Runs every 6 hours. Finds chat conversations where:
 *   - visitor_email is present
 *   - status is still "bot" (never booked, never handed to agent)
 *   - last_message_at is between 24h and 72h ago
 *   - nurtured_at is null (not already sent)
 *
 * Sends a single follow-up email and stamps nurtured_at so it fires once.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendNurtureEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ColdLead = {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  meta: Record<string, unknown> | null;
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

  const { data: leads, error } = await supabase
    .from("chat_conversations")
    .select("id, visitor_name, visitor_email, meta")
    .eq("status", "bot")
    .not("visitor_email", "is", null)
    .is("nurtured_at", null)
    .lt("last_message_at", cutoff24h)
    .gt("last_message_at", cutoff72h)
    .limit(50);

  if (error) {
    console.error("[nurture] query error", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (leads ?? []) as ColdLead[];
  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.visitor_email) continue;

    const intent =
      typeof row.meta?.intent === "string" ? row.meta.intent : null;

    const result = await sendNurtureEmail({
      to: row.visitor_email,
      name: row.visitor_name ?? "",
      intent,
    });

    if ("skipped" in result && result.skipped) {
      skipped++;
      continue;
    }

    // Stamp nurtured_at regardless of email success to avoid retry spam
    await supabase
      .from("chat_conversations")
      .update({ nurtured_at: now.toISOString() })
      .eq("id", row.id);

    if ("ok" in result && result.ok) {
      sent++;
    } else {
      console.error("[nurture] email failed", row.id, "ok" in result ? result.error : "unknown");
    }
  }

  return Response.json({ sent, skipped, total: rows.length });
}
