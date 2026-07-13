/**
 * POST /api/email/send
 * Send an outbound email from the admin inbox panel.
 * Body: { token, to, subject, body, replyToId? }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = "Owen Ferguson <owen@fergusonlawja.com>";

export async function POST(req: NextRequest) {
  try {
    const { token, to, subject, body, replyToId } = (await req.json()) as {
      token: string;
      to: string;
      subject: string;
      body: string;
      replyToId?: string;
    };

    if (!token || !to || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: isAdmin, error: authErr } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (authErr || !isAdmin) {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }

    if (!RESEND_KEY) {
      return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
    }

    const resend = new Resend(RESEND_KEY);
    const html = `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:Georgia,serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
<tr><td style="background:#10211c;padding:30px 36px;">
  <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a86a;">Ferguson Law</div>
</td></tr>
<tr><td style="padding:36px 36px 12px;">
  ${body.split("\n").map((p) => p.trim() ? `<p style="font-size:15px;line-height:1.75;margin:0 0 16px;color:#1c1c1c;">${p}</p>` : "<br/>").join("")}
</td></tr>
<tr><td style="padding:12px 36px 36px;">
  <hr style="border:none;border-top:1px solid #ece6da;margin:0 0 18px;"/>
  <p style="font-size:13px;color:#9a9a9a;margin:0;">
    Ferguson Law · Jamaica<br/>
    <a href="tel:+18768405862" style="color:#9a8f7a;">+1 876 840 5862</a> ·
    <a href="mailto:owen@fergusonlawja.com" style="color:#9a8f7a;">owen@fergusonlawja.com</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`;

    const { error: sendErr } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
      text: body,
      replyTo: "owen@fergusonlawja.com",
    });

    if (sendErr) {
      return NextResponse.json({ error: sendErr.message }, { status: 502 });
    }

    // Mark the source email as replied if provided
    if (replyToId) {
      await supabase
        .from("fl_inbound_emails")
        .update({ replied: true })
        .eq("id", replyToId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
