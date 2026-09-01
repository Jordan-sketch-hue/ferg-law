import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { serviceDuration, TZ } from "@/lib/booking/availability";
import { isServiceId, serviceTitle } from "@/lib/booking/services";
import { fullWhenLabel } from "@/lib/booking/format";
import { sendBookingConfirmation } from "@/lib/email/send";
import { createMeetingRoom } from "@/lib/meetings/create";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genRef() {
  return "FL-" + Math.floor(100000 + Math.random() * 900000);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-admin-token") ?? "";
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
    if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const body = (await req.json()) as {
      service?: string;
      startsAt?: string;
      name?: string;
      email?: string;
      phone?: string;
      sendEmail?: boolean;
    };

    const service = String(body.service ?? "");
    const startsAtRaw = String(body.startsAt ?? "");
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const sendEmail = body.sendEmail === true;

    if (!isServiceId(service)) return NextResponse.json({ error: "Unknown service." }, { status: 400 });
    const startsAt = new Date(startsAtRaw);
    if (isNaN(startsAt.getTime())) return NextResponse.json({ error: "Invalid date/time." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Client name is required." }, { status: 400 });

    const duration = serviceDuration(service);
    const startsIso = startsAt.toISOString();
    const endsIso = new Date(startsAt.getTime() + duration * 60_000).toISOString();
    const title = serviceTitle(service);
    const whenLabel = fullWhenLabel(startsIso);
    const ref = genRef();

    const admin = createAdminClient();

    // Check for slot conflicts
    const { data: clash } = await admin.rpc("taken_slots", { p_from: startsIso, p_to: endsIso });
    if (Array.isArray(clash) && clash.length > 0) {
      return NextResponse.json({ error: "That slot is already booked." }, { status: 409 });
    }

    // Auto-generate meeting link
    let meetingUrl: string | undefined;
    let meetingProvider: string | undefined;
    try {
      const meeting = await createMeetingRoom("Ferguson Law Consultation", startsIso, duration);
      if (meeting) {
        meetingUrl = meeting.url;
        meetingProvider = meeting.provider;
      }
    } catch { /* non-fatal */ }

    const { error: apptErr } = await admin.from("appointments").insert({
      lead_ref: ref,
      name,
      email: email || null,
      phone: phone || null,
      service: title,
      starts_at: startsIso,
      ends_at: endsIso,
      status: "confirmed",
      payment_status: "admin",
      ref,
      meta: {
        service_id: service,
        created_by: "admin",
        meeting_url: meetingUrl ?? null,
        meeting_provider: meetingProvider ?? null,
        tz: TZ,
      },
    });

    if (apptErr) return NextResponse.json({ error: "Could not save booking." }, { status: 500 });

    if (sendEmail && email) {
      try {
        await sendBookingConfirmation({ to: email, name, service: title, whenLabel, ref, meetingUrl });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ ok: true, ref, meetingUrl: meetingUrl ?? null, whenLabel });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
