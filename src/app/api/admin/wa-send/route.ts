import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp.server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Missing jid or text." }, { status: 400 });
  }
  const jid = "jid" in body && typeof body.jid === "string" ? body.jid.trim() : "";
  const text = "text" in body && typeof body.text === "string" ? body.text.trim() : "";
  if (!jid || !text) return NextResponse.json({ error: "Missing jid or text." }, { status: 400 });

  const result = await sendWhatsAppText(jid, text);
  if ("skipped" in result) {
    return NextResponse.json(
      { error: "Ferguson Law business WhatsApp sender is not configured." },
      { status: 503 },
    );
  }
  if (!result.ok) {
    return NextResponse.json({ error: "WhatsApp delivery failed." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
