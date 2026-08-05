/**
 * POST /api/admin/zoom/recreate
 * Generates a fresh call link for a booking (old link stale/expired/already used),
 * saves it, and emails the client the new link.
 * Body: { token, ref }
 */
import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createMeetingRoom } from "@/lib/meetings/create";
import { sendBookingUpdate } from "@/lib/email/send";
import { fullWhenLabel } from "@/lib/booking/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApptRow = {
  id: string; ref: string; name: string | null; email: string | null; service: string | null;
  starts_at: string; meta: Record<string, unknown> | null;
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

  const meeting = await createMeetingRoom(`Ferguson Law Consultation`, appt.starts_at, 60);
  if (!meeting) return Response.json({ ok: false, error: "Video calling isn't configured yet." }, { status: 503 });

  const prevMeta = appt.meta ?? {};
  await createAdminClient().from("appointments").update({
    meta: { ...prevMeta, meeting_url: meeting.url, meeting_provider: meeting.provider },
  }).eq("ref", appt.ref);

  if (appt.email) {
    await sendBookingUpdate({
      to: appt.email,
      name: appt.name ?? "there",
      service: appt.service ?? "Consultation",
      whenLabel: fullWhenLabel(appt.starts_at),
      ref: appt.ref,
      meetingUrl: meeting.url,
      kind: "link_updated",
    });
  }

  return Response.json({ ok: true, url: meeting.url, provider: meeting.provider });
}
