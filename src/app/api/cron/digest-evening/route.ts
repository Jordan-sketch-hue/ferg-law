/**
 * GET /api/cron/digest-evening
 * Runs daily at 6:00 PM JA time (23:00 UTC).
 * Sends Owen an end-of-day summary: bookings created, leads captured, reminders sent.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOwenWA } from "@/lib/wa-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JA_TZ = "America/Jamaica";

function jaDateShort(d: Date) {
  return d.toLocaleDateString("en-JM", { timeZone: JA_TZ, weekday: "long", month: "long", day: "numeric" });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(5, 0, 0, 0); // 5 AM UTC = midnight JA
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [apptRes, leadsRes, remindersRes] = await Promise.all([
    admin
      .from("appointments")
      .select("name, service, status, payment_status, ref")
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", todayEnd.toISOString()),
    admin
      .from("leads")
      .select("name, interest")
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", todayEnd.toISOString()),
    admin
      .from("reminder_log")
      .select("id")
      .gte("sent_at", todayStart.toISOString())
      .lt("sent_at", todayEnd.toISOString())
      .eq("status", "sent"),
  ]);

  const appts = apptRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const reminders = remindersRes.data ?? [];

  const confirmed = appts.filter(a => a.status === "confirmed").length;
  const pending = appts.filter(a => a.payment_status === "pending").length;

  const lines: string[] = [];
  lines.push(`EVENING UPDATE — ${jaDateShort(now)}`);
  lines.push("");
  lines.push(`BOOKINGS TODAY: ${appts.length}`);
  if (appts.length > 0) {
    lines.push(`  Confirmed: ${confirmed}`);
    if (pending > 0) lines.push(`  Pending payment: ${pending}`);
  }
  lines.push(`NEW LEADS: ${leads.length}`);
  if (leads.length > 0) {
    leads.slice(0, 3).forEach(l => lines.push(`  - ${l.name}${l.interest ? ` (${l.interest})` : ""}`));
  }
  lines.push(`REMINDERS SENT: ${reminders.length}`);
  lines.push("");
  lines.push("fergusonlawja.com/admin");

  void notifyOwenWA(lines.join("\n"));

  return Response.json({ ok: true, bookings: appts.length, leads: leads.length, reminders: reminders.length });
}