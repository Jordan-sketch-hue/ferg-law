/**
 * POST /api/blast/parse
 * Uses Anthropic to extract [{name, email}] from any pasted list format.
 * No auth required — read-only operation on user-supplied text.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ recipients: [] });
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract all names and email addresses from the following text.
Return ONLY a JSON array with objects like {"name": "First Last", "email": "email@domain.com"}.
If a name is not present, use an empty string for name.
Do not include any explanation, just the JSON array.

Text:
${text}`,
      },
    ],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const recipients = JSON.parse(jsonStr) as { name: string; email: string }[];
    const valid = recipients.filter(
      (r) => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)
    );
    return NextResponse.json({ recipients: valid });
  } catch {
    return NextResponse.json({ error: "Could not parse list.", recipients: [] }, { status: 422 });
  }
}
