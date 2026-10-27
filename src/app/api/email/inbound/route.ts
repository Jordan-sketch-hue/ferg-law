import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { pushToAdmins } from "@/lib/push";
import { notifyOwenWA } from "@/lib/wa-notify";
import { Resend } from "resend";

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

type ResendAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  content?: string;
  download_url?: string;
  size?: number;
};

async function fetchResendEmailBody(emailId: string): Promise<{
  html: string;
  text: string;
  attachments: ResendAttachment[];
}> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !emailId) return { html: "", text: "", attachments: [] };
  // Received mail lives at /emails/receiving/{id}; /emails/{id} is sent-mail only (404s here).
  // Retry briefly — the webhook can fire a moment before the body is queryable.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const raw = await r.text();
      console.log(`[inbound] Resend body lookup status=${r.status} attempt=${attempt}`);
      if (r.ok) {
        const response = JSON.parse(raw) as Record<string, unknown>;
        const d = (response.data && typeof response.data === "object"
          ? response.data
          : response) as Record<string, unknown>;
        const html = typeof d.html === "string" ? d.html : "";
        const text = typeof d.text === "string" ? d.text : "";
        const attachments = Array.isArray(d.attachments)
          ? d.attachments as ResendAttachment[]
          : [];
        if (html || text || attachments.length > 0) return { html, text, attachments };
      }
    } catch (e) {
      console.error("[inbound] Resend body lookup failed:", e instanceof Error ? e.message : "Unknown error");
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  return { html: "", text: "", attachments: [] };
}

