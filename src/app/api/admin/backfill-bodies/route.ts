/**
 * POST /api/admin/backfill-bodies
 * Re-fetches body_text + body_html from Resend for emails stored with empty bodies.
 * Uses GET /emails/receiving/{email_id} - the correct inbound endpoint.
 * Test mode: pass { "test": true } to preview without writing.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { test?: boolean };
  const testMode = body.test === true;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "RESEND_API_KEY not set" }, { status: 500 });

  const supabase = createAdminClient();

  // Rows with email_id but empty body
  const { data: rows, error } = await supabase
    .from("fl_inbound_emails")
    .select("id, email_id, subject, from_email")
    .not("email_id", "is", null)
    .or("body_text.is.null,body_text.eq.")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ ok: true, processed: 0, message: "No empty-body rows found" });

  const results: Array<{
    id: string;
    subject: string;
    status: "filled" | "still_empty" | "expired" | "skipped" | "error";
    chars?: number;
  }> = [];

  for (const row of rows) {
    const emailId = row.email_id as string;

    let resendBody: { html: string; text: string } | null = null;
    try {
      const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!r.ok) {
        results.push({ id: row.id, subject: row.subject, status: "expired" });
        continue;
      }
      const raw = await r.json() as Record<string, unknown>;
      const d = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown>;
      resendBody = {
        html: typeof d.html === "string" ? d.html : "",
        text: typeof d.text === "string" ? d.text : "",
      };
    } catch (e) {
      results.push({ id: row.id, subject: row.subject, status: "error" });
      continue;
    }

    if (!resendBody.html && !resendBody.text) {
      results.push({ id: row.id, subject: row.subject, status: "still_empty" });
      continue;
    }

    if (testMode) {
      results.push({ id: row.id, subject: row.subject, status: "skipped", chars: (resendBody.text || resendBody.html).length });
      continue;
    }

    await supabase.from("fl_inbound_emails")
      .update({ body_text: resendBody.text, body_html: resendBody.html })
      .eq("id", row.id);

    results.push({ id: row.id, subject: row.subject, status: "filled", chars: resendBody.text.length });
    await new Promise(r => setTimeout(r, 200));
  }

  const filled = results.filter(r => r.status === "filled").length;
  const expired = results.filter(r => r.status === "expired").length;

  return NextResponse.json({ ok: true, testMode, processed: rows.length, filled, expired, results });
}