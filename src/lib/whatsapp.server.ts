/**
 * WhatsApp send helper — routes through the JARVIS Railway bot (Baileys).
 * Uses WHATSAPP_BOT_URL + WHATSAPP_BOT_SECRET (already set on Vercel).
 * Phone numbers are normalised to Baileys JID format before sending.
 */

export type SendResult = { skipped: true } | { ok: true } | { ok: false; error: string };

/** Normalise any phone string to a Baileys JID (e.g. "18768405862@s.whatsapp.net"). */
function toJid(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  // JA numbers: 876XXXXXXX → 1876XXXXXXX
  const e164 = digits.startsWith("1") ? digits : `1${digits}`;
  return `${e164}@s.whatsapp.net`;
}

export async function sendWhatsAppText(to: string, text: string): Promise<SendResult> {
  const botUrl = process.env.WHATSAPP_BOT_URL;
  const secret = process.env.WHATSAPP_BOT_SECRET ?? process.env.WA_SEND_SECRET ?? "";
  if (!botUrl || !secret || !to) return { skipped: true };

  const jid = to.includes("@") ? to : toJid(to);
  if (!jid) return { skipped: true };

  const sendUrl = botUrl.endsWith("/send") ? botUrl : `${botUrl.replace(/\/$/, "")}/send`;

  try {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-send-secret": secret },
      body: JSON.stringify({ jid, text: text.slice(0, 4096) }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `WA send ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}