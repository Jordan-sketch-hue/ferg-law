/**
 * POST /api/admin/suggest-reply
 * Body: { token, subject, body }
 * Returns: { ok, suggestion }
 * Uses the same LLM stack as the chatbot (Groq → Gemini → OpenRouter).
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateReply } from "@/lib/chat/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, subject, body } = await req.json().catch(() => ({})) as {
    token?: string; subject?: string; body?: string;
  };
  if (!token) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const prompt = `You are the assistant for Ferguson Law, a Jamaican law firm run by Owen K. Ferguson JP.
Draft a professional, warm, and concise email reply to the following inbound email.
Write only the body of the reply — no subject line, no "Dear" salutation placeholder, just the reply body starting from the greeting.
Keep it under 120 words. Sign off as "Owen K. Ferguson, JP — Ferguson Law".

Inbound subject: ${subject ?? "(no subject)"}

Inbound message:
${(body ?? "").slice(0, 800)}`;

  const result = await generateReply({ system: "You draft professional legal correspondence.", messages: [{ role: "user", content: prompt }], maxTokens: 200 });
  if (!result.ok) return Response.json({ ok: false, error: "Could not generate suggestion" }, { status: 500 });
  return Response.json({ ok: true, suggestion: result.text });
}
