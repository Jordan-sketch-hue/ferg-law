import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWEN_JID = "18768405862@s.whatsapp.net";
const JORDAN_JID = "16582182282@s.whatsapp.net";

const ACK_MESSAGE =
  "Message received. Jordan will get back to you shortly. â€” Ferguson Law / J Supreme Tech";

async function sendWAReply(jid: string, text: string): Promise<void> {
  const secret =
    process.env.WHATSAPP_BOT_SECRET ??
    process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET ??
    "";
  const botUrl = process.env.WHATSAPP_BOT_URL;
  if (!secret || !botUrl) return;
  const sendUrl = botUrl.endsWith("/send") ? botUrl : `${botUrl}/send`;
  try {
    await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-send-secret": secret },
      body: JSON.stringify({ jid, text }),
    });
  } catch {
    /* best-effort */
  }
}

// GET â€” webhook verification
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const expected =
    process.env.WA_INBOUND_VERIFY_TOKEN ?? "ferg-wa-verify";
  if (mode === "subscribe" && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: true, status: "webhook active" });
}

// POST â€” incoming message from the WA bot server
export async function POST(req: NextRequest) {
  try {
    const secret =
      process.env.WHATSAPP_BOT_SECRET ??
      process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET ??
      "";
    const inboundSecret =
      req.headers.get("x-send-secret") ??
      req.headers.get("x-inbound-secret") ??
      "";

    if (secret && inboundSecret !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      jid?: string;
      from?: string;
      text?: string;
      message?: string;
      pushName?: string;
      name?: string;
    };

    const jid = body.jid ?? body.from ?? "";
    const text = body.text ?? body.message ?? "";
    const senderName =
      body.pushName ??
      body.name ??
      jid.replace("@s.whatsapp.net", "");

    const isKnown =
      jid === OWEN_JID ||
      jid === JORDAN_JID ||
      jid.includes("18768405862") ||
      jid.includes("16582182282");

    if (!isKnown) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!text.trim()) return NextResponse.json({ ok: true, skipped: "empty" });

    const admin = createAdminClient();
    const ticketId = `ferg-wa-${Date.now()}`;
    await admin.from("ops_tickets").insert({
      id: ticketId,
      source: "ferguson-law",
      source_key: jid,
      client_name: senderName,
      contact: jid.replace("@s.whatsapp.net", ""),
      channel: "whatsapp",
      category: "owner-message",
      priority: "high",
      summary:
        text.length > 120 ? text.slice(0, 117) + "..." : text,
      body_text: text,
      action_needed: "Review and respond",
      sla_hours: 4,
      due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      gate: "open",
      state: "open",
      created_at: new Date().toISOString(),
    });

    await sendWAReply(jid, ACK_MESSAGE);

    return NextResponse.json({ ok: true, ticketId });
  } catch (e) {
    console.error("[wa-inbound] error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}