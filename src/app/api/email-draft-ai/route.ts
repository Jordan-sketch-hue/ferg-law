import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { original, instruction } = await req.json();
  if (!original || !instruction) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `You are rewriting copy for a Ferguson Law partner invitation email. Keep the professional, authoritative tone of a Jamaican law firm.

Original text:
"${original}"

Instruction: ${instruction}

Return ONLY the rewritten text. No explanation, no quotes, no preamble.`,
      },
    ],
  });

  const result = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return NextResponse.json({ result });
}
