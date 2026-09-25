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
    const raw = await r.text();
    console.log(`RESEND_API status=${r.status} emailId=${emailId} body=${raw.slice(0, 500)}`);
    if (!r.ok) return { html: "", text: "" };
    const d = JSON.parse(raw) as Record<string, unknown>;
    return {
      html: typeof d.html === "string" ? d.html : "",
      text: typeof d.text === "string" ? d.text : "",
    };
  } catch (e) {
    console.error("fetchResendEmailBody error:", e);
    return { html: "", text: "" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    // Log the full raw payload so we can debug Resend's format
    console.log(`INBOUND_RAW type=${body.type ?? "none"} keys=${Object.keys(body).join(",")} data_keys=${body.data ? Object.keys(body.data as object).join(",") : "none"}`);
    console.log(`INBOUND_PAYLOAD_SAMPLE ${JSON.stringify(body).slice(0, 2000)}`);

    // Resend inbound payload: { type: "email.received", data: { from, to, subject, email_id, html, text, ... } }
    // Always prefer body.data when it exists — do NOT gate on typeof from === "string"
    // because Resend may send `from` as either a plain string or an {email, name} object.
    const payload: Record<string, unknown> = (body.data && typeof body.data === "object")
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

    // Handle headers as either an array [{name,value}] or a flat object
    const headersRaw = payload.headers;
    let threadId: string | null = null;
    if (Array.isArray(headersRaw)) {
      const threadHeader = (headersRaw as { name: string; value: string }[]).find(
        (h) => h.name?.toLowerCase() === "x-thread-id"
      );
      threadId = threadHeader?.value ?? (payload.message_id as string | null) ?? null;
    } else if (headersRaw && typeof headersRaw === "object") {
      const h = headersRaw as Record<string, string>;
      threadId = h["x-thread-id"] ?? h["X-Thread-Id"] ?? (payload.message_id as string | null) ?? null;
    } else {
      threadId = (payload.message_id as string | null) ?? null;
    }

    if (!fromEmail) {
      return NextResponse.json({ error: "Missing from" }, { status: 400 });
    }

    // Extract body from webhook payload — Resend includes html/text in data when available
    const payloadHtml = typeof payload.html === "string" ? payload.html.trim() : "";
    const payloadText = typeof payload.text === "string" ? payload.text.trim() : "";

    // Fall back to Resend API fetch using email_id if payload has no body
    const emailId = typeof payload.email_id === "string" ? payload.email_id : "";
    const { html: fetchedHtml, text: fetchedText } = (payloadHtml || payloadText)
      ? { html: payloadHtml, text: payloadText }
      : await fetchResendEmailBody(emailId);

    const bodyHtml = fetchedHtml;
    const bodyText = fetchedText;
    console.log(`BODY_CHECK payload_html=${!!payloadHtml} payload_text=${!!payloadText} fetched_html=${!!fetchedHtml} fetched_text=${!!fetchedText} email_id=${emailId}`);

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
      email_id: emailId || null,
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