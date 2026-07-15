/**
 * GET /api/cron/weekly-digest
 * Runs weekly. Sends each active-matter client a single digest email
 * instead of one email per status change: their 3 most recent status
 * changes, pending steps, outstanding client actions, a forecast of the
 * next step, and deadline alerts for milestones with a due_at approaching.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWeeklyClientDigest } from "@/lib/email/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALERT_WINDOW_DAYS = 7;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = Date.now();

  const { data: matters, error: mErr } = await admin
    .from("fl_client_matters")
    .select("id, title, matter_type, client_id")
    .in("status", ["intake", "in_progress", "awaiting_client", "awaiting_third_party"]);

  if (mErr) return Response.json({ ok: false, error: mErr.message }, { status: 500 });

  const results: { matterId: string; sent: boolean; reason?: string }[] = [];

  for (const matter of matters ?? []) {
    const [{ data: milestones }, { data: log }, { data: userRes }] = await Promise.all([
      admin.from("fl_matter_milestones").select("name, phase_name, status, due_at").eq("matter_id", matter.id).order("phase_order").order("created_at"),
      admin.from("fl_milestone_status_log").select("milestone_name, phase_name, new_status, changed_at").eq("matter_id", matter.id).gte("changed_at", weekAgo).order("changed_at", { ascending: false }).limit(3),
      admin.auth.admin.getUserById(matter.client_id),
    ]);

    const email = userRes?.user?.email;
    if (!email) { results.push({ matterId: matter.id, sent: false, reason: "no email" }); continue; }

    const ms = milestones ?? [];
    const pending = ms.filter(m => m.status === "pending").map(m => m.name);
    const awaitingClient = ms.filter(m => m.status === "blocked").map(m => m.name);
    const nextStep = ms.find(m => m.status === "in_progress")?.name ?? pending[0] ?? null;
    const alerts = ms
      .filter(m => m.due_at)
      .map(m => ({ milestoneName: m.name, daysRemaining: Math.ceil((new Date(m.due_at as string).getTime() - now) / 86400000) }))
      .filter(a => a.daysRemaining >= 0 && a.daysRemaining <= ALERT_WINDOW_DAYS);

    const recentChanges = (log ?? []).map(l => ({
      milestoneName: l.milestone_name, phaseName: l.phase_name, newStatus: l.new_status, changedAt: l.changed_at,
    }));

    // Skip clients with nothing to report and no deadlines looming.
    if (recentChanges.length === 0 && pending.length === 0 && awaitingClient.length === 0 && alerts.length === 0) {
      results.push({ matterId: matter.id, sent: false, reason: "nothing to report" });
      continue;
    }

    await sendWeeklyClientDigest(email, matter.title || matter.matter_type, {
      recentChanges, pending, awaitingClient, nextStep, alerts,
    });
    results.push({ matterId: matter.id, sent: true });
  }

  return Response.json({ ok: true, count: results.length, results });
}
