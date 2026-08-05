/**
 * POST /api/admin/zoom/resend
 * Re-sends the booking confirmation email (with the existing call link) to the client.
 * Body: { token, ref }
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmation } from "@/lib/email/send";
import { fullWhenLabel } from "@/lib/booking/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApptRow = {
  id: string; ref: string; name: string | null; email: string | null; service: string | null;
  starts_at: string; meta: Record<string, string> | null;
};

export async function POST(req: NextRequest) {
  const { token, id } = (await req.json()) as { token: string; id: string };
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("fl_admin_appointments", { p_token: token });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const appt = ((data ?? []) as ApptRow[]).find(r => r.id === id);
  if (!appt) return Response.json({ ok: false, error: "Booking not found." }, { status: 404 });
  if (!appt.email) return Response.json({ ok: false, error: "This booking has no email on file." }, { status: 400 });

  const meetingUrl = appt.meta?.meeting_url ?? appt.meta?.zoom_url ?? undefined;
  const result = await sendBookingConfirmation({
    to: appt.email,
    name: appt.name ?? "there",
    service: appt.service ?? "Consultation",
    whenLabel: fullWhenLabel(appt.starts_at),
    ref: appt.ref,
    meetingUrl,
  });

  if ("ok" in result && !result.ok) return Response.json({ ok: false, error: result.error }, { status: 502 });
  return Response.json({ ok: true });
}
