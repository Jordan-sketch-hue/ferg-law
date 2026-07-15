import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WA_BOT_URL = process.env.WHATSAPP_BOT_URL ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL ?? "";
const WA_SECRET = process.env.WHATSAPP_BOT_SECRET ?? "";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { jid, text } = await req.json() as { jid: string; text: string };
  if (!jid || !text?.trim()) return NextResponse.json({ error: "Missing jid or text." }, { status: 400 });
  if (!WA_BOT_URL) return NextResponse.json({ error: "WA bot not configured." }, { status: 500 });

  const res = await fetch(WA_BOT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-send-secret": WA_SECRET },
    body: JSON.stringify({ jid, text: text.trim() }),
  });

  return NextResponse.json({ ok: res.ok, status: res.status });
}