async function downloadAttachment(
  emailId: string,
  attachment: ResendAttachment,
  apiKey: string,
): Promise<Buffer> {
  if (attachment.content) {
    const base64 = attachment.content.replace(/^data:[^,]+;base64,/, "");
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length > 25 * 1024 * 1024) throw new Error("Attachment exceeds the 25 MB limit");
    return bytes;
  }

  if (!emailId || !attachment.id) {
    throw new Error("Resend did not provide an attachment ID for secure retrieval");
  }
  const detailResponse = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachment.id)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!detailResponse.ok) {
    throw new Error(`Resend attachment lookup failed (${detailResponse.status})`);
  }
  const response = await detailResponse.json() as Record<string, unknown>;
  const detail = (response.data && typeof response.data === "object"
    ? response.data
    : response) as Record<string, unknown>;
  if (typeof detail.content === "string") {
    const bytes = Buffer.from(detail.content.replace(/^data:[^,]+;base64,/, ""), "base64");
    if (bytes.length > 25 * 1024 * 1024) throw new Error("Attachment exceeds the 25 MB limit");
    return bytes;
  }

  const downloadUrl = typeof detail.download_url === "string" ? detail.download_url : "";
  if (!downloadUrl) throw new Error("Resend did not provide attachment content or a download URL");
  const parsedUrl = new URL(downloadUrl);
  if (parsedUrl.protocol !== "https:") throw new Error("Attachment download URL must use HTTPS");

  const downloadResponse = await fetch(parsedUrl);
  if (!downloadResponse.ok) {
    throw new Error(`Resend attachment download failed (${downloadResponse.status})`);
  }
  const contentLength = Number(downloadResponse.headers.get("content-length") ?? 0);
  if (contentLength > 25 * 1024 * 1024) throw new Error("Attachment exceeds the 25 MB limit");
  const bytes = Buffer.from(await downloadResponse.arrayBuffer());
  if (bytes.length > 25 * 1024 * 1024) throw new Error("Attachment exceeds the 25 MB limit");
  return bytes;
}

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[inbound] RESEND_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook verification is not configured." }, { status: 503 });
    }
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("[inbound] RESEND_API_KEY is not configured");
      return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
    }

    const webhookHeaders = {
      id: req.headers.get("svix-id") ?? "",
      timestamp: req.headers.get("svix-timestamp") ?? "",
      signature: req.headers.get("svix-signature") ?? "",
    };
    if (!webhookHeaders.id || !webhookHeaders.timestamp || !webhookHeaders.signature) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    try {
      new Resend(resendApiKey).webhooks.verify({
        payload: rawPayload,
        headers: webhookHeaders,
        webhookSecret,
      });
    } catch {
      console.warn("[inbound] Rejected webhook with invalid signature");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }
    const body = parsedBody as Record<string, unknown>;
    if (body.type !== "email.received") {
      return NextResponse.json({ ok: true, ignored: true });
    }

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
    const webhookAttachments = Array.isArray(payload.attachments)
      ? payload.attachments as ResendAttachment[]
      : [];
    const needsAttachmentMetadata = webhookAttachments.some((attachment) =>
      !attachment.content,
    );
    const fetchedEmail = (!payloadHtml && !payloadText) || needsAttachmentMetadata
      ? await fetchResendEmailBody(emailId)
      : { html: "", text: "", attachments: [] };
    const fetchedHtml = fetchedEmail.html;
    const fetchedText = fetchedEmail.text;

    const bodyHtml = fetchedHtml || payloadHtml;
    const bodyText = fetchedText || payloadText;
    console.log(`[inbound] body availability payload_html=${!!payloadHtml} payload_text=${!!payloadText} fetched_html=${!!fetchedHtml} fetched_text=${!!fetchedText}`);

    const rawAttachments = [...webhookAttachments];
    for (const attachment of fetchedEmail.attachments) {
      if (!rawAttachments.some((item) =>
        (item.id && item.id === attachment.id) ||
        (!item.id && !attachment.id && item.filename && item.filename === attachment.filename),
      )) {
        rawAttachments.push(attachment);
      }
    }

    // Resend's receiving webhook often contains attachment metadata only; fetch
    // the file before storing it so the admin inbox can provide a stable link.
    const supabase = createAdminClient();
    type StoredAttachment = {
      filename: string;
      content_type: string;
      size: number;
      url: string;
      error?: string;
    };
    const storedAttachments: StoredAttachment[] = [];
    const resendKey = process.env.RESEND_API_KEY;
    for (const [index, att] of rawAttachments.entries()) {
      if (!att.filename) continue;
      try {
        if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
        if (!emailId && !att.content && !att.download_url) {
          throw new Error("The inbound message has no Resend email ID for retrieving this file");
        }
        const buf = await downloadAttachment(emailId, att, resendKey);
        if (buf.length > 25 * 1024 * 1024) throw new Error("Attachment exceeds the 25 MB limit");
        const safeName = att.filename.replace(/[^\w.\- ]/g, "_");
        const safeEmailId = (emailId || `webhook-${Date.now()}`).replace(/[^\w.-]/g, "_");
        const storagePath = `inbound-attachments/${safeEmailId}-${index}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("fl-matter-files")
          .upload(storagePath, buf, {
            contentType: att.content_type ?? "application/octet-stream",
            upsert: true,
          });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("fl-matter-files").getPublicUrl(storagePath);
          storedAttachments.push({
            filename: att.filename,
            content_type: att.content_type ?? "application/octet-stream",
            size: att.size ?? buf.length,
            url: publicUrl,
          });
        } else {
          throw new Error(`Storage upload failed: ${upErr.message}`);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[inbound] attachment retrieval failed:", { attachmentIndex: index, error: message });
        storedAttachments.push({
          filename: att.filename,
          content_type: att.content_type ?? "application/octet-stream",
          size: att.size ?? 0,
          url: "",
          error: message,
        });
      }
    }

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
      attachments: storedAttachments.length > 0 ? storedAttachments : null,
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
    if (resendKey && !isInternalSender && !spam) {
      const rawSubject = String(payload.subject ?? "(no subject)");
      // Strip any accumulated "New enquiry: " prefixes before adding one.
      const cleanSubject = rawSubject.replace(/^(New enquiry:\s*)+/i, "");
      const previewText = (bodyText || bodyHtml.replace(/<[^>]+>/g, "")).slice(0, 300) || "(no body)";
      const attLines = storedAttachments.length > 0
        ? `\n\nAttachments (${storedAttachments.length}):\n` + storedAttachments.map((a) => `  • ${a.filename} — ${a.url}`).join("\n")
        : "";
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Ferguson Law <contact@fergusonlawja.com>",
          to: [forwardTo],
          bcc: ["jordanroad631@gmail.com"],
          subject: storedAttachments.length > 0 ? `New enquiry (+${storedAttachments.length} attachment${storedAttachments.length > 1 ? "s" : ""}): ${cleanSubject}` : `New enquiry: ${cleanSubject}`,
          text: `New inbound message from ${fromName ? `${fromName} ` : ""}${fromEmail}\n\nSubject: ${cleanSubject}\n\n---\n${previewText}${attLines}`,
        }),
      }).catch((e) => console.error("inbound forward email error:", e));

      // WA alert to Owen+Jordan for every real inbound email
      const attNote = storedAttachments.length > 0
        ? ` (${storedAttachments.length} attachment${storedAttachments.length > 1 ? "s" : ""} attached — check admin inbox)`
        : "";
      void notifyOwenWA(
        `Ferguson Law — new email from ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}\nSubject: ${cleanSubject}${attNote}\n\nAdmin inbox: https://ferguson-law.com/admin?tab=email`,
      );
    }

    if (!isInternalSender && !spam) {
      void pushToAdmins(
        `New Email${fromName ? ` — ${fromName}` : ""}`,
        String(payload.subject ?? "(no subject)"),
        "/admin?tab=email",
        "fl-email",
      );
    }

    // Create ops_ticket and send ACK for non-spam external emails.
    if (!isInternalSender && !spam && fromEmail) {
      const { createHash } = await import("crypto");
      const ticketSourceKey = `email:${emailId || (fromEmail + ":" + Date.now())}`;
      const ticketId = "t_" + createHash("sha256").update(ticketSourceKey).digest("hex").slice(0, 16);
      const slaHours = 24;
      const ticketRow = {
        id: ticketId,
        source: "email",
        source_key: ticketSourceKey,
        client_name: fromName || fromEmail,
        contact: fromEmail,
        channel: "email",
        category: "inquiry",
        priority: "normal",
        summary: String(payload.subject ?? "(no subject)").slice(0, 200),
        body_text: (bodyText || bodyHtml.replace(/<[^>]+>/g, "")).slice(0, 4000),
        action_needed: null,
        sla_hours: slaHours,
        due_at: new Date(Date.now() + slaHours * 3600_000).toISOString(),
        gate: "approval",
        is_scam: false,
        state: "triaged",
        updated_at: new Date().toISOString(),
      };
      const { error: ticketErr } = await supabase
        .from("ops_tickets")
        .upsert(ticketRow, { onConflict: "source_key", ignoreDuplicates: true });
      if (ticketErr) {
        console.error("[inbound] ops_ticket insert error:", ticketErr.message);
      } else {
        console.log(`[inbound] ops_ticket created ${ticketId}`);
        // ACK email back to sender
        if (resendKey) {
          const senderFirst = (fromName || "").split(/[\s—-]+/).filter(Boolean)[0] || "there";
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Ferguson Law <contact@fergusonlawja.com>",
              to: [fromEmail],
              subject: `Re: ${String(payload.subject ?? "Your enquiry")}`,
              text: `Hi ${senderFirst},\n\nThank you for reaching out to Ferguson Law. We have received your message and will respond within 24 hours.\n\nReference: ${ticketId}\n\nKind regards,\nFerguson Law\n(658) 218-2282`,
            }),
          }).catch((e) => console.error("[inbound] ack email error:", e));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[inbound] webhook processing failed:", e instanceof Error ? e.message : "Unknown error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
