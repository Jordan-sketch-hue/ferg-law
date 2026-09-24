/**
 * POST /api/blast/send
 * Sends personalized partner invite emails via Resend.
 * Body: { token, recipients: [{name, email}], subject }
 */
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FROM = "Ferguson Law <contact@fergusonlawja.com>";
const REPLY_TO = "contact@fergusonlawja.com";

function buildEmail(name: string): string {
  const greeting = name?.trim() ? `Dear ${name.trim().split(" ")[0]},` : "Dear Real Estate Professional,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="format-detection" content="telephone=no,email=no,address=no">
</head>
<body style="margin:0;padding:0;background:#f2f0eb;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0eb;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

  <tr>
    <td bgcolor="#1a3828" style="background-color:#1a3828;padding:28px 40px;">
      <p style="margin:0;font-family:Georgia,serif;font-size:11px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;">Ferguson Law</p>
      <p style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Professional Partnership<br>Invitation</p>
    </td>
  </tr>

  <tr><td style="background:#c9a84c;height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>

  <tr>
    <td style="padding:0;line-height:0;">
      <img src="https://ibtadbwtrxglujkzqofs.supabase.co/storage/v1/object/public/fl-matter-files/email/hero-consult-hd.jpg"
           alt="Legal consultation at Ferguson Law"
           width="600"
           style="display:block;width:100%;max-width:600px;border:0;" />
    </td>
  </tr>

  <tr>
    <td style="padding:36px 40px 24px;">
      <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:15px;color:#1a3828;line-height:1.7;">${greeting}</p>
      <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:15px;color:#333333;line-height:1.7;">Every deal you close is a reflection of your professionalism. When it is time to sign, the legal process can make or break the experience for your clients — and your reputation along with it.</p>
      <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:15px;color:#333333;line-height:1.7;">We are inviting licensed real estate agents across Jamaica to join the <strong>Ferguson Law Partner Directory</strong>. Register once and start directing your buyers and sellers to a legal team built for speed, security, and a seamless close.</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#333333;line-height:1.7;">Your clients deserve a frictionless path to ownership. You deserve a legal partner who helps you deliver it.</p>
    </td>
  </tr>

  <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e4dc;margin:0;" /></td></tr>

  <tr>
    <td style="padding:28px 40px;">
      <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;">What Your Clients Gain</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 16px 0 0;width:50%;vertical-align:top;">
            <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:14px;font-weight:700;color:#1a3828;">Secure Conveyancing</p>
            <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:13px;color:#555555;line-height:1.6;">Title transfers, sale agreements, and due diligence handled with precision — no loose ends at closing.</p>
            <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:14px;font-weight:700;color:#1a3828;">H.O.M.E. Program</p>
            <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#555555;line-height:1.6;">Seamless legal support for diaspora and overseas buyers navigating Jamaican property law from abroad.</p>
          </td>
          <td style="padding:0 0 0 16px;width:50%;vertical-align:top;">
            <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:14px;font-weight:700;color:#1a3828;">Efficient Contracts</p>
            <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:13px;color:#555555;line-height:1.6;">Agreements drafted quickly and correctly so deals move forward, not backward.</p>
            <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:14px;font-weight:700;color:#1a3828;">Clear Communication</p>
            <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#555555;line-height:1.6;">Proactive updates at every stage — your clients are never left wondering where their transaction stands.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e4dc;margin:0;" /></td></tr>

  <tr>
    <td style="padding:28px 40px 0;">
      <img src="https://ibtadbwtrxglujkzqofs.supabase.co/storage/v1/object/public/fl-matter-files/email/couple-keys-hd.jpg"
           alt="Clients receiving keys"
           width="520"
           style="display:block;width:100%;max-width:520px;border:0;border-radius:2px;" />
    </td>
  </tr>

  <tr>
    <td style="padding:28px 40px 24px;">
      <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;">Why Top Agents Partner With Us</p>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:14px;color:#333333;line-height:1.7;">&bull;&nbsp; Priority scheduling for every client you refer</p>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:14px;color:#333333;line-height:1.7;">&bull;&nbsp; A dedicated liaison who keeps you in the loop on every matter</p>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:14px;color:#333333;line-height:1.7;">&bull;&nbsp; Co-branded referral materials you can share directly with clients</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#333333;line-height:1.7;">&bull;&nbsp; Deals that close on time — protecting your commissions and your relationships</p>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 40px 40px;text-align:center;">
      <a href="https://fergusonlawja.com/directory"
         style="display:inline-block;background:#c9a84c;color:#1a3828;font-family:Georgia,serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 40px;">
        Join the Partner Directory
      </a>
      <p style="margin:16px 0 0;font-family:Georgia,serif;font-size:12px;color:#888888;">fergusonlawja.com/directory</p>
    </td>
  </tr>

  <tr><td style="background:#c9a84c;height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>

  <tr>
    <td bgcolor="#1a3828" style="background-color:#1a3828;padding:24px 40px;text-align:center;">
      <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:13px;color:#c9a84c;letter-spacing:1px;">Ferguson Law</p>
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:12px;color:#aaaaaa;line-height:1.6;">contact@fergusonlawja.com &nbsp;|&nbsp; +1 876 320 0235</p>
      <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:11px;color:#666666;">fergusonlawja.com</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:10px;color:#888888;line-height:1.6;">You received this message because your contact details are publicly listed as a licensed real estate professional in Jamaica.<br>To opt out of future correspondence, reply with "unsubscribe" or email contact@fergusonlawja.com.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const { recipients, subject } = (await req.json()) as {
    recipients: { name: string; email: string }[];
    subject: string;
  };

  if (!recipients?.length || !subject) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];

  for (const recipient of recipients) {
    try {
      await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: recipient.email,
        subject,
        html: buildEmail(recipient.name),
      });
      results.push({ email: recipient.email, status: "sent" });
      // Small delay to avoid Resend rate limits
      await new Promise((r) => setTimeout(r, 120));
    } catch (err) {
      results.push({ email: recipient.email, status: "failed", error: String(err) });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({ sent, failed, results });
}
