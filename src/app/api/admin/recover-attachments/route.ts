/**
 * POST /api/admin/recover-attachments
 * Retroactively fetches attachments from Resend for emails that arrived
 * before the attachment-save code was deployed (pre Oct 29 2026).
 *
 * Auth: CRON_SECRET Bearer token OR FL admin token in body.token
 * Test mode: pass { "test": true } in body to log without writing to DB.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const RESEND_API = "https://api.resend.com";
const STORAGE_BUCKET = "fl-matter-files";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

type RecoveredAttachment = {
  filename: string;
  content_type: string;
  size: number;
  url: string;
  error?: string;
};

async function fetchResendInbound(emailId: string, apiKey: string) {
  const r = await fetch(`${RESEND_API}/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) return null;
  const raw = await r.json() as Record<string, unknown>;
  const d = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown>;
  return {
    html: typeof d.html === "string" ? d.html : "",
    text: typeof d.text === "string" ? d.text : "",
    attachments: Array.isArray(d.attachments) ? d.attachments as Array<{
      id?: string;
      filename?: string;
      content_type?: string;
      content?: string;
      download_url?: string;
      size?: number;
    }> : [],
  };
}

async function downloadAttachment(
  emailId: string,
  attIndex: number,
  att: { id?: string; filename?: string; content_type?: string; content?: string; download_url?: string; size?: number },
  apiKey: string,
): Promise<{ buf: Buffer; filename: string; contentType: string } | null> {
  const filename = att.filename || `attachment-${attIndex + 1}`;
  const contentType = att.content_type || "application/octet-stream";

  if (att.content) {
    try {
      const buf = Buffer.from(att.content, "base64");
      if (buf.length > 0 && buf.length <= MAX_ATTACHMENT_BYTES) return { buf, filename, contentType };
    } catch { /* fall through */ }
  }

  if (att.id) {
    try {
      const r = await fetch(`${RESEND_API}/emails/receiving/${emailId}/attachments/${att.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) {
        const data = await r.json() as { content?: string };
        if (data.content) {
          const buf = Buffer.from(data.content, "base64");
          if (buf.length > 0 && buf.length <= MAX_ATTACHMENT_BYTES) return { buf, filename, contentType };
        }
      }
    } catch { /* fall through */ }
  }

  if (att.download_url) {
    try {
      const r = await fetch(att.download_url);
      if (r.ok) {
        const arrayBuf = await r.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 0 && buf.length <= MAX_ATTACHMENT_BYTES) return { buf, filename, contentType };
      }
    } catch { /* fall through */ }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const body = await req.json().catch(() => ({})) as { test?: boolean; token?: string };
  const testMode = body.test === true;

  const supabase = createAdminClient();
  const { data: isAdmin } = body.token
    ? await supabase.rpc("fl_is_admin", { p_token: body.token })
    : { data: false };

  if (!isAdmin && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "RESEND_API_KEY not set" }, { status: 500 });

  const { data: rows, error: fetchErr } = await supabase
    .from("fl_inbound_emails")
    .select("id, email_id, from_email, subject, body_text, created_at")
    .not("email_id", "is", null)
    .is("attachments", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (fetchErr) return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ ok: true, processed: 0, message: "No candidates found" });

  const results: Array<{
    id: string;
    email_id: string;
    subject: string;
    status: "recovered" | "no_attachments" | "expired" | "skipped" | "error";
    attachments?: number;
    detail?: string;
  }> = [];

  for (const row of rows) {
    const emailId = row.email_id as string;
    let resendData: Awaited<ReturnType<typeof fetchResendInbound>>;
    try {
      resendData = await fetchResendInbound(emailId, apiKey);
    } catch (e) {
      results.push({ id: row.id, email_id: emailId, subject: row.subject, status: "error", detail: String(e) });
      continue;
    }

    if (!resendData) {
      results.push({ id: row.id, email_id: emailId, subject: row.subject, status: "expired", detail: "Resend 404 - email not found" });
      continue;
    }

    if (resendData.attachments.length === 0) {
      results.push({ id: row.id, email_id: emailId, subject: row.subject, status: "no_attachments" });
      continue;
    }

    if (testMode) {
      results.push({
        id: row.id, email_id: emailId, subject: row.subject, status: "skipped",
        attachments: resendData.attachments.length,
        detail: `TEST MODE - ${resendData.attachments.length} attachment(s) found, not saved`,
      });
      continue;
    }

    const safeEmailId = emailId.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const stored: RecoveredAttachment[] = [];

    for (let i = 0; i < resendData.attachments.length; i++) {
      const att = resendData.attachments[i];
      try {
        const downloaded = await downloadAttachment(emailId, i, att, apiKey);
        if (!downloaded) {
          stored.push({ filename: att.filename || `att-${i}`, content_type: att.content_type || "application/octet-stream", size: 0, url: "", error: "download failed" });
          continue;
        }
        const safeName = downloaded.filename.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
        const storagePath = `inbound-attachments/${safeEmailId}-${i}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, downloaded.buf, { contentType: downloaded.contentType, upsert: false });

        if (upErr && !upErr.message.includes("already exists")) {
          stored.push({ filename: downloaded.filename, content_type: downloaded.contentType, size: downloaded.buf.length, url: "", error: upErr.message });
        } else {
          const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
          stored.push({ filename: downloaded.filename, content_type: downloaded.contentType, size: downloaded.buf.length, url: pub.publicUrl });
        }
      } catch (e) {
        stored.push({ filename: att.filename || `att-${i}`, content_type: att.content_type || "application/octet-stream", size: 0, url: "", error: String(e) });
      }
    }

    await supabase.from("fl_inbound_emails").update({ attachments: stored }).eq("id", row.id);

    results.push({
      id: row.id, email_id: emailId, subject: row.subject, status: "recovered",
      attachments: stored.length,
      detail: `${stored.filter(a => a.url).length}/${stored.length} files saved`,
    });

    await new Promise(r => setTimeout(r, 300));
  }

  const recovered = results.filter(r => r.status === "recovered").length;
  const expired = results.filter(r => r.status === "expired").length;
  const none = results.filter(r => r.status === "no_attachments").length;

  return NextResponse.json({ ok: true, testMode, processed: rows.length, recovered, expired, no_attachments: none, results });
}
