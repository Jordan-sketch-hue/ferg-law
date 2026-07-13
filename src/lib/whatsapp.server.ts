/**
 * Thin wrapper over the Meta WhatsApp Cloud API (Graph API). Server-only.
 * Mirrors the pattern in J Supreme Tech's shared whatsapp-cloud-bot so the
 * same Meta app/number can be reused across projects — set FL_WHATSAPP_* to
 * point at Ferguson Law's own number, or leave unset to no-op gracefully.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export type SendResult = { skipped: true } | { ok: true } | { ok: false; error: string };

export async function sendWhatsAppText(to: string, text: string): Promise<SendResult> {
  const id = process.env.FL_WHATSAPP_PHONE_ID;
  const token = process.env.FL_WHATSAPP_TOKEN;
  if (!id || !token || !to) return { skipped: true };

  try {
    const res = await fetch(`${GRAPH}/${id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: text.slice(0, 4096) },
      }),
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
