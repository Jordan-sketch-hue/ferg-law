import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { token?: string; emailId?: string };

  const supabase = createAdminClient();
  const { data: isAdmin } = body.token
    ? await supabase.rpc("fl_is_admin", { p_token: body.token })
    : { data: false };

  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const emailId = body.emailId;
  if (!emailId) return NextResponse.json({ ok: false, error: "emailId required" }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "no api key" }, { status: 500 });

  // Fetch the inbound email
  const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const raw = await r.json();

  // Analyze attachment structure without exposing binary content
  const d = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown>;
  const attachments = Array.isArray(d.attachments) ? d.attachments : [];

  const analyzed = attachments.map((att: Record<string, unknown>, i: number) => {
    const result: Record<string, unknown> = {
      index: i,
      keys: Object.keys(att),
      filename: att.filename,
      content_type: att.content_type,
      size: att.size,
      has_id: !!att.id,
      id: att.id,
      has_content: !!att.content,
      content_length: typeof att.content === "string" ? att.content.length : 0,
      has_download_url: !!att.download_url,
      download_url: att.download_url,
    };
    return result;
  });

  // Also try the /attachments/{id} endpoint for first attachment if it has an id
  let attachmentEndpointResult = null;
  if (attachments.length > 0 && attachments[0].id) {
    const attId = attachments[0].id;
    const ar = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${attId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const attRaw = await ar.json();
    attachmentEndpointResult = {
      status: ar.status,
      keys: Object.keys(attRaw),
      has_content: !!(attRaw.content || (attRaw.data && (attRaw.data as Record<string,unknown>).content)),
      content_length: typeof attRaw.content === "string" ? attRaw.content.length :
        typeof (attRaw.data as Record<string,unknown>)?.content === "string" ? ((attRaw.data as Record<string,unknown>).content as string).length : 0,
    };
  }

  return NextResponse.json({
    ok: true,
    http_status: r.status,
    email_keys: Object.keys(d),
    attachment_count: attachments.length,
    attachments: analyzed,
    attachment_endpoint_test: attachmentEndpointResult,
  });
}
