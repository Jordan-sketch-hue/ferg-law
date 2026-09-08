/**
 * Shared writer for fl_appointment_reminder_log — the "did the system actually
 * do what it claims" audit trail the admin attention panel reads.
 *
 * Always goes through the service-role client (every caller already holds one
 * for its real work — booking writes, payment settlement, meeting links) so no
 * admin session token needs to be threaded into public/unauthenticated routes.
 * Best-effort: a failed audit write must never block the booking, email, or
 * push it's describing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReminderLogType =
  | "confirmation"
  | "24h"
  | "2h"
  | "1h"
  | "15m"
  | "attendance_check"
  | "rescheduled"
  | "cancelled"
  | "link_updated";
export type ReminderLogChannel = "email" | "whatsapp" | "sms" | "push";
export type ReminderLogStatus = "pending" | "sent" | "delivered" | "failed" | "skipped";

export interface LogReminderArgs {
  appointmentId: string;
  appointmentRef: string;
  reminderType: ReminderLogType;
  channel: ReminderLogChannel;
  destination: string | null;
  status: ReminderLogStatus;
  forStartsAt: string;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export async function logReminderEvent(admin: SupabaseClient, args: LogReminderArgs): Promise<void> {
  try {
    await admin.from("fl_appointment_reminder_log").upsert(
      {
        appointment_id: args.appointmentId,
        appointment_ref: args.appointmentRef,
        reminder_type: args.reminderType,
        channel: args.channel,
        destination: args.destination,
        status: args.status,
        provider_message_id: args.providerMessageId ?? null,
        error_message: args.errorMessage ?? null,
        for_starts_at: args.forStartsAt,
        sent_at: args.status === "sent" || args.status === "delivered" ? new Date().toISOString() : null,
      },
      { onConflict: "appointment_id,reminder_type,channel,for_starts_at" },
    );
  } catch {
    /* audit logging must never block the actual booking/notification action */
  }
}
