/**
 * Case Management System notification emails (Resend). Server-only.
 * Same graceful no-op behavior as email/send.ts when RESEND_API_KEY is unset.
 */
import { Resend } from "resend";
import { SITE, waLink } from "@/lib/site";

const FROM = process.env.FERGUSON_FROM_EMAIL || "Ferguson Law <noreply@fergusonlawja.com>";

export type SendResult =
  | { skipped: true }
  | { ok: true; id?: string }
  | { ok: false; error: string };

function shell(lead: string, body: string, ctaLabel: string, ctaHref: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
<tr><td style="background:#10211c;padding:34px 40px;">
  <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a86a;">Ferguson Law</div>
  <div style="font-size:13px;color:#9fb3ab;margin-top:6px;">Case update</div>
</td></tr>
<tr><td style="padding:40px 40px 8px;">
  <p style="font-size:22px;line-height:1.35;margin:0 0 18px;color:#10211c;">${lead}</p>
  <p style="font-size:15.5px;line-height:1.75;margin:0 0 26px;color:#3a3a3a;">${body}</p>
</td></tr>
<tr><td style="padding:0 40px 8px;" align="center">
  <a href="${ctaHref}" style="display:inline-block;background:#c9a86a;color:#10211c;text-decoration:none;font-size:14px;font-weight:bold;padding:13px 28px;border-radius:9px;">${ctaLabel}</a>
</td></tr>
<tr><td style="padding:30px 40px 40px;">
  <hr style="border:none;border-top:1px solid #ece6da;margin:0 0 18px;"/>
  <p style="font-size:13px;color:#9a9a9a;margin:0;">
    Ferguson Law &nbsp;·&nbsp; ${SITE.whatsappDisplay} &nbsp;·&nbsp;
    <a href="mailto:${SITE.email}" style="color:#9a8f7a;">${SITE.email}</a>
  </p>
</td></tr>
</table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) return { ok: false, error: error.message || String(error) };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const PORTAL_URL = "https://fergusonlawja.com/directory/client";

export function sendWelcomeToClient(to: string, clientName: string) {
  return send(
    to,
    "Welcome to Ferguson Law — your client portal is ready",
    shell(
      `Welcome, ${escapeHtml(clientName.split(" ")[0])}.`,
      `Your Ferguson Law client account is set up and ready. Once we open your matter you'll be able to track every step, send messages and upload documents — all from your secure portal. We'll be in touch shortly.`,
      "Go to my portal",
      PORTAL_URL,
    ),
  );
}

export function sendKycSubmittedToStaff(clientName: string, clientEmail: string) {
  return send(
    process.env.FERGUSON_STAFF_EMAIL || "contact@fergusonlawja.com",
    `KYC submitted — ${clientName}`,
    shell(
      "A client just submitted their KYC.",
      `${escapeHtml(clientName)} (${escapeHtml(clientEmail)}) has submitted their identity documents and KYC information. Review it in the admin CMS.`,
      "Review KYC",
      "https://fergusonlawja.com/admin",
    ),
  );
}

export function sendMilestoneUpdate(to: string, matterTitle: string, milestoneName: string) {
  return send(
    to,
    `Update on your matter — ${matterTitle}`,
    shell(
      "A step just moved forward.",
      `<strong>${escapeHtml(milestoneName)}</strong> has been completed on your matter, <em>${escapeHtml(matterTitle)}</em>. Log in to your client portal any time to see the full timeline.`,
      "View my matter",
      PORTAL_URL,
    ),
  );
}

export function sendNewMessageToClient(to: string, matterTitle: string) {
  return send(
    to,
    `New message from Ferguson Law — ${matterTitle}`,
    shell(
      "You have a new message.",
      `Ferguson Law sent you an update on <em>${escapeHtml(matterTitle)}</em>. Reply directly in your client portal.`,
      "Read message",
      PORTAL_URL,
    ),
  );
}

export function sendNewMessageToStaff(matterTitle: string, clientName: string) {
  return send(
    SITE.email,
    `New client message — ${matterTitle}`,
    shell(
      "A client just messaged in.",
      `${escapeHtml(clientName)} sent a new message on <em>${escapeHtml(matterTitle)}</em>. Open the Case Management tab to reply.`,
      "Open admin",
      "https://fergusonlawja.com/admin",
    ),
  );
}

export function sendFileUploadedToStaff(matterTitle: string, clientName: string, fileName: string) {
  return send(
    SITE.email,
    `Client uploaded a file — ${matterTitle}`,
    shell(
      "A new file just came in.",
      `${escapeHtml(clientName)} uploaded <strong>${escapeHtml(fileName)}</strong> to <em>${escapeHtml(matterTitle)}</em>.`,
      "Open admin",
      "https://fergusonlawja.com/admin",
    ),
  );
}

export function sendPaymentConfirmedInternal(matterTitle: string, amountJmd: number, kind: string) {
  return send(
    SITE.email,
    `Payment confirmed — issue receipt for ${matterTitle}`,
    shell(
      "A payment was just confirmed.",
      `A <strong>${escapeHtml(kind)}</strong> payment of <strong>JMD ${amountJmd.toLocaleString()}</strong> was confirmed on <em>${escapeHtml(matterTitle)}</em>. Issue the formal receipt from the Payments panel when ready.`,
      "Issue receipt",
      "https://fergusonlawja.com/admin",
    ),
  );
}

export function sendReceiptToClient(to: string, matterTitle: string, receiptNumber: string, amountJmd: number) {
  const wa = waLink(`Hi Ferguson Law — following up on receipt ${receiptNumber} for ${matterTitle}.`);
  return send(
    to,
    `Receipt ${receiptNumber} — ${matterTitle}`,
    shell(
      "Your receipt is ready.",
      `We've confirmed your payment of <strong>JMD ${amountJmd.toLocaleString()}</strong> on <em>${escapeHtml(matterTitle)}</em>. Receipt number <strong>${escapeHtml(receiptNumber)}</strong> is on file. Reach us on WhatsApp if you'd like a PDF copy sent separately.`,
      "Message us on WhatsApp",
      wa,
    ),
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
