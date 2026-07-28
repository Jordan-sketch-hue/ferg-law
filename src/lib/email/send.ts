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
  meetingUrl?: string;
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

  const { to, name, service, whenLabel, ref, meetingUrl } = args;
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
      html: buildHtml({ firstName, service, whenLabel, ref, wa, meetingUrl }),
      text: buildText({ firstName, service, whenLabel, ref, wa, meetingUrl }),
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

export type SendNurtureEmailArgs = {
  to: string;
  name: string;
  intent?: string | null;
};

/** Lead nurture — sent 24-72h after a chat that didn't convert to a booking. */
export async function sendNurtureEmail(args: SendNurtureEmailArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };

  const { to, name, intent } = args;
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";
  const topic = intent ? ` about ${intent.toLowerCase()}` : "";
  const waMsg = `Hi Ferguson Law, I had a question${topic} and would like to continue.`;
  const wa = waLink(waMsg);
  const bookingUrl = SITE.bookingUrl;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
  </head>
  <body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
          <tr>
            <td style="background:#10211c;padding:34px 40px;">
              <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a86a;">Ferguson Law</div>
              <div style="font-size:13px;color:#9fb3ab;margin-top:6px;">${SITE.tagline}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:44px 40px 8px;">
              <p style="font-size:26px;line-height:1.3;margin:0 0 22px;color:#10211c;">Still have questions, ${escapeHtml(firstName)}?</p>
              <p style="font-size:16px;line-height:1.75;margin:0 0 28px;color:#3a3a3a;">
                You reached out to Ferguson Law${topic ? ` with a question${topic}` : ""} and we want to make sure you get the help you need. When you are ready, booking a consultation is the fastest way to get clear answers for your specific situation.
              </p>
              <p style="font-size:16px;line-height:1.75;margin:0 0 28px;color:#3a3a3a;">
                Every consultation is a flat J$8,000 for 20 minutes. Your fee is credited toward your legal work once you engage us.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 12px;" align="center">
              <a href="${bookingUrl}" style="display:inline-block;background:#c9a86a;color:#10211c;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 34px;border-radius:9px;">Book a consultation</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 40px 40px;">
              <p style="font-size:14px;line-height:1.65;margin:0 0 8px;color:#6b6b6b;">Prefer to message us directly?</p>
              <a href="${wa}" style="font-size:14px;color:#c9a86a;">WhatsApp: ${SITE.whatsappDisplay}</a>
              <hr style="border:none;border-top:1px solid #ece6da;margin:28px 0 18px;" />
              <p style="font-size:12px;line-height:1.6;margin:0;color:#aaa;">
                Ferguson Law, 22B Old Hope Road, Kingston 5, Jamaica.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `Still have questions, ${firstName}?`,
    ``,
    `You reached out to Ferguson Law${topic ? ` about${topic}` : ""} and we want to make sure you get the help you need.`,
    ``,
    `Book a consultation: ${bookingUrl}`,
    `Every consultation is a flat J$8,000 for 20 minutes. Your fee is credited toward your legal work once you engage us.`,
    ``,
    `WhatsApp: ${SITE.whatsappDisplay}`,
    ``,
    `Ferguson Law, 22B Old Hope Road, Kingston 5, Jamaica.`,
  ].join("\n");

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `Your question to Ferguson Law`,
      html,
      text,
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
  meetingUrl?: string;
}): string {
  const lead = d.lead || `You're booked, ${escapeHtml(d.firstName)}.`;
  const body =
    d.body ||
    (d.meetingUrl
      ? `Thank you for choosing Ferguson Law. Your consultation is reserved. Use the link below to join your video call at your scheduled time.`
      : `Thank you for choosing Ferguson Law. Your consultation is reserved. We'll send a secure intake link before we meet.`);
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
            ${d.meetingUrl ? `<tr>
              <td style="padding:28px 40px 0 40px;" align="center">
                <a href="${escapeHtml(d.meetingUrl)}" style="display:inline-block;background:#0B1E10;color:#C9A961;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 30px;border-radius:9px;">
                  Join Video Consultation
                </a>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding:${d.meetingUrl ? "16px" : "34px"} 40px 8px 40px;" align="center">
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
  meetingUrl?: string;
}): string {
  return [
    `You're booked, ${d.firstName}.`,
    ``,
    `Thank you for choosing Ferguson Law. Your consultation is reserved.`,
    d.meetingUrl
      ? `Use the link below to join your video call at your scheduled time.`
      : `We'll send a secure intake link before we meet.`,
    ``,
    `Service:   ${d.service}`,
    `When:      ${d.whenLabel}`,
    `Reference: ${d.ref}`,
    ...(d.meetingUrl ? [``, `Join video call: ${d.meetingUrl}`] : []),
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
