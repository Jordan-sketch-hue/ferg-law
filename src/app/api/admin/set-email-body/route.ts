/**
 * POST /api/admin/set-email-body
 * Admin-only: manually set body_text on an existing fl_inbound_emails row.
 * Used for external inbound emails where the webhook didn't capture the body.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { token, id, body_text, body_html } = (await req.json()) as {
    token?: string;
    id?: string;
    body_text?: string;
    body_html?: string;
  };

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: valid } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!body_text && !body_html) return NextResponse.json({ error: "Provide body_text or body_html" }, { status: 400 });

  const { error } = await supabase
    .from("fl_inbound_emails")
    .update({
      ...(body_text !== undefined ? { body_text } : {}),
      ...(body_html !== undefined ? { body_html } : {}),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
