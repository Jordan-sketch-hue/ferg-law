import { NextRequest, NextResponse } from "next/server";
import { notifyJordanWA } from "@/lib/wa-notify";

export async function POST(req: NextRequest) {
  try {
    const { name, kind, email } = await req.json() as { name?: string; kind?: string; email?: string };
    await notifyJordanWA(
      `NEW DIRECTORY SIGNUP\nName: ${name || "Unknown"}\nType: ${kind || "partner"}\nEmail: ${email || "-"}\nReview: fergusonlawja.com/admin`
    );
  } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
