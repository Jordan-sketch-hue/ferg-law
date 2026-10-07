/**
 * Server-side WhatsApp notification helper.
 * Fires best-effort — never throws, never blocks the caller.
 */

const OWEN_JID = "16582182282@s.whatsapp.net";

export async function notifyOwenWA(text: string): Promise<void> {
  const secret = process.env.WHATSAPP_BOT_SECRET ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET ?? "";
  const botUrl = process.env.WHATSAPP_BOT_URL;
  if (!secret || !botUrl) return;
  const sendUrl = botUrl.endsWith("/send") ? botUrl : `${botUrl}/send`;
  try {
    await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-send-secret": secret },
      body: JSON.stringify({ jid: OWEN_JID, text }),
    });
  } catch { /* best-effort */ }
}
