import { NextRequest, NextResponse } from "next/server";

const VALID = new Set([
  process.env.FL_ADMIN_TOKEN_1,
  process.env.FL_ADMIN_TOKEN_2,
  process.env.FL_ADMIN_TOKEN,
].filter(Boolean) as string[]);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") return NextResponse.json({ ok: false }, { status: 400 });
    return NextResponse.json({ ok: VALID.has(token.trim()) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}