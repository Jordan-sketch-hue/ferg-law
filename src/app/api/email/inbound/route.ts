/**
 * POST /api/email/inbound
 * Handles both Resend inbound webhook AND forwardemail.net webhook.
 *
 * Resend payload: { data: { from: "Name <email>", to: [...], subject, text, html } }
 * forwardemail.net payload: { from: { address, name }, to: [{address}], subject, text, html }
 *
 * To activate without changing MX records:
 *   In forwardemail.net dashboard > Domain > Webhooks, add:
 *   https://fergusonlawja.com/api/email/inbound
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

type EmailAddress = { address?: string; name?: string } | string;

function resolveAddress(val: EmailAddress): { email: string; name: string | null } {
  if (!val) return { email: "", name: null };
  if (typeof val === "string") {
    const m = val.match(/^(.+?)\s*<(.+?)>$/);
    return m ? { email: m[2].trim(), name: m[1].trim() } : { email: val.trim(), name: null };
  }
  return { email: val.address?.trim() ?? "", name: val.name?.trim() || null };
}

function firstOf<T>(v: T | T[]): T {
  return Array.isArray(v) ? v[0] : v;
}

export async function POST(req: NextRequest) {
  try {
    if (WEBHOOK_SECRET) {
      const sig = req.headers.get("x-webhook-secret") || req.headers.get("x-resend-signature");
      if (sig !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json() as Record<string, unknown>;

    // Resend wraps in data key; forwardemail.net sends flat
    const isResend = !!body.data && typeof (body.data as Record<string, unknown>).from === "string";
    const payload = isResend
      ? (body.data as Record<string, unknown>)
      : body;

    const fromRaw = payload.from as EmailAddress;
    const { email: fromEmail, name: fromName } = resolveAddress(fromRaw);

    const toRaw = payload.to;
    const toFirst = firstOf(toRaw as EmailAddress | EmailAddress[]);
    const { email: toEmail } = resolveAddress(toFirst);

    const replyToRaw = payload.replyTo ?? payload.reply_to;
    const replyToFirst = replyToRaw
      ? firstOf(replyToRaw as EmailAddress | EmailAddress[])
      : null;
    const replyTo = replyToFirst ? resolveAddress(replyToFirst).email : null;

    const headers = payload.headers as Record<string, string> | undefined;
    const threadId = headers?.["x-thread-id"] ?? null;

    if (!fromEmail) {
      return NextResponse.json({ error: "Missing from" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("fl_inbound_emails").insert({
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail || null,
      subject: String(payload.subject ?? ""),
      body_text: String(payload.text ?? ""),
      body_html: String(payload.html ?? ""),
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