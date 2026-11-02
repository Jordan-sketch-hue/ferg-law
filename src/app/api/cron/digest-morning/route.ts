/**
 * GET /api/cron/digest-morning
 * Runs daily at 8:00 AM JA time (13:00 UTC).
 * Jordan receives: full operational digest (bookings + leads + unread inbox).
 * Owen receives:   bookings-only digest (his personal schedule).
 * Neither send leaks the other's content.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyJordanWA, notifyOwenBusinessWA, checkWASession } from "@/lib/wa-notify";

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

async function sendEmail(to: string[], bcc: string[], subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[digest-morning] Email delivery skipped: RESEND_API_KEY not configured.");
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ferguson Law <contact@fergusonlawja.com>",
      to,
      ...(bcc.length > 0 ? { bcc } : {}),
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

  // --- Jordan's full operational digest ---
  const jordanLines: string[] = [];
  jordanLines.push(`Good morning. Ferguson Law operator update for ${dateLabel}.`, "");

  if (appts.length === 0) {
    jordanLines.push("Appointments today: None.");
  } else {
    jordanLines.push(`Appointments today (${appts.length}):`);
    for (const a of appts) {
      const meta = a.meta as Record<string, unknown> | null;
      const meetingUrl = (meta?.meeting_url as string | null) ?? null;
      jordanLines.push(`  ${jaTime(a.starts_at)} - ${a.name || "Unknown"} | ${a.service}`);
      if (a.email) jordanLines.push(`    ${a.email}${a.phone ? " | " + a.phone : ""}`);
      if (meetingUrl) jordanLines.push(`    Meeting: ${meetingUrl}`);
      else jordanLines.push(`    Ref: ${a.ref}`);
    }
  }

  jordanLines.push("");

  if (leads.length === 0) {
    jordanLines.push("New leads: None.");
  } else {
    jordanLines.push(`New leads (${leads.length}):`);
    for (const l of leads) jordanLines.push(`  ${l.name || "Unknown"} - ${l.service || "General Inquiry"}`);
  }

  if (unread.length > 0) {
    jordanLines.push("", `Unread messages (${unread.length}):`);
    for (const m of unread) jordanLines.push(`  ${m.from_name || m.from_email || "Unknown sender"} - ${m.subject}`);
  }

  jordanLines.push("", "Admin: https://ferguson-law.com/admin", "- J Supreme Tech");
  const jordanMsg = jordanLines.join("\n");

  // --- Owen's bookings-only digest (his schedule, nothing from Jordan's inbox) ---
  const owenLines: string[] = [
    `Good morning, Owen. Ferguson Law bookings for ${dateLabel}.`,
    "",
  ];
  if (appts.length === 0) {
    owenLines.push("Appointments today: None.");
  } else {
    owenLines.push(`Appointments today (${appts.length}):`);
    for (const a of appts) {
      const meta = a.meta as Record<string, unknown> | null;
      const meetingUrl = (meta?.meeting_url as string | null) ?? null;
      owenLines.push(`  ${jaTime(a.starts_at)} - ${a.name || "Unknown"} | ${a.service}`);
      if (a.email) owenLines.push(`    ${a.email}${a.phone ? ` | ${a.phone}` : ""}`);
      if (meetingUrl) owenLines.push(`    Meeting: ${meetingUrl}`);
      else owenLines.push(`    Ref: ${a.ref}`);
    }
  }
  owenLines.push("", "Admin: https://ferguson-law.com/admin");
  const owenMsg = owenLines.join("\n");

  const staffEmail = process.env.FERGUSON_STAFF_EMAIL || "contact@fergusonlawja.com";

  // Verify Railway WA session is live before sending.
  // "waiting to be received" on Owen/Jordan's device = session dropped between sends.
  // If session is dead, skip WA gracefully and log — email still goes out.
  const waSession = await checkWASession();
  if (!waSession.live) {
    console.warn("[digest-morning] WA session is not live — skipping WA sends.", { detail: waSession.detail });
  }

  const [jordanWA, jordanEmail, owenWA, owenEmail] = await Promise.all([
    // Jordan: full digest via WA (skipped if session dead)
    waSession.live ? notifyJordanWA(jordanMsg) : Promise.resolve({ sent: 0, failed: 0 }),
    // Jordan: full digest directly to his own emails (NOT via Owen's email as BCC)
    sendEmail(
      ["jordanrmorris01@icloud.com"],
      ["jordanmorrisr@gmail.com"],
      `Ferguson Law (Full) - ${dateLabel}`,
      jordanMsg,
    ),
    // Owen: bookings only via WA (skipped if session dead)
    waSession.live ? notifyOwenBusinessWA(owenMsg) : Promise.resolve({ sent: 0, failed: 0 }),
    // Owen: bookings only via email (no leads, no unread inbox)
    sendEmail(
      [staffEmail],
      [],
      `Ferguson Law Bookings - ${dateLabel}`,
      owenMsg,
    ),
  ]);

  const ok = jordanWA.failed === 0 && jordanEmail && owenWA.failed === 0 && owenEmail;
  return Response.json({
    ok,
    bookings: appts.length,
    leads: leads.length,
    unread: unread.length,
    waSessionLive: waSession.live,
    delivery: {
      jordanWA,
      jordanEmail,
      owenWA,
      owenEmail,
    },
  }, { status: ok ? 200 : 502 });
}