/**
 * POST /api/admin/zoom/cancel
 * Cancels a booking and emails the client. Body: { token, ref }
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingUpdate } from "@/lib/email/send";
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

  const { data: rows, error: lookupErr } = await supabase.rpc("fl_admin_appointments", { p_token: token });
  if (lookupErr) return Response.json({ ok: false, error: lookupErr.message }, { status: 500 });
  const appt = ((rows ?? []) as ApptRow[]).find(r => r.id === id);
  if (!appt) return Response.json({ ok: false, error: "Booking not found." }, { status: 404 });

  const { error } = await supabase.rpc("fl_admin_cancel_booking", { p_token: token, p_id: appt.id });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  if (appt.email) {
    await sendBookingUpdate({
      to: appt.email,
      name: appt.name ?? "there",
      service: appt.service ?? "Consultation",
      whenLabel: fullWhenLabel(appt.starts_at),
      ref: appt.ref,
      kind: "cancelled",
    });
  }

  return Response.json({ ok: true });
}
