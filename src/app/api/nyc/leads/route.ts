import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      first_name: string;
      email: string;
      phone?: string;
      answers: Record<string, number>;
      score: number;
      segment: string;
      source?: string;
    };

    if (!body.first_name?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const { error } = await supabase.from("fl_nyc_leads").upsert(
      {
        first_name: body.first_name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        answers: body.answers,
        score: body.score,
        segment: body.segment,
        source: body.source || "nyc2026-quiz",
        event: "nyc2026",
      },
      { onConflict: "email,event", ignoreDuplicates: false }
    );

    if (error) {
      console.error("[nyc/leads]", error);
      return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[nyc/leads] unexpected", e);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
