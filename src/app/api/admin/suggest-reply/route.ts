/**
 * POST /api/admin/suggest-reply
 * Body: { token, subject, body }
 * Returns: { ok, suggestion }
 * Uses claude-sonnet-4-6 via ANTHROPIC_API_KEY.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ ok: false, error: "AI not configured" }, { status: 500 });

  const client = new Anthropic({ apiKey });

  const prompt = `You are drafting a professional email reply on behalf of Ferguson Law, a Jamaican law firm specialising in property conveyancing, estate law, and family law. The attorney is Owen K. Ferguson JP.

The firm received this inbound email:

Subject: ${subject ?? "(no subject)"}

Message:
${(body ?? "").slice(0, 1200)}

Write a professional, warm, and concise reply. Rules:
- Start with a proper greeting (e.g. "Dear Ms./Mr. [Last Name],")
- Acknowledge their specific enquiry
- Confirm Ferguson Law can assist and invite them to book a consultation
- If the email mentions a property value or specific matter, reference it naturally
- Keep it under 130 words
- End with: "Warm regards,\nOwen K. Ferguson, JP\nFerguson Law\n(876) 831-5563"
- Write ONLY the email body — no subject line, no metadata`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    });

    const suggestion = (msg.content[0] as { type: string; text: string }).text?.trim();
    if (!suggestion) return Response.json({ ok: false, error: "Empty response" }, { status: 500 });

    return Response.json({ ok: true, suggestion });
  } catch (err) {
    console.error("[suggest-reply] Claude error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
