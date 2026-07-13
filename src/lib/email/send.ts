/**
 * Booking confirmation email (Resend). Server-only.
 *
 * No-ops gracefully when RESEND_API_KEY is unset so local/dev bookings still
 * succeed. The caller treats any failure as non-fatal — a booking is never
 * blocked by email.
 */
import { Resend } from "resend";
import { SITE, waLink } from "@/lib/site";

export type SendBookingConfirmationArgs = {
  to: string;
  name: string;
  service: string;
  whenLabel: string;
  ref: string;
};

export type SendResult =
  | { skipped: true }
  | { ok: true; id?: string }
  | { ok: false; error: string };

const FROM = process.env.FERGUSON_FROM_EMAIL || "Ferguson Law <contact@fergusonlawja.com>";

export async function sendBookingConfirmation(
  args: SendBookingConfirmationArgs,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };

  const { to, name, service, whenLabel, ref } = args;
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";

  const wa = waLink(
    `Hi Ferguson Law — confirming my consultation.\nRef: ${ref}\nService: ${service}\nWhen: ${whenLabel}`,
  );

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `Consultation booked — ${ref}`,
      html: buildHtml({ firstName, service, whenLabel, ref, wa }),
      text: buildText({ firstName, service, whenLabel, ref, wa }),
    });
    if (error) return { ok: false, error: error.message || String(error) };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type SendBookingReminderArgs = SendBookingConfirmationArgs & {
  kind: "24h" | "1h";
};

/** Automatic appointment reminder (24h + 1h before). Same graceful no-op. */
export async function sendBookingReminder(
  args: SendBookingReminderArgs,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };

  const { to, name, service, whenLabel, ref, kind } = args;
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";
  const soon = kind === "1h" ? "in about an hour" : "tomorrow";
  const wa = waLink(
    `Hi Ferguson Law — about my consultation.\nRef: ${ref}\nService: ${service}\nWhen: ${whenLabel}`,
  );

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject:
        kind === "1h"
          ? `Reminder — your consultation is ${soon} (${ref})`
          : `Reminder — your consultation is ${soon} (${ref})`,
      html: buildHtml({
        firstName,
        service,
        whenLabel,
        ref,
        wa,
        lead: `A quick reminder, ${escapeHtml(firstName)}.`,
        body: `Your Ferguson Law consultation is <strong>${soon}</strong>. The details are below — reply or tap WhatsApp if anything needs to change.`,
      }),
      text: buildText({ firstName, service, whenLabel, ref, wa }),
    });
    if (error) return { ok: false, error: error.message || String(error) };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Password-reset / set-your-password link (partners + admins). Graceful no-op without a key. */
