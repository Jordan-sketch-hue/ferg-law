/**
 * POST /api/admin/fetch-sent-body
 * Fetches email body from Resend for a sent email that has resend_id but no body stored,
 * saves it to fl_email_log, and returns the body text.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, id, resend_id } = (await req.json()) as { token: string; id: string; resend_id: string };

    if (!token || !id || !resend_id) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: isAdmin, error: authErr } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (authErr || !isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: "RESEND_API_KEY not set." }, { status: 503 });

    const r = await fetch(`https://api.resend.com/emails/${resend_id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!r.ok) {
      return NextResponse.json({ error: `Resend returned ${r.status}` }, { status: 502 });
    }

    const data = (await r.json()) as { html?: string; text?: string };
    const bodyText = data.text || (data.html ? data.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");

    if (!bodyText) {
      return NextResponse.json({ error: "No body content in Resend response." }, { status: 404 });
    }

    const admin = createAdminClient();
    await admin.from("fl_email_log").update({
      body_full: bodyText,
      body_preview: bodyText.slice(0, 300),
    }).eq("id", id);

    return NextResponse.json({ ok: true, body: bodyText });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
