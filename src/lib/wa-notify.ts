/**
 * Server-side WhatsApp notification helper.
 * Fires best-effort — never throws, never blocks the caller.
 */

const JORDAN_JID = "16582182282@s.whatsapp.net";
const OWEN_JID = "18768405862@s.whatsapp.net";

type WhatsAppDelivery = { sent: number; failed: number };

type BotConfig = {
  url: string | undefined;
  secret: string | undefined;
  urlVariable: string;
  secretVariable: string;
  recipient: string;
};

/** Ping the Railway bot to verify the WA session is live before sending. */
export async function checkWASession(): Promise<{ live: boolean; detail?: string }> {
  const botUrl = process.env.WHATSAPP_BOT_URL?.trim().replace(/\/+$/, "");
  const secret = (process.env.WHATSAPP_BOT_SECRET ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET)?.trim();
  if (!botUrl || !secret) return { live: false, detail: "Bot URL or secret not configured" };
  try {
    const r = await fetch(`${botUrl}/health`, {
      headers: { "x-send-secret": secret },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json().catch(() => ({})) as Record<string, unknown>;
      const live = data.connected === true || data.live === true || data.status === "connected";
      return { live, detail: JSON.stringify(data) };
    }
    return { live: false, detail: `health endpoint returned ${r.status}` };
  } catch (e) {
    return { live: false, detail: e instanceof Error ? e.message : "health check failed" };
  }
}

async function sendWA(jids: string[], text: string, config: BotConfig): Promise<WhatsAppDelivery> {
  const secret = config.secret?.trim();
  const botUrl = config.url?.trim().replace(/\/+$/, "");
  if (!secret || !botUrl) {
    console.error("[whatsapp] Notification skipped: sender configuration is incomplete.", {
      recipient: config.recipient,
      missing: [
        ...(!botUrl ? [config.urlVariable] : []),
        ...(!secret ? [config.secretVariable] : []),
      ],
    });
    return { sent: 0, failed: jids.length };
  }

  const sendUrl = botUrl.endsWith("/send") ? botUrl : `${botUrl}/send`;
  let sent = 0;
  let failed = 0;
  for (const [index, jid] of jids.entries()) {
    const recipient = jids.length === 1 ? config.recipient : `recipient ${index + 1}`;
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

/** General operator alerts go only to Jordan. */
export async function notifyJordanWA(text: string): Promise<WhatsAppDelivery> {
  return sendWA([JORDAN_JID], text, {
    url: process.env.WHATSAPP_BOT_URL,
    secret: process.env.WHATSAPP_BOT_SECRET ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET,
    urlVariable: "WHATSAPP_BOT_URL",
    secretVariable: "WHATSAPP_BOT_SECRET",
    recipient: "Jordan",
  });
}

/** Booking and Owen-mailbox alerts go only to Owen. */
export async function notifyOwenBusinessWA(text: string): Promise<WhatsAppDelivery> {
  return sendWA([OWEN_JID], text, {
    url: process.env.WHATSAPP_BOT_URL,
    secret: process.env.WHATSAPP_BOT_SECRET ?? process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET,
    urlVariable: "WHATSAPP_BOT_URL",
    secretVariable: "WHATSAPP_BOT_SECRET",
    recipient: "Owen",
  });
}
