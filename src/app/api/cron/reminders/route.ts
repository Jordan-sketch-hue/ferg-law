/**
 * GET /api/cron/reminders — automatic appointment reminders + attention alerts.
 *
 * Run on a schedule (Vercel Cron, every 15 min — see vercel.json). Each run:
 *  1. Finds confirmed bookings entering the 24h/2h/1h/15m windows, emails a
 *     branded reminder, marks each so it fires exactly once, and logs every
 *     attempt (sent/failed/skipped) to fl_appointment_reminder_log for the
 *     admin-facing reminder-history panel.
 *  2. Pushes an admin alert for any confirmed appointment whose end time has
 *     passed without being marked completed/no-show ("attendance confirmation
 *     required") — once per appointment, via the same log table as a guard.
 *  3. Pushes a once-daily "good morning" digest around 7am Jamaica time.
 *
 * Auth: when CRON_SECRET is set, Vercel sends `Authorization: Bearer <secret>`;
 * we reject anything else so the endpoint can't be triggered by the public.
 */
import { NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/server";
import { sendBookingReminder } from "@/lib/email/send";
import { fullWhenLabel } from "@/lib/booking/format";
import { TZ } from "@/lib/booking/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DueRow = {
  ref: string;
  name: string | null;
  email: string | null;
  service: string | null;
  starts_at: string | null;
};

type ApptRow = {
  id: string;
  ref: string;
  name: string | null;
  service: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string | null;
};

const REMINDER_KINDS = ["24h", "2h", "1h", "15m"] as const;

async function pushToAdmins(title: string, body: string, url = "/admin") {
  const secret = process.env.PUSH_INTERNAL_SECRET;
  if (!secret) return;
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://ferguson-law.vercel.app"}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-push-secret": secret },
      body: JSON.stringify({ role: "admin", title, body, url, tag: "appointment-attention" }),
    });
  } catch {
    /* push is best-effort — never blocks the cron */
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "cron not configured" }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.FL_ADMIN_TOKEN || "";
  const supabase = createAdminClient();
  const result: Record<string, number> = { "24h": 0, "2h": 0, "1h": 0, "15m": 0 };

  // 1. Client reminders (all tiers), each attempt logged for the audit panel.
  for (const kind of REMINDER_KINDS) {
    const { data, error } = await supabase.rpc("fl_due_reminders", {
      p_token: token,
      p_kind: kind,
    });
    if (error || !Array.isArray(data)) continue;

    for (const row of data as DueRow[]) {
      if (!row.email || !row.starts_at) continue;

      // Need the appointment id (fl_due_reminders only returns ref) for the log FK.
      const { data: apptRows } = await supabase
        .from("appointments")
        .select("id")
        .eq("ref", row.ref)
        .limit(1);
      const appointmentId = apptRows?.[0]?.id as string | undefined;

      const send = await sendBookingReminder({
        to: row.email,
        name: row.name || "",
        service: row.service || "Consultation",
        whenLabel: fullWhenLabel(row.starts_at),
        ref: row.ref,
        kind,
      });

      if (appointmentId) {
        const logStatus = "skipped" in send ? "skipped" : send.ok ? "sent" : "failed";
        await supabase.rpc("fl_admin_log_reminder", {
          p_token: token,
          p_appointment_id: appointmentId,
          p_appointment_ref: row.ref,
          p_reminder_type: kind,
          p_channel: "email",
          p_destination: row.email,
          p_status: logStatus,
          p_for_starts_at: row.starts_at,
          p_provider_message_id: "ok" in send && send.ok ? send.id ?? null : null,
          p_error_message: "ok" in send && !send.ok ? send.error : null,
        });
      }

      // Mark only when we actually attempted a send (ok or hard error). When
      // Resend isn't configured the send is "skipped" — leave it unmarked so it
      // can still fire once email is turned on (and it's still in-window).
      if (!("skipped" in send)) {
        await supabase.rpc("fl_mark_reminded", {
          p_token: token,
          p_ref: row.ref,
          p_kind: kind,
        });
        result[kind] += 1;
      }
    }
  }

  // 2. Attendance-confirmation alerts — confirmed appointments whose end time
  // has passed with no completed/no-show outcome. Bounded to the last 24h so a
  // long-neglected old booking doesn't re-alert forever.
  const nowIso = new Date().toISOString();
  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: overdue } = await supabase
    .from("appointments")
    .select("id, ref, name, service, starts_at, ends_at, status")
    .eq("status", "confirmed")
    .lt("ends_at", nowIso)
    .gt("ends_at", dayAgoIso);

  let attendanceAlerts = 0;
  for (const a of (overdue ?? []) as ApptRow[]) {
    // Check existence BEFORE writing — the upsert always "succeeds" (that's
    // the point of ON CONFLICT), so its return value can't tell first-write
    // from re-log. An explicit pre-check is what actually gates the push.
    const { data: alreadyLogged } = await supabase.rpc("fl_admin_reminder_log_exists", {
      p_token: token,
      p_appointment_id: a.id,
      p_reminder_type: "attendance_check",
      p_channel: "push",
      p_for_starts_at: a.starts_at,
    });
    if (alreadyLogged) continue;

    await supabase.rpc("fl_admin_log_reminder", {
      p_token: token,
      p_appointment_id: a.id,
      p_appointment_ref: a.ref,
      p_reminder_type: "attendance_check",
      p_channel: "push",
      p_destination: "admin",
      p_status: "sent",
      p_for_starts_at: a.starts_at,
    });
    attendanceAlerts += 1;
    await pushToAdmins(
      "Attendance confirmation required",
      `${a.name || "A client"} · ${a.service || "Consultation"} at ${formatInTimeZone(new Date(a.starts_at), TZ, "h:mm a")} — mark completed or no-show.`,
    );
  }

  // 3. Once-daily morning digest. Window is a full hour (7:00-7:59 Jamaica) so
  // one missed/delayed cron tick doesn't skip the whole day's digest — the
  // fl_daily_digest_log unique constraint still guarantees exactly one send.
  const jaHour = Number(formatInTimeZone(new Date(), TZ, "H"));
  let digestSent = false;
  if (jaHour === 7) {
    const todayKey = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    const { error: digestErr } = await supabase
      .from("fl_daily_digest_log")
      .insert({ digest_date: todayKey });
    if (!digestErr) {
      // Insert succeeded — first time today, unique constraint would have
      // rejected a duplicate. Safe to send exactly once.
      const dayStart = new Date(`${todayKey}T00:00:00-05:00`).toISOString();
      const dayEnd = new Date(`${todayKey}T23:59:59-05:00`).toISOString();
      const { data: todays } = await supabase
        .from("appointments")
        .select("id")
        .in("status", ["pending", "confirmed"])
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd);
      const n = todays?.length ?? 0;
      digestSent = true;
      await pushToAdmins(
        "Good morning",
        n === 0 ? "No appointments scheduled today." : `You have ${n} appointment${n === 1 ? "" : "s"} scheduled today.`,
      );
    }
  }

  return Response.json({ ok: true, sent: result, attendanceAlerts, digestSent });
}
