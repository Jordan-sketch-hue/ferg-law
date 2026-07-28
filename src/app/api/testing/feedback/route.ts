import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tester_name, tester_role, persona, site_tested, device_type, rating, what_worked, what_didnt, suggestions, would_use, persona_checks } = body;

    if (!tester_name || !tester_role || !persona || !rating) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("fl_test_feedback").insert({
      tester_name: String(tester_name).slice(0, 120),
      tester_role: String(tester_role).slice(0, 80),
      persona: String(persona).slice(0, 80),
      site_tested: site_tested ? String(site_tested).slice(0, 120) : null,
      device_type: device_type ? String(device_type).slice(0, 80) : null,
      rating: Number(rating),
      what_worked: what_worked ? String(what_worked).slice(0, 1000) : null,
      what_didnt: what_didnt ? String(what_didnt).slice(0, 1000) : null,
      suggestions: suggestions ? String(suggestions).slice(0, 1000) : null,
      would_use: typeof would_use === "boolean" ? would_use : null,
      persona_checks: persona_checks && typeof persona_checks === "object" ? persona_checks : null,
    });

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[testing/feedback]", err);
    return Response.json({ error: "Submission failed" }, { status: 500 });
  }
}
