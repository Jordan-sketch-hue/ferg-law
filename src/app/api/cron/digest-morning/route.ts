/**
 * GET /api/cron/digest-morning
 * Runs daily at 8:00 AM JA time (13:00 UTC).
 * Sends Owen + Jordan a morning briefing: today's confirmed bookings,
 * new leads, and unread inbox messages.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOwenWA } from "@/lib/wa-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JA_TZ = "America/Jamaica";

function jaDate(d: Date) {
  return d.toLocaleDateString("en-JM", {
    timeZone: JA_TZ, weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function jaTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-JM", {
    timeZone: JA_TZ, hour: "numeric", minute: "2-digit", hour12: true,
  });
}

async function sendEmail(subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const owenEmail = process.env.OWEN_EMAIL || "contact@fergusonlawja.com";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ferguson Law <contact@fergusonlawja.com>",
      to: [owenEmail],
      bcc: ["jordanrmorris01@icloud.com", "jordanmorrisr@gmail.com"],
      subject,
      text,
    }),
  }).catch(() => {});
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

  const [apptRes, leadsRes, unreadRes] = await Promise.all([
    admin
      .from("appointments")
      .select("name, service, starts_at, ref, email, phone, meta")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .eq("status", "confirmed")
      .order("starts_at"),
    admin
      .from("ferguson_leads")
      .select("name, service, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("fl_inbound_emails")
      .select("from_name, subject")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const appts = apptRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const unread = unreadRes.data ?? [];

  const dateLabel = jaDate(now);
  const lines: string[] = [];

  lines.push(`Good morning, Owen. Ferguson Law update for ${dateLabel}.`, "");

  if (appts.length === 0) {
    lines.push("Appointments today: None.");
  } else {
    lines.push(`Appointments today (${appts.length}):`);
    for (const a of appts) {
      const meta = a.meta as Record<string, unknown> | null;
      const meetingUrl = (meta?.meeting_url as string | null) ?? null;
      lines.push(`  ${jaTime(a.starts_at)} — ${a.name} | ${a.service}`);
      if (a.email) lines.push(`    ${a.email}${a.phone ? " | " + a.phone : ""}`);
      if (meetingUrl) lines.push(`    Meeting: ${meetingUrl}`);
      else lines.push(`    Ref: ${a.ref}`);
    }
  }

  lines.push("");

  if (leads.length === 0) {
    lines.push("New leads: None.");
  } else {
    lines.push(`New leads (${leads.length}):`);
    for (const l of leads) lines.push(`  ${l.name} — ${l.service || "General Inquiry"}`);
  }

  if (unread.length > 0) {
    lines.push("", `Unread messages (${unread.length}):`);
    for (const m of unread) lines.push(`  ${m.from_name} — ${m.subject}`);
  }

  lines.push("", "Admin: https://ferguson-law.vercel.app/admin", "— J Supreme Tech");

  const msg = lines.join("\n");

  await Promise.all([
    notifyOwenWA(msg),
    sendEmail(`Ferguson Law — ${dateLabel}`, msg),
  ]);

  return Response.json({ ok: true, bookings: appts.length, leads: leads.length, unread: unread.length });
}
