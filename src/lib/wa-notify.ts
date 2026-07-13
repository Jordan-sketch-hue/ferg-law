/**
 * Server-side WhatsApp notification helper.
 * Fires best-effort — never throws, never blocks the caller.
 */

const BOT_URL = "https://whatsapp-jarvis-bot-production.up.railway.app/send";
const OWEN_JID = "18768405862@s.whatsapp.net";

export async function notifyOwenWA(text: string): Promise<void> {
  const secret = process.env.WHATSAPP_BOT_SECRET ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET ?? "";
  if (!secret) return;
  try {
    await fetch(BOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-send-secret": secret },
      body: JSON.stringify({ jid: OWEN_JID, text }),
    });
  } catch { /* best-effort */ }
}
