import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type EmailAddress = { address?: string; name?: string } | string;

function extractStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v && typeof v === "string" && v.trim()) return v;
  }
  return "";
}

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

async function fetchResendEmailBody(emailId: string): Promise<{ html: string; text: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !emailId) return { html: "", text: "" };
  try {
    const r = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return { html: "", text: "" };
    const d = await r.json() as Record<string, unknown>;
    return {
      html: typeof d.html === "string" ? d.html : "",
      text: typeof d.text === "string" ? d.text : "",
    };
  } catch {
    return { html: "", text: "" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    // Resend inbound payload: { type: "email.received", data: { from, to, subject, email_id, ... } }
    // NOTE: Resend does NOT include html/text in the webhook — body must be fetched via API using email_id
    const payload = (body.data && typeof (body.data as Record<string, unknown>).from === "string")
      ? (body.data as Record<string, unknown>)
      : body;

    const fromRaw = payload.from as EmailAddress;
    const { email: fromEmail, name: fromName } = resolveAddress(fromRaw);

    const toRaw = payload.to ?? payload.received_for;
    const toFirst = firstOf(toRaw as EmailAddress | EmailAddress[]);
    const { email: toEmail } = resolveAddress(toFirst);

    const replyToRaw = payload.replyTo ?? payload.reply_to;
    const replyToFirst = replyToRaw
      ? firstOf(replyToRaw as EmailAddress | EmailAddress[])
      : null;
    const replyTo = replyToFirst ? resolveAddress(replyToFirst).email : null;

    const headers = payload.headers as Record<string, string> | undefined;
    const threadId = (headers?.["x-thread-id"] ?? payload.message_id ?? null) as string | null;

    if (!fromEmail) {
      return NextResponse.json({ error: "Missing from" }, { status: 400 });
    }

    const emailId = typeof payload.email_id === "string" ? payload.email_id : "";
    const { html: bodyHtml, text: bodyText } = await fetchResendEmailBody(emailId);

    const supabase = createAdminClient();

    const { error } = await supabase.from("fl_inbound_emails").insert({
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail || null,
      subject: String(payload.subject ?? ""),
      body_text: bodyText,
      body_html: bodyHtml,
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