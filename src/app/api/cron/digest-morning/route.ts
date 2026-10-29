/**
 * GET /api/cron/digest-morning
 * Runs daily at 8:00 AM JA time (13:00 UTC).
 * Sends the operator's morning briefing to Jordan only: confirmed bookings,
 * new leads, and unread inbox messages.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyJordanWA, notifyOwenBusinessWA } from "@/lib/wa-notify";

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
  if (!key) {
    console.error("[digest-morning] Email delivery skipped: RESEND_API_KEY is not configured.");
    return false;
  }
  const staffEmail = process.env.FERGUSON_STAFF_EMAIL || "contact@fergusonlawja.com";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ferguson Law <contact@fergusonlawja.com>",
      to: [staffEmail],
      bcc: ["jordanrmorris01@icloud.com", "jordanmorrisr@gmail.com"],
      subject,
      text,
    }),
  }).catch((error: unknown) => {
    console.error("[digest-morning] Email request failed.", {
      error: error instanceof Error ? error.message : "Unknown network error",
    });
    return null;
  });
  if (!response) return false;
  if (!response.ok) {
    console.error("[digest-morning] Email delivery failed.", { status: response.status });
    return false;
  }
  return true;
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
      .select("from_name, from_email, subject")
      .eq("read", false)
      .eq("is_spam", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const queryErrors = [apptRes.error, leadsRes.error, unreadRes.error]
    .filter((error) => error !== null);
  if (queryErrors.length > 0) {
    console.error("[digest-morning] Could not load digest data.", {
      errors: queryErrors.map((error) => ({ code: error.code, message: error.message })),
    });
    return Response.json({ ok: false, error: "Could not load digest data." }, { status: 500 });
  }

  const appts = apptRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const unread = unreadRes.data ?? [];

  const dateLabel = jaDate(now);
  const lines: string[] = [];

  lines.push(`Good morning, Owen. Ferguson Law operator update for ${dateLabel}.`, "");

  if (appts.length === 0) {
    lines.push("Appointments today: None.");
  } else {
    lines.push(`Appointments today (${appts.length}):`);
    for (const a of appts) {
      const meta = a.meta as Record<string, unknown> | null;
      const meetingUrl = (meta?.meeting_url as string | null) ?? null;
      lines.push(`  ${jaTime(a.starts_at)} â€” ${a.name || "Unknown"} | ${a.service}`);
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
    for (const l of leads) lines.push(`  ${l.name || "Unknown"} â€” ${l.service || "General Inquiry"}`);
  }

  if (unread.length > 0) {
    lines.push("", `Unread messages (${unread.length}):`);
    for (const m of unread) lines.push(`  ${m.from_name || m.from_email || "Unknown sender"} â€” ${m.subject}`);
  }

  lines.push("", "Admin: https://ferguson-law.com/admin", "â€” J Supreme Tech");

  const msg = lines.join("\n");
  const owenBookingLines = [
    `Good morning, Owen. Ferguson Law bookings for ${dateLabel}.`,
    "",
    ...(appts.length === 0
      ? ["Appointments today: None."]
      : [
          `Appointments today (${appts.length}):`,
          ...appts.flatMap((appointment) => [
            `  ${jaTime(appointment.starts_at)} â€” ${appointment.name || "Unknown"} | ${appointment.service}`,
            ...(appointment.email ? [`    ${appointment.email}${appointment.phone ? ` | ${appointment.phone}` : ""}`] : []),
            ...((appointment.meta as Record<string, unknown> | null)?.meeting_url
              ? [`    Meeting: ${(appointment.meta as Record<string, unknown>).meeting_url}`]
              : [`    Ref: ${appointment.ref}`]),
          ]),
        ]),
    "",
    "Admin: https://ferguson-law.com/admin",
  ].join("\n");

  const [whatsapp, emailSent, owenWhatsapp] = await Promise.all([
    notifyJordanWA(msg),
    sendEmail(`Ferguson Law â€” ${dateLabel}`, msg),
    notifyOwenBusinessWA(owenBookingLines),
  ]);

  const ok = whatsapp.failed === 0 && emailSent && owenWhatsapp.failed === 0;
  return Response.json({
    ok,
    bookings: appts.length,
    leads: leads.length,
    unread: unread.length,
    delivery: { jordanWhatsapp: whatsapp, jordanEmail: emailSent, owenBookingWhatsapp: owenWhatsapp },
  }, { status: ok ? 200 : 502 });
}
