import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token: string };

    if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

    const supabase = await createClient();
    const { data: isAdmin, error: authErr } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (authErr || !isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const admin = createAdminClient();

    // Manual compose / CMS emails
    const { data: composed, error: e1 } = await admin
      .from("fl_email_log")
      .select("id, created_at, to_email, to_name, subject, body_preview, body_full, status, resend_id, context")
      .order("created_at", { ascending: false })
      .limit(150);

    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    // Automated reminder / attendance emails from the cron
    const { data: reminders } = await admin
      .from("fl_appointment_reminder_log")
      .select("id, created_at, destination, appointment_ref, reminder_type, status, provider_message_id, error_message")
      .eq("channel", "email")
      .order("created_at", { ascending: false })
      .limit(150);

    type EmailRow = {
      id: string;
      created_at: string;
      to_email: string;
      to_name: string | null;
      subject: string;
      body_preview: string | null;
      body_full: string | null;
      status: string;
      resend_id: string | null;
      context: string;
    };

    const LABEL: Record<string, string> = {
      "24h": "24-hour reminder",
      "2h": "2-hour reminder",
      "1h": "1-hour reminder",
      "15m": "15-minute reminder",
      confirmation: "Booking confirmation",
      link_updated: "Meeting link updated",
      attendance_check: "Attendance check alert",
    };

    // Hydrate email bodies for reminder rows by matching resend_id -> fl_email_log
    const resendIds = (reminders ?? [])
      .map((r) => r.provider_message_id)
      .filter((id): id is string => !!id);

    const bodyMap: Record<string, { preview: string | null; full: string | null }> = {};
    if (resendIds.length > 0) {
      const { data: logBodies } = await admin
        .from("fl_email_log")
        .select("resend_id, body_preview, body_full")
        .in("resend_id", resendIds);
      for (const row of logBodies ?? []) {
        if (row.resend_id) bodyMap[row.resend_id] = { preview: row.body_preview, full: row.body_full };
      }
    }

    const reminderRows: EmailRow[] = (reminders ?? []).map((r) => {
      const hydrated = r.provider_message_id ? bodyMap[r.provider_message_id] : undefined;
      return {
        id: `rem_${r.id}`,
        created_at: r.created_at,
        to_email: r.destination ?? "",
        to_name: null,
        subject: `${LABEL[r.reminder_type] ?? r.reminder_type} -- ${r.appointment_ref}`,
        body_preview: hydrated?.preview ?? (r.status === "failed" ? `Failed: ${r.error_message ?? "unknown"}` : null),
        body_full: hydrated?.full ?? null,
        status: r.status,
        resend_id: r.provider_message_id ?? null,
        context: `auto:${r.reminder_type}`,
      };
    });

    // Merge and sort newest-first
    const all = [...(composed ?? []), ...reminderRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ).slice(0, 200);

    return NextResponse.json({ emails: all });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}