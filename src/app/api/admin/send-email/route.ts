import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.FERGUSON_FROM_EMAIL || "Ferguson Law <contact@fergusonlawja.com>";

function buildHtml(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
<tr><td style="background:#10211c;padding:30px 36px;">
  <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a86a;">Ferguson Law</div>
  <div style="font-size:12px;color:#9fb3ab;margin-top:5px;">Your trusted legal partner</div>
</td></tr>
<tr><td style="padding:36px 36px 12px;">
  ${body.split("\n").map((p) => p.trim() ? `<p style="font-size:15px;line-height:1.75;margin:0 0 16px;color:#1c1c1c;">${p}</p>` : "<br/>").join("")}
</td></tr>
<tr><td style="padding:12px 36px 36px;">
  <hr style="border:none;border-top:1px solid #ece6da;margin:0 0 18px;"/>
  <p style="font-size:13px;color:#9a9a9a;margin:0;">
    Ferguson Law &nbsp;·&nbsp; Jamaica<br/>
    <a href="tel:+18763200235" style="color:#9a8f7a;">(876) 320-0235</a> &nbsp;·&nbsp;
    <a href="mailto:contact@fergusonlawja.com" style="color:#9a8f7a;">contact@fergusonlawja.com</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let token: string, to: string, subject: string, body: string, replyTo: string | undefined;
    const attachments: { filename: string; path: string }[] = [];

    const admin = createAdminClient();

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      token = (form.get("token") as string) ?? "";
      to = (form.get("to") as string) ?? "";
      subject = (form.get("subject") as string) ?? "";
      body = (form.get("body") as string) ?? "";
      replyTo = (form.get("replyTo") as string) || undefined;

      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\- ]/g, "_");
        const path = `staff-email/${Date.now()}-${safeName}`;
        const { error: upErr } = await admin.storage.from("fl-matter-files").upload(path, file, { contentType: file.type });
        if (upErr) return NextResponse.json({ error: `Attachment upload failed: ${upErr.message}` }, { status: 502 });
        const { data: { publicUrl } } = admin.storage.from("fl-matter-files").getPublicUrl(path);
        attachments.push({ filename: file.name, path: publicUrl });
      }
    } else {
      const json = (await req.json()) as { token: string; to: string; subject: string; body: string; replyTo?: string };
      ({ token, to, subject, body, replyTo } = json);
    }

    if (!token || !to || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: isAdmin, error: authErr } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (authErr || !isAdmin) {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }

    if (!RESEND_KEY) {
      return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
    }

    const html = buildHtml(body);
    const payload: Record<string, unknown> = { from: FROM, to: [to], subject, html };
    if (replyTo) payload.reply_to = replyTo;
    if (attachments.length > 0) payload.attachments = attachments;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json({ error: `Send failed: ${txt.slice(0, 200)}` }, { status: 502 });
    }

    const resJson = (await res.json().catch(() => ({}))) as { id?: string };

    const bodyFull = attachments.length > 0
      ? `${body}\n\nAttachments: ${attachments.map(a => a.filename).join(", ")}`
      : body;

    const { error: logErr } = await admin.from("fl_email_log").insert({
      to_email: to,
      subject,
      body_preview: bodyFull.slice(0, 300),
      body_full: bodyFull,
      resend_id: resJson.id ?? null,
      context: (req.headers.get("x-email-context") as string | null) ?? "compose",
    });
    if (logErr) console.error("[send-email] fl_email_log insert failed:", logErr.message, logErr.code);

    return NextResponse.json({ ok: true, id: resJson.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
