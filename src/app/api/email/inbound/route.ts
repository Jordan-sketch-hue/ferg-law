/**
 * POST /api/email/inbound
 * Resend inbound webhook — stores incoming emails in fl_inbound_emails.
 * Add this URL in Resend → Inbound → Webhook: https://fergusonlawja.com/api/email/inbound
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Minimal secret check — if env is set, require it as x-webhook-secret header
    if (WEBHOOK_SECRET) {
      const sig = req.headers.get("x-webhook-secret") || req.headers.get("x-resend-signature");
      if (sig !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = (await req.json()) as {
      from?: string;
      to?: string | string[];
      subject?: string;
      text?: string;
      html?: string;
      replyTo?: string | string[];
      headers?: Record<string, string>;
      // Resend inbound envelope shape
      data?: {
        from?: string;
        to?: string | string[];
        subject?: string;
        text?: string;
        html?: string;
        replyTo?: string | string[];
        headers?: Record<string, string>;
      };
    };

    // Resend wraps inbound in a `data` key
    const payload = body.data ?? body;

    const fromRaw = payload.from ?? "";
    // Parse "Name <email>" format
    const nameMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = nameMatch ? nameMatch[1].trim() : null;
    const fromEmail = nameMatch ? nameMatch[2].trim() : fromRaw.trim();

    const toRaw = payload.to;
    const toEmail = Array.isArray(toRaw) ? toRaw[0] : (toRaw ?? null);

    const replyToRaw = payload.replyTo;
    const replyTo = Array.isArray(replyToRaw) ? replyToRaw[0] : (replyToRaw ?? null);

    const threadId = payload.headers?.["x-thread-id"] ?? null;

    if (!fromEmail) {
      return NextResponse.json({ error: "Missing from" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("fl_inbound_emails").insert({
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail,
      subject: payload.subject ?? null,
      body_text: payload.text ?? null,
      body_html: payload.html ?? null,
      reply_to: replyTo,
      thread_id: threadId,
    });

    if (error) {
      console.error("fl_inbound_emails insert error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("inbound email webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
