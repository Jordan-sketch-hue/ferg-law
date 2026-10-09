import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { pushToAdmins } from "@/lib/push";

// -- Spam heuristics ----------------------------------------------------------
const SPAM_SUBJECT_PATTERNS = [
  /trademark/i, /copyright\s*(violation|notice|infringement)/i,
  /dmca/i, /unauthorized\s*(brand|use|representation)/i,
  /legal\s*(action|notice|threat)/i, /cease\s*and\s*desist/i,
  /account\s*(suspended|terminated|disabled)/i,
  /wire\s*transfer/i, /bitcoin/i, /crypto\s*payment/i,
];

const SPAM_DOMAIN_PATTERNS = [
  /sell\d*proxy/i, /\.xyz$/i, /\.pw$/i, /\.top$/i, /\.ksmg\.life$/i, /\.hrufhs\.org$/i,
  // known cold-email platform sending domains
  /adsgpt\.com$/i, /mailshake\.com$/i, /lemlist\.com$/i, /outreach\.io$/i,
  /apollo\.io$/i, /salesloft\.com$/i, /yesware\.com$/i, /mixmax\.com$/i,
  /woodpecker\.co$/i, /reply\.io$/i, /klenty\.com$/i, /hunter\.io$/i,
  // generic bulk-sending subdomains that real law clients never use
  /^(email|em|mail|send|bulk|blast|campaign)\d*\./i,
];

function isLikelySpam(fromEmail: string, subject: string): boolean {
  if (SPAM_SUBJECT_PATTERNS.some((p) => p.test(subject))) return true;
  try {
    const domain = fromEmail.split("@")[1] ?? "";
    if (SPAM_DOMAIN_PATTERNS.some((p) => p.test(domain))) return true;
    const username = fromEmail.split("@")[0] ?? "";
    if (username.length >= 12 && /^[bcdfghjklmnpqrstvwxyz]{10,}/i.test(username)) return true;
  } catch { /* ignore */ }
  return false;
}
// -----------------------------------------------------------------------------


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
  // Received mail lives at /emails/receiving/{id}; /emails/{id} is sent-mail only (404s here).
  // Retry briefly — the webhook can fire a moment before the body is queryable.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const raw = await r.text();
      console.log(`RESEND_RECEIVING status=${r.status} emailId=${emailId} attempt=${attempt} preview=${raw.slice(0, 200)}`);
      if (r.ok) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        const html = typeof d.html === "string" ? d.html : "";
        const text = typeof d.text === "string" ? d.text : "";
        if (html || text) return { html, text };
      }
    } catch (e) {
      console.error("fetchResendEmailBody error:", e);
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  return { html: "", text: "" };
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
    const spam = isLikelySpam(fromEmail, String(payload.subject ?? ""));

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
      is_spam: spam,
    });

    if (error) {
      console.error("fl_inbound_emails insert error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // Forward notification email to Owen (and BCC Jordan) so they're alerted in their inbox.
    // Skip if the sender is our own domain — prevents infinite loops when system emails
    // (morning digest, notification forwards) land at contact@fergusonlawja.com.
    const isInternalSender = fromEmail.toLowerCase().endsWith("@fergusonlawja.com");
    // Route forwarded notification to the mailbox it was sent to.
    // contact@ => FERGUSON_STAFF_EMAIL (public enquiries inbox)
    // owen@    => owen@fergusonlawja.com (Owen's personal mailbox)
    const owenEmail = "owen@fergusonlawja.com";
    const defaultStaffEmail = process.env.FERGUSON_STAFF_EMAIL || "contact@fergusonlawja.com";
    const isOwenMailbox = toEmail?.toLowerCase() === owenEmail;
    const forwardTo = isOwenMailbox ? owenEmail : defaultStaffEmail;
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && !isInternalSender && !spam) {
      const rawSubject = String(payload.subject ?? "(no subject)");
      // Strip any accumulated "New enquiry: " prefixes before adding one.
      const cleanSubject = rawSubject.replace(/^(New enquiry:\s*)+/i, "");
      const previewText = (bodyText || bodyHtml.replace(/<[^>]+>/g, "")).slice(0, 300) || "(no body)";
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Ferguson Law <contact@fergusonlawja.com>",
          to: [forwardTo],
          bcc: ["jordanroad631@gmail.com"],
          subject: `New enquiry: ${cleanSubject}`,
          text: `New inbound message from ${fromName ? `${fromName} ` : ""}${fromEmail}\n\nSubject: ${cleanSubject}\n\n---\n${previewText}`,
        }),
      }).catch((e) => console.error("inbound forward email error:", e));
    }

    if (!isInternalSender && !spam) {
      void pushToAdmins(
        `New Email${fromName ? ` — ${fromName}` : ""}`,
        String(payload.subject ?? "(no subject)"),
        "/admin?tab=email",
        "fl-email",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("inbound email webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
