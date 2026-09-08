/**
 * POST /api/admin/booking/create
 * Owen creates a booking on behalf of a client (e.g. after a phone/WA inquiry).
 * Inserts a CONFIRMED appointment (no payment), generates a Jitsi meeting link,
 * and optionally emails the client.
 */
import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createMeetingRoom } from "@/lib/meetings/create";
import { sendBookingConfirmation } from "@/lib/email/send";
import { serviceDuration, TZ } from "@/lib/booking/availability";
import { isServiceId, serviceTitle } from "@/lib/booking/services";
import { fullWhenLabel } from "@/lib/booking/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genRef(): string {
  return "FL-" + Math.floor(100000 + Math.random() * 900000);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    token: string;
    name: string;
    email: string;
    phone?: string;
    service: string;
    startsAt: string;
    notes?: string;
    sendEmail?: boolean;
  };

  const { token, name, email, phone = "", service, startsAt, notes = "", sendEmail = true } = body;

  // Auth
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "Not authorised." }, { status: 403 });

  if (!name?.trim() || !email?.trim() || !service || !startsAt) {
    return Response.json({ ok: false, error: "name, email, service and startsAt are required." }, { status: 400 });
  }
  if (!isServiceId(service)) {
    return Response.json({ ok: false, error: "Unknown service." }, { status: 400 });
  }

  const startsAtDate = new Date(startsAt);
  if (isNaN(startsAtDate.getTime())) {
    return Response.json({ ok: false, error: "Invalid date/time." }, { status: 400 });
  }

  const duration = serviceDuration(service);
  const startsIso = startsAtDate.toISOString();
  const endsIso = new Date(startsAtDate.getTime() + duration * 60_000).toISOString();
  const title = serviceTitle(service);
  const whenLabel = fullWhenLabel(startsIso);
  const ref = genRef();

  const admin = createAdminClient();

  // Generate meeting link (Jitsi always works as fallback)
  let meetingUrl: string | undefined;
  let meetingProvider: string | undefined;
  try {
    const meeting = await createMeetingRoom("Ferguson Law Consultation", startsIso, duration);
    meetingUrl = meeting.url;
    meetingProvider = meeting.provider;
  } catch { /* no meeting, still create the appointment */ }

  // Insert confirmed appointment
  const { error: apptErr } = await admin.from("appointments").insert({
    lead_ref: ref,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    service: title,
    starts_at: startsIso,
    ends_at: endsIso,
    status: "confirmed",
    payment_status: "free",
    ref,
    meta: {
      service_id: service,
      notes: notes || null,
      meeting_url: meetingUrl ?? null,
      meeting_provider: meetingProvider ?? null,
      created_by: "admin",
    },
  });

  if (apptErr) {
    return Response.json({ ok: false, error: "Failed to save booking: " + apptErr.message }, { status: 500 });
  }

  // Email client if requested and we have a valid email
  if (sendEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    try {
      await sendBookingConfirmation({
        to: email.trim(),
        name: name.trim(),
        service: title,
        whenLabel,
        ref,
        meetingUrl,
      });
    } catch { /* swallow — booking already saved */ }
  }

  return Response.json({ ok: true, ref, meetingUrl: meetingUrl ?? null, whenLabel });
}
