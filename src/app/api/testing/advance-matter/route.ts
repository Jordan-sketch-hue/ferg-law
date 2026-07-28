import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendTestCompletionSummary } from "@/lib/email/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { session_id } = (await req.json()) as { session_id: string };
    if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 });

    const admin = createAdminClient();

    // Validate session (must exist and be < 2 hours old)
    const { data: session } = await admin
      .from("fl_test_sessions")
      .select("*")
      .eq("id", session_id)
      .gte("started_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .single();

    if (!session) return NextResponse.json({ error: "invalid or expired session" }, { status: 401 });

    // Advance the milestone
    const { data: result } = await admin.rpc("fl_test_advance_matter");
    const r = result as { done: boolean; milestone: string | null; phase: string | null };

    // Only send one email — the summary when all milestones complete
    if (r?.done) {
      const { data: allMilestones } = await admin.rpc("fl_test_matter_status");
      const completed = (allMilestones as { name: string; phase_name: string }[] ?? [])
        .map(m => `${m.phase_name}: ${m.name}`);
      void sendTestCompletionSummary(
        session.notify_email,
        "Test Property — 14 Harbour View Drive, Kingston",
        completed,
      ).catch(() => null);
    }

    // Increment step counter
    await admin.from("fl_test_sessions").update({ step: session.step + 1 }).eq("id", session_id);

    return NextResponse.json({ done: r?.done ?? false, milestone: r?.milestone, phase: r?.phase });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
