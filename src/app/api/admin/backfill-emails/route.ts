/**
 * POST /api/admin/backfill-emails
 * Admin-only: fetches body content from Resend API for emails that have
 * an email_id stored but no body_html or body_text.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface EmailRow {
  id: string;
  email_id: string | null;
  body_html: string | null;
  body_text: string | null;
}

async function fetchBodyFromResend(emailId: string): Promise<{ html: string; text: string; status: number }> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !emailId) return { html: "", text: "", status: 0 };
  const r = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const raw = await r.text();
  console.log(`BACKFILL emailId=${emailId} status=${r.status} snippet=${raw.slice(0, 200)}`);
  if (!r.ok) return { html: "", text: "", status: r.status };
  const d = JSON.parse(raw) as Record<string, unknown>;
  return {
    html: typeof d.html === "string" ? d.html : "",
    text: typeof d.text === "string" ? d.text : "",
    status: r.status,
  };
}

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: valid } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch all emails with no body (html and text both null/empty) that have an email_id
  const { data: rows, error: fetchErr } = await supabase
    .from("fl_inbound_emails")
    .select("id, email_id, body_html, body_text")
    .not("email_id", "is", null);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const targets = (rows as EmailRow[]).filter(
    (r) => !r.body_html?.trim() && !r.body_text?.trim() && r.email_id
  );

  const results: { id: string; email_id: string; status: number; got_html: boolean; got_text: boolean }[] = [];

  for (const row of targets) {
    const { html, text, status } = await fetchBodyFromResend(row.email_id!);
    if (html || text) {
      await supabase
        .from("fl_inbound_emails")
        .update({ body_html: html || null, body_text: text || null })
        .eq("id", row.id);
    }
    results.push({ id: row.id, email_id: row.email_id!, status, got_html: !!html, got_text: !!text });
  }

  return NextResponse.json({ ok: true, processed: targets.length, results });
}
