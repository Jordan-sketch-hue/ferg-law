/**
 * POST /api/admin/backfill-resend-received
 * Admin-only: calls Resend's inbound email receiving API to retrieve body content
 * for rows in fl_inbound_emails that have an email_id but no body.
 *
 * Resend stores received emails and their bodies accessible via
 * GET /emails/receiving (list) or the individual email endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface ResendReceivedEmail {
  id: string;
  from?: string;
  to?: string[];
  subject?: string;
  html?: string;
  text?: string;
  created_at?: string;
}

async function fetchResendReceived(key: string): Promise<ResendReceivedEmail[]> {
  // Try the receiving-specific list endpoint first
  const r = await fetch("https://api.resend.com/emails/receiving?limit=100", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const raw = await r.text();
  console.log(`RESEND_RECEIVING status=${r.status} body_preview=${raw.slice(0, 300)}`);
  if (!r.ok) return [];
  const parsed = JSON.parse(raw) as { data?: ResendReceivedEmail[] } | ResendReceivedEmail[];
  return Array.isArray(parsed) ? parsed : (parsed.data ?? []);
}

async function fetchResendEmailById(key: string, emailId: string): Promise<{ html: string; text: string } | null> {
  // Try outbound endpoint first
  const r1 = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const raw1 = await r1.text();
  console.log(`RESEND_BY_ID_OUTBOUND id=${emailId} status=${r1.status} preview=${raw1.slice(0, 200)}`);
  if (r1.ok) {
    const d = JSON.parse(raw1) as Record<string, unknown>;
    const html = typeof d.html === "string" ? d.html : "";
    const text = typeof d.text === "string" ? d.text : "";
    if (html || text) return { html, text };
  }

  // Try receiving-specific endpoint
  const r2 = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const raw2 = await r2.text();
  console.log(`RESEND_BY_ID_RECEIVING id=${emailId} status=${r2.status} preview=${raw2.slice(0, 200)}`);
  if (r2.ok) {
    const d = JSON.parse(raw2) as Record<string, unknown>;
    const html = typeof d.html === "string" ? d.html : "";
    const text = typeof d.text === "string" ? d.text : "";
    if (html || text) return { html, text };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: valid } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });

  // Find rows with email_id but no body
  const { data: rows, error: dbErr } = await supabase
    .from("fl_inbound_emails")
    .select("id, email_id, from_email, subject, body_text, body_html")
    .not("email_id", "is", null)
    .or("body_text.is.null,body_text.eq.")
    .order("created_at", { ascending: false })
    .limit(50);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const targets = (rows ?? []).filter(
    (r) => r.email_id && !r.body_text?.trim() && !r.body_html?.trim()
  );

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, message: "No rows need backfill", processed: 0 });
  }

  // Try listing all received emails first to batch match
  const receivedList = await fetchResendReceived(key);
  const receivedByIdMap = new Map<string, ResendReceivedEmail>();
  for (const e of receivedList) {
    if (e.id) receivedByIdMap.set(e.id, e);
  }

  const results: { id: string; email_id: string; subject: string; fixed: boolean; method: string }[] = [];

  for (const row of targets) {
    const emailId = row.email_id as string;
    let bodyHtml = "";
    let bodyText = "";
    let method = "none";

    // Try list match first
    const fromList = receivedByIdMap.get(emailId);
    if (fromList) {
      bodyHtml = fromList.html ?? "";
      bodyText = fromList.text ?? "";
      method = "list";
    }

    // If not found in list, try direct fetch
    if (!bodyHtml && !bodyText) {
      const direct = await fetchResendEmailById(key, emailId);
      if (direct) {
        bodyHtml = direct.html;
        bodyText = direct.text;
        method = "direct";
      }
    }

    if (bodyHtml || bodyText) {
      await supabase
        .from("fl_inbound_emails")
        .update({
          ...(bodyHtml ? { body_html: bodyHtml } : {}),
          ...(bodyText ? { body_text: bodyText } : {}),
        })
        .eq("id", row.id);
      results.push({ id: row.id, email_id: emailId, subject: row.subject, fixed: true, method });
    } else {
      results.push({ id: row.id, email_id: emailId, subject: row.subject, fixed: false, method });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: targets.length,
    fixed: results.filter((r) => r.fixed).length,
    results,
    resend_list_count: receivedList.length,
  });
}
