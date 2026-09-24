/**
 * POST /api/blast/gen-body
 * Generates HTML email body content via Claude based on a plain-text prompt.
 * Returns { html } ready to insert into the Quill editor.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json()) as { prompt?: string };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are writing a professional email body for Ferguson Law, a Jamaican law firm specializing in real estate conveyancing.

Write the email body HTML based on this request: "${prompt.trim()}"

Rules:
- Return ONLY the inner HTML content (paragraphs, lists, etc.) — no <html>, <body>, or wrapper tags
- Use only <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, <a> tags
- Style inline only if needed, using font-family:Georgia,serif and color:#333333
- Keep it professional, clear, and concise
- Use {{name}} as a merge tag if the email should be personalized (do NOT use "Dear {{name}}" — that is handled by the wrapper)
- Ferguson Law's CTA URL is https://fergusonlawja.com
- Keep to 150-300 words maximum
- No signature block — that is handled separately

Return only the HTML, nothing else.`,
      },
    ],
  });

  const html = (message.content[0] as { type: string; text: string }).text?.trim() ?? "";

  return NextResponse.json({ html });
}
