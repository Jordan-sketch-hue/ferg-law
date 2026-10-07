/**
 * GET /api/cron/digest-morning
 * Runs daily at 8:00 AM JA time (13:00 UTC).
 * Sends Owen a morning briefing: today's bookings + meetings, pending payments, recent leads.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOwenWA } from "@/lib/wa-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JA_TZ = "America/Jamaica";

function jaDate(d: Date) {
  return d.toLocaleDateString("en-JM", { timeZone: JA_TZ, weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function jaTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-JM", { timeZone: JA_TZ, hour: "numeric", minute: "2-digit", hour12: true });
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
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const [apptRes, leadsTodayRes, leadsYesterdayRes, pendingPayRes] = await Promise.all([
    admin
      .from("appointments")
      .select("name, service, starts_at, ref, meta")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .in("status", ["confirmed", "pending"])
      .order("starts_at"),
    admin
      .from("leads")
      .select("name, interest, created_at")
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", todayEnd.toISOString()),
    admin
      .from("leads")
      .select("name, interest, created_at")
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString()),
    admin
      .from("appointments")
      .select("name, service, ref, meta")
      .eq("payment_status", "pending")
      .in("status", ["confirmed", "pending"]),
  ]);

  const appts = apptRes.data ?? [];
  const leadsToday = leadsTodayRes.data ?? [];
  const leadsYesterday = leadsYesterdayRes.data ?? [];
  const pendingPay = pendingPayRes.data ?? [];

  const lines: string[] = [];
  lines.push("GOOD MORNING, OWEN");
  lines.push(`DATE: ${jaDate(now)}`);
  lines.push("");

  lines.push(`BOOKINGS TODAY (${appts.length})`);
  if (appts.length === 0) {
    lines.push("No bookings scheduled");
  } else {
    appts.forEach((a, i) => {
      const meta = a.meta as Record<string, unknown> | null;
      const meetingUrl = (meta?.meeting_url as string | null) ?? null;
      lines.push(`${i + 1}. ${a.name} — ${a.service} — ${jaTime(a.starts_at)}`);
      if (meetingUrl) lines.push(`   Meeting: ${meetingUrl}`);
      else lines.push(`   Ref: ${a.ref}`);
    });
  }
  lines.push("");

  lines.push(`LEADS TODAY: ${leadsToday.length}    YESTERDAY: ${leadsYesterday.length}`);
  lines.push("");

  if (pendingPay.length > 0) {
    lines.push(`PENDING PAYMENTS (${pendingPay.length})`);
    pendingPay.slice(0, 5).forEach(p => {
      const meta = p.meta as Record<string, unknown> | null;
      const amt = meta?.amount ? `J$${Number(meta.amount).toLocaleString()}` : "amount TBD";
      lines.push(`- ${p.name} — ${amt} — ${p.ref}`);
    });
    lines.push("");
  }

  lines.push("fergusonlawja.com/admin");

  void notifyOwenWA(lines.join("\n"));

  return Response.json({ ok: true, bookings: appts.length, leadsToday: leadsToday.length, pendingPayments: pendingPay.length });
}