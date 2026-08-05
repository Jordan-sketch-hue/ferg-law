/**
 * POST /api/admin/zoom/reschedule
 * Moves a booking to a new time and emails the client the update.
 * Body: { token, id, starts_at_wall } — starts_at_wall is a "YYYY-MM-DDTHH:mm"
 * wall-clock string with no zone, always interpreted as Jamaica time (so this
 * works correctly no matter what timezone the admin's browser is in).
 */
import { NextRequest } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { sendBookingUpdate } from "@/lib/email/send";
import { fullWhenLabel } from "@/lib/booking/format";
import { TZ } from "@/lib/booking/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApptRow = {
  id: string; ref: string; name: string | null; email: string | null; service: string | null;
  starts_at: string; meta: Record<string, string> | null;
};

export async function POST(req: NextRequest) {
  const { token, id, starts_at_wall } = (await req.json()) as {
    token: string; id: string; starts_at_wall: string;
  };
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data: rows, error: lookupErr } = await supabase.rpc("fl_admin_appointments", { p_token: token });
  if (lookupErr) return Response.json({ ok: false, error: lookupErr.message }, { status: 500 });
  const appt = ((rows ?? []) as ApptRow[]).find(r => r.id === id);
  if (!appt) return Response.json({ ok: false, error: "Booking not found." }, { status: 404 });

  const starts_at = fromZonedTime(starts_at_wall, TZ).toISOString();
  const ends_at = new Date(new Date(starts_at).getTime() + 60 * 60000).toISOString();

  const { data, error } = await supabase.rpc("fl_admin_reschedule_appointment", {
    p_token: token, p_id: appt.id, p_starts_at: starts_at, p_ends_at: ends_at,
  });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  if (appt.email) {
    const meetingUrl = appt.meta?.meeting_url ?? appt.meta?.zoom_url ?? undefined;
    await sendBookingUpdate({
      to: appt.email,
      name: appt.name ?? "there",
      service: appt.service ?? "Consultation",
      whenLabel: fullWhenLabel(starts_at),
      ref: appt.ref,
      meetingUrl,
      kind: "rescheduled",
    });
  }

  return Response.json({ ok: true, starts_at, appointment: Array.isArray(data) ? data[0] : data });
}
