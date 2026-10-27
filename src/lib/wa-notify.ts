/**
 * Server-side WhatsApp notification helper.
 * Fires best-effort — never throws, never blocks the caller.
 */

const JORDAN_JID = "16582182282@s.whatsapp.net";

type WhatsAppDelivery = { sent: number; failed: number };

async function sendWA(jids: string[], text: string): Promise<WhatsAppDelivery> {
  const secret = process.env.WHATSAPP_BOT_SECRET ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET ?? "";
  const botUrl = process.env.WHATSAPP_BOT_URL?.trim().replace(/\/+$/, "");
  if (!secret || !botUrl) {
    console.error("[whatsapp] Notification skipped: missing configuration.", {
      missing: [
        ...(!secret ? ["WHATSAPP_BOT_SECRET"] : []),
        ...(!botUrl ? ["WHATSAPP_BOT_URL"] : []),
      ],
    });
    return { sent: 0, failed: jids.length };
  }

  const sendUrl = botUrl.endsWith("/send") ? botUrl : `${botUrl}/send`;
  let sent = 0;
  let failed = 0;
  for (const [index, jid] of jids.entries()) {
    const recipient = jid === JORDAN_JID ? "Jordan" : `recipient ${index + 1}`;
    try {
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-send-secret": secret },
        body: JSON.stringify({ jid, text }),
      });
      if (!response.ok) {
        failed++;
        console.error("[whatsapp] Notification delivery failed.", {
          recipient,
          status: response.status,
        });
        continue;
      }
      sent++;
    } catch (error) {
      failed++;
      console.error("[whatsapp] Notification request failed.", {
        recipient,
        error: error instanceof Error ? error.message : "Unknown network error",
      });
    }
  }
  return { sent, failed };
}

/** Operator alerts go only to Jordan; never mirror client or personal data to Owen. */
export async function notifyJordanWA(text: string): Promise<WhatsAppDelivery> {
  return sendWA([JORDAN_JID], text);
}
