/**
 * POST /api/admin/resend-diagnostic
 * Admin-only: syncs inbound email bodies from Resend's receiving API.
 * Uses /emails/receiving endpoint (NOT /emails which is sent-mail only).
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

interface DBEmail {
  id: string;
  email_id: string | null;
  from_email: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  created_at: string;
}

async function resendGet(path: string, key: string) {
  const r = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await r.text();
  return { status: r.status, body: text };
}

export async function POST(req: NextRequest) {
  const { token, test_ids } = (await req.json()) as { token?: string; test_ids?: string[] };
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: valid } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 });

  // 1. List received emails from Resend (received-mail only endpoint)
  const listResult = await resendGet("/emails/receiving?limit=100", key);
  console.log(`RESEND_DIAG_LIST status=${listResult.status} snippet=${listResult.body.slice(0, 300)}`);

  let resendEmails: ResendReceivedEmail[] = [];
  if (listResult.status === 200) {
    try {
      const parsed = JSON.parse(listResult.body) as { data?: ResendReceivedEmail[] } | ResendReceivedEmail[];
      resendEmails = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    } catch { /* parse error */ }
  }

  // 2. Get all DB emails
  const { data: dbEmails } = await supabase
    .from("fl_inbound_emails")
    .select("id, email_id, from_email, subject, body_html, body_text, created_at")
    .order("created_at", { ascending: false });

  const empty = ((dbEmails as DBEmail[]) ?? []).filter(
    (e) => !e.body_html?.trim() && !e.body_text?.trim()
  );

  // 3. For DB emails WITH email_id, fetch from receiving endpoint
  const directFetches: { db_id: string; email_id: string; status: number; html_len: number; text_len: number }[] = [];
  for (const e of ((dbEmails as DBEmail[]) ?? []).filter((e) => e.email_id)) {
    const r = await resendGet(`/emails/receiving/${e.email_id}`, key);
    let html = "";
    let text = "";
    if (r.status === 200) {
      try {
        const d = JSON.parse(r.body) as Record<string, unknown>;
        html = typeof d.html === "string" ? d.html : "";
        text = typeof d.text === "string" ? d.text : "";
        if (html || text) {
          await supabase
            .from("fl_inbound_emails")
            .update({ body_html: html || null, body_text: text || null })
            .eq("id", e.id);
        }
      } catch { /* parse error */ }
    }
    directFetches.push({ db_id: e.id, email_id: e.email_id!, status: r.status, html_len: html.length, text_len: text.length });
    console.log(`RESEND_DIAG_FETCH email_id=${e.email_id} status=${r.status} html=${html.length} text=${text.length}`);
  }

  // 4. For DB emails WITHOUT email_id, match by subject+sender against received list
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  const addr = (s?: string) => norm(s?.match(/<(.+?)>/)?.[1] ?? s);

  const subjectMatches: { db_id: string; matched_resend_id: string; html_len: number; text_len: number }[] = [];
  if (resendEmails.length > 0) {
    for (const dbEmail of empty.filter((e) => !e.email_id)) {
      const match = resendEmails.find(
        (r) => norm(r.subject) === norm(dbEmail.subject) && addr(r.from) === norm(dbEmail.from_email)
      );
      if (match) {
        const individual = await resendGet(`/emails/receiving/${match.id}`, key);
        console.log(`RESEND_DIAG_SUBJECT_MATCH id=${match.id} status=${individual.status}`);
        if (individual.status === 200) {
          try {
            const d = JSON.parse(individual.body) as Record<string, unknown>;
            const html = typeof d.html === "string" ? d.html : "";
            const text = typeof d.text === "string" ? d.text : "";
            if (html || text) {
              await supabase
                .from("fl_inbound_emails")
                .update({ body_html: html || null, body_text: text || null, email_id: match.id })
                .eq("id", dbEmail.id);
              subjectMatches.push({ db_id: dbEmail.id, matched_resend_id: match.id, html_len: html.length, text_len: text.length });
            }
          } catch { /* parse error */ }
        }
      }
    }
  }

  // 5. Test specific IDs against receiving endpoint
  const testIdResults: { id: string; status: number; has_html: boolean; has_text: boolean; snippet: string }[] = [];
  for (const eid of (test_ids ?? [])) {
    const r = await resendGet(`/emails/receiving/${eid}`, key);
    let hasHtml = false;
    let hasText = false;
    if (r.status === 200) {
      try {
        const d = JSON.parse(r.body) as Record<string, unknown>;
        hasHtml = typeof d.html === "string" && d.html.length > 0;
        hasText = typeof d.text === "string" && d.text.length > 0;
      } catch { /* */ }
    }
    testIdResults.push({ id: eid, status: r.status, has_html: hasHtml, has_text: hasText, snippet: r.body.slice(0, 300) });
  }

  return NextResponse.json({
    ok: true,
    resend_received_list_status: listResult.status,
    resend_emails_found: resendEmails.length,
    resend_email_subjects: resendEmails.slice(0, 10).map((e) => ({ id: e.id, subject: e.subject, from: e.from })),
    db_empty_count: empty.length,
    direct_fetches: directFetches,
    subject_matches: subjectMatches,
    test_id_results: testIdResults,
  });
}