export async function sendPasswordReset(args: {
  to: string;
  link: string;
  scope: "partner" | "admin";
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };

  const { to, link, scope } = args;
  const who = scope === "admin" ? "your Ferguson Law back-office account" : "your Ferguson Law partner account";
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
      <tr><td style="background:#10211c;padding:34px 40px;">
        <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a86a;">Ferguson Law</div>
        <div style="font-size:13px;color:#9fb3ab;margin-top:6px;">${SITE.tagline}</div>
      </td></tr>
      <tr><td style="padding:44px 40px 8px;">
        <p style="font-size:26px;line-height:1.3;margin:0 0 20px;color:#10211c;">Set a new password</p>
        <p style="font-size:16px;line-height:1.75;margin:0 0 28px;color:#3a3a3a;">
          We received a request to set the password for ${who}. Tap the button below to choose a new one. This link expires in one hour and can be used once. If you didn't request this, you can safely ignore this email.
        </p>
      </td></tr>
      <tr><td style="padding:0 40px 8px;" align="center">
        <a href="${link}" style="display:inline-block;background:#c9a86a;color:#10211c;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 34px;border-radius:9px;">Set my password</a>
      </td></tr>
      <tr><td style="padding:26px 40px 40px;">
        <hr style="border:none;border-top:1px solid #ece6da;margin:0 0 18px;" />
        <p style="font-size:13px;line-height:1.6;margin:0;color:#9a9a9a;word-break:break-all;">
          Or paste this link into your browser:<br />${link}
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = [
    `Set a new password for ${who}.`,
    ``,
    `Open this link (expires in 1 hour, single use):`,
    link,
    ``,
    `If you didn't request this, ignore this email.`,
  ].join("\n");

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: "Set your Ferguson Law password",
      html,
      text,
    });
    if (error) return { ok: false, error: error.message || String(error) };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function buildHtml(d: {
  firstName: string;
  service: string;
  whenLabel: string;
  ref: string;
  wa: string;
  lead?: string;
  body?: string;
}): string {
  const lead = d.lead || `You're booked, ${escapeHtml(d.firstName)}.`;
  const body =
    d.body ||
    `Thank you for choosing Ferguson Law. Your consultation is reserved. We'll send a secure intake link before we meet.`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
  </head>
  <body style="margin:0;padding:0;background:#f4f1ec !important;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
            <tr>
              <td style="background:#10211c !important;padding:34px 40px;text-align:left;mso-padding-alt:34px 40px;">
                <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a86a;">Ferguson Law</div>
                <div style="font-size:13px;color:#9fb3ab;margin-top:6px;">${SITE.tagline}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:44px 40px 8px 40px;">
                <p style="font-size:26px;line-height:1.3;margin:0 0 22px 0;color:#10211c;">
                  ${lead}
                </p>
                <p style="font-size:16px;line-height:1.75;margin:0 0 28px 0;color:#3a3a3a;">
                  ${body}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;border:1px solid #ece6da;border-radius:10px;">
                  <tr>
                    <td style="padding:24px 26px;">
                      ${row("Service", escapeHtml(d.service))}
                      ${row("When", escapeHtml(d.whenLabel))}
                      ${row("Reference", `<span style="font-family:'Courier New',monospace;letter-spacing:1px;color:#10211c;">${escapeHtml(d.ref)}</span>`)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 40px 8px 40px;" align="center">
                <a href="${d.wa}" style="display:inline-block;background:#c9a86a;color:#10211c;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 30px;border-radius:9px;">
                  Confirm on WhatsApp
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 40px 40px 40px;">
                <hr style="border:none;border-top:1px solid #ece6da;margin:0 0 22px 0;" />
                <p style="font-size:14px;line-height:1.7;margin:0;color:#6a6a6a;">
                  Need to make a change? Reach us any time.<br />
                  <strong style="color:#3a3a3a;">${SITE.whatsappDisplay}</strong> &nbsp;·&nbsp;
                  <a href="mailto:${SITE.email}" style="color:#8a7a52;">${SITE.email}</a>
                </p>
                <p style="font-size:13px;line-height:1.6;margin:18px 0 0 0;color:#9a9a9a;">
                  ${SITE.founder} &nbsp;·&nbsp; ${SITE.city}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function row(k: string, v: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;">
    <tr>
      <td style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;padding:0 0 4px 0;">${k}</td>
    </tr>
    <tr>
      <td style="font-size:17px;color:#1c1c1c;">${v}</td>
    </tr>
  </table>`;
}

function buildText(d: {
  firstName: string;
  service: string;
  whenLabel: string;
  ref: string;
  wa: string;
}): string {
  return [
    `You're booked, ${d.firstName}.`,
    ``,
    `Thank you for choosing Ferguson Law. Your consultation is reserved.`,
    `We'll send a secure intake link before we meet.`,
    ``,
    `Service:   ${d.service}`,
    `When:      ${d.whenLabel}`,
    `Reference: ${d.ref}`,
    ``,
    `Confirm on WhatsApp: ${d.wa}`,
    ``,
    `Need to make a change? Reach us any time.`,
    `${SITE.whatsappDisplay} · ${SITE.email}`,
    `${SITE.founder} · ${SITE.city}`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
