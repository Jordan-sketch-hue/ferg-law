/**
 * Server-side WhatsApp notification helper.
 * Fires best-effort — never throws, never blocks the caller.
 */

const JORDAN_JID = "16582182282@s.whatsapp.net";
const OWEN_JID = "18768405862@s.whatsapp.net";
const BOTH_JIDS = [JORDAN_JID, OWEN_JID];

async function sendWA(jids: string[], text: string): Promise<void> {
  const secret = process.env.WHATSAPP_BOT_SECRET ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET ?? "";
  const botUrl = process.env.WHATSAPP_BOT_URL;
  if (!secret || !botUrl) return;
  const sendUrl = botUrl.endsWith("/send") ? botUrl : `${botUrl}/send`;
  for (const jid of jids) {
    try {
      await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-send-secret": secret },
        body: JSON.stringify({ jid, text }),
      });
    } catch { /* best-effort */ }
  }
}

/** Notify both Jordan and Owen — use for client-initiated events. */
export async function notifyOwenWA(text: string): Promise<void> {
  return sendWA(BOTH_JIDS, text);
}

/** Notify Jordan only — use for admin-created events where Owen is the one acting. */
export async function notifyJordanWA(text: string): Promise<void> {
  return sendWA([JORDAN_JID], text);
}
