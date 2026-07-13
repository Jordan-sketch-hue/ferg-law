import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { notifyOwenWA } from "@/lib/wa-notify";
import { SITE } from "@/lib/site";

const INTEREST_LABELS: Record<string, string> = {
  consultation: "Book a consultation",
  conveyancing: "Property conveyancing / title transfer",
  "home-listing": "Join the H.O.M.E. professional directory",
  corporate: "Corporate & commercial law",
  family: "Family law",
  other: "Other enquiry",
};

export async function POST(req: NextRequest) {
  const { name, email, interest } = await req.json().catch(() => ({}));
  if (!name || !email) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: true, skipped: true });

  const resend = new Resend(key);
  const interestLabel = INTEREST_LABELS[interest] ?? interest ?? "General enquiry";

  // 1. Notify Owen
  await resend.emails.send({
    from: "Ferguson Law <info@fergusonlawja.com>",
    to: ["owen@fergusonlawja.com", "contact@fergusonlawja.com"],
    replyTo: email,
    subject: `New enquiry: ${name} — ${interestLabel}`,
    html: notifyHtml({ name, email, interestLabel }),
    text: `New website enquiry\n\nName: ${name}\nEmail: ${email}\nInterest: ${interestLabel}`,
  });

  // 2. Acknowledge to client — reply-to sends responses back to contact@
  await resend.emails.send({
    from: "Ferguson Law <contact@fergusonlawja.com>",
    to: email,
    replyTo: "contact@fergusonlawja.com",
    subject: "We received your message — Ferguson Law",
    html: ackHtml({ name, interestLabel }),
    text: ackText({ name, interestLabel }),
  });

  void notifyOwenWA(`🔔 *New website enquiry*\n${name} · ${interestLabel}\n${email}`);
  return NextResponse.json({ ok: true });
}

function notifyHtml({ name, email, interestLabel }: { name: string; email: string; interestLabel: string }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
<tr><td style="background:#1C3A28;padding:28px 36px;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4922a;">Ferguson Law — New Enquiry</div>
</td></tr>
<tr><td style="padding:32px 36px;">
  <p style="font-size:22px;margin:0 0 20px;color:#1C3A28;">New website lead</p>
  <table role="presentation" width="100%" style="background:#f8f6f1;border:1px solid #ece6da;border-radius:10px;"><tr><td style="padding:20px 22px;">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;">Name</p>
    <p style="margin:0 0 18px;font-size:17px;color:#1c1c1c;">${name}</p>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;">Email</p>
    <p style="margin:0 0 18px;font-size:17px;color:#1c1c1c;"><a href="mailto:${email}" style="color:#c4922a;">${email}</a></p>
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;">Interest</p>
    <p style="margin:0;font-size:17px;color:#1c1c1c;">${interestLabel}</p>
  </td></tr></table>
  <p style="font-size:13px;color:#9a9a9a;margin:20px 0 0;">Reply directly to this email to respond to the client.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function ackHtml({ name, interestLabel }: { name: string; interestLabel: string }) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
<tr><td style="background:#1C3A28;padding:34px 40px;">
  <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c4922a;">Ferguson Law</div>
  <div style="font-size:13px;color:rgba(255,255,255,.5);margin-top:6px;">${SITE.tagline}</div>
</td></tr>
<tr><td style="padding:44px 40px 8px;">
  <p style="font-size:26px;line-height:1.3;margin:0 0 20px;color:#1C3A28;">Thank you, ${first}.</p>
  <p style="font-size:16px;line-height:1.75;margin:0 0 24px;color:#3a3a3a;">
    We've received your enquiry about <strong>${interestLabel}</strong>. A member of our team will be in touch within one business day.
  </p>
  <p style="font-size:16px;line-height:1.75;margin:0 0 28px;color:#3a3a3a;">
    In the meantime, feel free to reply to this email or reach us on WhatsApp.
  </p>
</td></tr>
<tr><td style="padding:0 40px 40px;">
  <hr style="border:none;border-top:1px solid #ece6da;margin:0 0 22px;" />
  <p style="font-size:14px;line-height:1.7;margin:0;color:#6a6a6a;">
    <strong style="color:#3a3a3a;">${SITE.whatsappDisplay}</strong> &nbsp;·&nbsp;
    <a href="mailto:contact@fergusonlawja.com" style="color:#8a7a52;">contact@fergusonlawja.com</a>
  </p>
  <p style="font-size:13px;line-height:1.6;margin:14px 0 0;color:#9a9a9a;">${SITE.founder} &nbsp;·&nbsp; ${SITE.city}</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

function ackText({ name, interestLabel }: { name: string; interestLabel: string }) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return [
    `Thank you, ${first}.`,
    ``,
    `We've received your enquiry about: ${interestLabel}`,
    `A member of our team will be in touch within one business day.`,
    ``,
    `Feel free to reply to this email or reach us on WhatsApp:`,
    `${SITE.whatsappDisplay} · contact@fergusonlawja.com`,
    ``,
    `${SITE.founder} · ${SITE.city}`,
  ].join("\n");
}
