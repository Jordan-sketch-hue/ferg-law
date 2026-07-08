/**
 * Free-LLM provider layer for the Ferguson Law bot.
 *
 * Mirrors the firm's existing `_apis/lib/llm.mjs` fallback approach: try a list
 * of OpenAI-/Gemini-compatible providers in order, return the first that works.
 * All three free tiers are supported — you only need ONE key:
 *   GROQ_API_KEY        free, fast (llama-3.3-70b)        ← recommended
 *   GEMINI_API_KEY      free 1,500 req/day (2.0-flash)
 *   OPENROUTER_API_KEY  some free models
 *
 * Text-only (no tool calling) so it runs on any free model. Autonomous actions
 * (booking, human handoff) are driven by explicit UI actions + the API route,
 * not by the model — see /api/chat.
 */

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type LLMResult =
  | { ok: true; text: string; provider: string }
  | { ok: false; error: string };

const UA = "ferguson-law-bot/1.0";

function toOpenAI(system: string, messages: ChatMsg[]) {
  return [{ role: "system", content: system }, ...messages];
}

async function callGroq(
  system: string,
  messages: ChatMsg[],
  maxTokens: number,
): Promise<LLMResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, error: "GROQ_API_KEY not set" };
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "user-agent": UA,
      },
      body: JSON.stringify({
        model,
        messages: toOpenAI(system, messages),
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      return { ok: false, error: data?.error?.message || r.statusText };
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return text
      ? { ok: true, text, provider: "groq" }
      : { ok: false, error: "empty groq response" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function callGemini(
  system: string,
  messages: ChatMsg[],
  maxTokens: number,
): Promise<LLMResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "GEMINI_API_KEY not set" };
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-001";
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": UA },
        body: JSON.stringify({
          contents,
          system_instruction: { parts: [{ text: system }] },
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
        }),
      },
    );
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      return { ok: false, error: data?.error?.message || r.statusText };
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || "")
      .join("")
      .trim();
    return text
      ? { ok: true, text, provider: "gemini" }
      : { ok: false, error: "empty gemini response" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function callOpenRouter(
  system: string,
  messages: ChatMsg[],
  maxTokens: number,
): Promise<LLMResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, error: "OPENROUTER_API_KEY not set" };
  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "user-agent": UA,
        "x-title": "Ferguson Law",
      },
      body: JSON.stringify({
        model,
        messages: toOpenAI(system, messages),
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      return { ok: false, error: data?.error?.message || r.statusText };
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return text
      ? { ok: true, text, provider: "openrouter" }
      : { ok: false, error: "empty openrouter response" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const PROVIDERS: Record<
  string,
  (s: string, m: ChatMsg[], t: number) => Promise<LLMResult>
> = {
  groq: callGroq,
  gemini: callGemini,
  openrouter: callOpenRouter,
};

/** True if at least one free-LLM provider key is configured. */
export function hasAnyLLMKey(): boolean {
  return Boolean(
    process.env.GROQ_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENROUTER_API_KEY,
  );
}

/**
 * Try providers in order (env CHAT_PROVIDER_ORDER, default groq,gemini,openrouter).
 * Returns the first ok result; skips providers whose key is unset; falls through
 * on rate-limit / error.
 */
export async function generateReply(opts: {
  system: string;
  messages: ChatMsg[];
  maxTokens?: number;
}): Promise<LLMResult> {
  const order = (process.env.CHAT_PROVIDER_ORDER || "groq,gemini,openrouter")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const maxTokens = opts.maxTokens ?? 700;
  let last: LLMResult = { ok: false, error: "no provider configured" };
  for (const name of order) {
    const fn = PROVIDERS[name];
    if (!fn) continue;
    const res = await fn(opts.system, opts.messages, maxTokens);
    if (res.ok) return res;
    last = res;
  }
  return last;
}
