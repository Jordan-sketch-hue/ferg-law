/**
 * Ferguson Law messages use the configured linked WhatsApp sender.
 * Recipient and message content are chosen by the calling business workflow.
 * Phone numbers are normalised to Baileys JID format before sending.
 */

export type SendResult =
  | { skipped: true; reason: string }
  | { ok: true }
  | { ok: false; error: string };

/** Normalise any phone string to a Baileys JID (e.g. "18768405862@s.whatsapp.net"). */
function toJid(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  // JA numbers: 876XXXXXXX → 1876XXXXXXX
  const e164 = digits.startsWith("1") ? digits : `1${digits}`;
  return `${e164}@s.whatsapp.net`;
}

export async function sendWhatsAppText(to: string, text: string): Promise<SendResult> {
  const botUrl = process.env.WHATSAPP_BOT_URL?.trim().replace(/\/+$/, "");
  const secret = (process.env.WHATSAPP_BOT_SECRET ?? process.env.WA_SEND_SECRET)?.trim();
  if (!botUrl || !secret) {
    const missing = [
      ...(!botUrl ? ["WHATSAPP_BOT_URL"] : []),
      ...(!secret ? ["WHATSAPP_BOT_SECRET"] : []),
    ];
    console.error("[whatsapp] Ferguson Law send skipped: sender configuration is incomplete.", { missing });
    return { skipped: true, reason: "sender_not_configured" };
  }
  if (!to) {
    console.error("[whatsapp] Ferguson Law send skipped: recipient is missing.");
    return { skipped: true, reason: "recipient_missing" };
  }

  const jid = to.includes("@") ? to : toJid(to);
  if (!jid) {
    console.error("[whatsapp] Ferguson Law send skipped: recipient phone number is invalid.");
    return { skipped: true, reason: "recipient_invalid" };
  }

  const sendUrl = botUrl.endsWith("/send") ? botUrl : `${botUrl}/send`;

  try {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-send-secret": secret },
      body: JSON.stringify({ jid, text: text.slice(0, 4096) }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const error = `WA send ${res.status}: ${txt.slice(0, 200)}`;
      console.error("[whatsapp] Ferguson Law send failed.", { status: res.status });
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] Ferguson Law send request failed.", { error });
    return { ok: false, error };
  }
}