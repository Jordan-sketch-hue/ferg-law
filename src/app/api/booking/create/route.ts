/**
 * POST /api/booking/create
 *
 * Body: { service, startsAt, firstName, lastName, email, phone, notes?,
 *         recommender?, inviteCode? }
 *
 * Validates + re-checks the slot is free (double-book guard) + generates a ref,
 * then branches:
 *
 *   FREE PATH (valid inviteCode): consume the invite, write a CONFIRMED /
 *   payment_status='free' appointment, a payments row (status 'free', amount 0),
 *   the CRM lead, send the confirmation email now, and return { ok, ref, free }.
 *
 *   PAY PATH (default): write a PENDING / payment_status='pending' appointment,
 *   a payments row (status 'pending', amount = consult fee), the CRM lead
 *   (meta.payment='pending'), create a WiPay (mock/live) hosted-checkout URL,
 *   and return { ok, ref, payUrl, amount }. NO email yet — that fires on the
 *   gateway return once payment is confirmed.
 *
 * Best-effort side writes (lead mirror, email) never fail the booking.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { serviceDuration, TZ } from "@/lib/booking/availability";
import { isServiceId, serviceTitle } from "@/lib/booking/services";
import { fullWhenLabel, dateChipLabel, slotTimeLabel } from "@/lib/booking/format";
import { sendBookingConfirmation } from "@/lib/email/send";
import { notifyOwenWA } from "@/lib/wa-notify";
import { consultFee } from "@/lib/payments/fees";
import { createPayment } from "@/lib/payments/wipay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  service?: unknown;
  startsAt?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  notes?: unknown;
  recommender?: unknown;
  inviteCode?: unknown;
};

function genRef(): string {
  return "FL-" + Math.floor(100000 + Math.random() * 900000);
}

/** Absolute origin (scheme + host) from the request headers. */
function originFrom(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host") || "localhost:3041";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // ---- validate -----------------------------------------------------------
  const service = String(body.service ?? "");
  const startsAtRaw = String(body.startsAt ?? "");
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const recommender =
    body.recommender == null ? null : String(body.recommender).slice(0, 200);
  const inviteCode =
    body.inviteCode == null ? null : String(body.inviteCode).trim().slice(0, 80) || null;

  if (!isServiceId(service)) {
    return Response.json({ ok: false, error: "Unknown service." }, { status: 400 });
  }
  const startsAt = new Date(startsAtRaw);
  if (isNaN(startsAt.getTime())) {
    return Response.json({ ok: false, error: "Invalid time." }, { status: 400 });
  }
  if (startsAt.getTime() < Date.now()) {
    return Response.json({ ok: false, error: "That time has passed." }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return Response.json({ ok: false, error: "Name is required." }, { status: 400 });
  }
  if (!emailRe.test(email)) {
    return Response.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return Response.json({ ok: false, error: "A valid phone number is required." }, { status: 400 });
  }

  const duration = serviceDuration(service);
  const startsIso = startsAt.toISOString();
  const endsIso = new Date(startsAt.getTime() + duration * 60_000).toISOString();
  const title = serviceTitle(service);
  const whenLabel = fullWhenLabel(startsIso);
  const name = `${firstName} ${lastName}`.trim();

  try {
    const supabase = createAdminClient();

    // ---- re-check slot is still free (double-booking guard) ---------------
    // Check for ANY appointment that overlaps with the full consultation window
    // (not just the start time). Use the consultation end time to catch overlaps.
    const { data: clash, error: clashErr } = await supabase.rpc("taken_slots", {
      p_from: startsIso,
      p_to: endsIso,
    });
    if (clashErr) {
      return Response.json(
        { ok: false, error: "Could not verify availability. Please try again." },
        { status: 500 },
      );
    }
    if (Array.isArray(clash) && clash.length > 0) {
      return Response.json(
        { ok: false, error: "Sorry — that slot was just taken. Please pick another time." },
        { status: 409 },
      );
    }

    const ref = genRef();

    // ---- decide free vs pay -----------------------------------------------
    // A free booking requires a code that BOTH validates AND is atomically
    // consumed here (fl_consume_invite). If consume fails (spent/expired/typo)
    // we silently fall through to the pay path rather than erroring.
    let free = false;
    if (inviteCode) {
      const { data: consumed, error: consumeErr } = await supabase.rpc(
        "fl_consume_invite",
        { p_code: inviteCode },
      );
      free = !consumeErr && consumed === true;
    }

    // =====================================================================
    // FREE PATH — confirm immediately, no payment.
    // =====================================================================
    if (free) {
      // anon INSERT is allowed by RLS; we don't read the row back (no anon
      // SELECT on appointments), so omit .select().
      const { error: apptErr } = await supabase.from("appointments").insert({
        lead_ref: ref,
        name,
        email,
        phone,
        service: title,
        starts_at: startsIso,
        ends_at: endsIso,
        status: "confirmed",
        payment_status: "free",
        ref,
        meta: { service_id: service, recommender, notes: notes || null, invite: inviteCode },
      });

      if (apptErr) {
        return Response.json(
          { ok: false, error: "Could not save your booking. Please try again." },
          { status: 500 },
        );
      }

      // payments audit row via the definer RPC (payments is server-only) — best-effort.
      try {
        await supabase.rpc("fl_record_payment", {
          p_order_id: ref,
          p_ref: ref,
          p_amount: 0,
          p_currency: "JMD",
          p_provider: "invite",
          p_status: "free",
          p_meta: { invite: inviteCode, service_id: service },
        });
      } catch {
        /* swallow — appointment already saved */
      }

      await writeLead(supabase, {
        ref,
        name,
        email,
        phone,
        title,
        startsIso,
        notes,
        service,
        recommender,
        apptId: ref,
        extraMeta: { invite: inviteCode, payment: "free" },
      });

      // Confirmation email fires now (free bookings are immediately confirmed).
      try {
        await sendBookingConfirmation({ to: email, name, service: title, whenLabel, ref });
      } catch {
        /* swallow — booking already saved */
      }

      // Notify Owen (email + WhatsApp)
      try {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Ferguson Law <info@fergusonlawja.com>",
              to: ["owen@fergusonlawja.com"],
              subject: `New Booking (Free): ${name} — ${title}`,
              text: `New free booking\n\nRef: ${ref}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${title}\nWhen: ${whenLabel}\nNotes: ${notes || "—"}`,
            }),
          });
        }
      } catch { /* swallow */ }
      void notifyOwenWA(`📅 *New booking (free)*\n${name} · ${title}\n${whenLabel}\n${email} · ${phone}\nRef: ${ref}`);

      return Response.json({ ok: true, ref, free: true, startsAtLabel: whenLabel });
    }

    // =====================================================================
    // PAY PATH — pending until the gateway confirms payment.
    // =====================================================================
    const amount = consultFee(service);

    const { error: apptErr } = await supabase.from("appointments").insert({
      lead_ref: ref,
      name,
      email,
      phone,
      service: title,
      starts_at: startsIso,
      ends_at: endsIso,
      status: "pending",
      payment_status: "pending",
      ref,
      meta: { service_id: service, recommender, notes: notes || null },
    });

    if (apptErr) {
      return Response.json(
        { ok: false, error: "Could not save your booking. Please try again." },
        { status: 500 },
      );
    }

    // payments row (pending) via definer RPC — order_id is the ref so the
    // return handler finds it.
    const { error: payErr } = await supabase.rpc("fl_record_payment", {
      p_order_id: ref,
      p_ref: ref,
      p_amount: amount,
      p_currency: "JMD",
      p_provider: "wipay",
      p_status: "pending",
      p_meta: { service_id: service },
    });
    if (payErr) {
      return Response.json(
        { ok: false, error: "Could not start payment. Please try again." },
        { status: 500 },
      );
    }

    await writeLead(supabase, {
      ref,
      name,
      email,
      phone,
      title,
      startsIso,
      notes,
      service,
      recommender,
      apptId: ref,
      extraMeta: { payment: "pending", amount },
    });

    // ---- create the hosted-checkout URL (mock or live) -------------------
    const returnUrl = `${originFrom(req)}/api/payments/return`;
    const { payUrl } = await createPayment({
      amount,
      orderId: ref,
      customer: { name, email, phone },
      returnUrl,
    });

    // NO confirmation email here — it fires on the return once paid.
    // Notify Owen of pending booking
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Ferguson Law <info@fergusonlawja.com>",
            to: ["owen@fergusonlawja.com"],
            subject: `New Booking: ${name} — ${title}`,
            text: `New booking (payment pending)\n\nRef: ${ref}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${title}\nWhen: ${whenLabel}\nAmount: JMD ${amount.toLocaleString()}\nNotes: ${notes || "—"}`,
          }),
        });
      }
    } catch { /* swallow */ }
    void notifyOwenWA(`📅 *New booking (pending payment)*\n${name} · ${title}\n${whenLabel}\nJ$${amount.toLocaleString()} · ${email}\nRef: ${ref}`);

    return Response.json({ ok: true, ref, payUrl, amount });
  } catch {
    return Response.json(
      { ok: false, error: "Something went wrong. Please try again or reach us on WhatsApp." },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Shared CRM lead mirror — best-effort (a failure must not lose the booking).
// ---------------------------------------------------------------------------
type SupabaseClient = ReturnType<typeof createAdminClient>;

async function writeLead(
  supabase: SupabaseClient,
  d: {
    ref: string;
    name: string;
    email: string;
    phone: string;
    title: string;
    startsIso: string;
    notes: string;
    service: string;
    recommender: string | null;
    apptId: string;
    extraMeta: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("ferguson_leads").insert({
      source: "booking",
      status: "new",
      ref: d.ref,
      name: d.name,
      email: d.email,
      phone: d.phone,
      service: d.title,
      preferred_date: dateChipLabel(d.startsIso),
      preferred_time: slotTimeLabel(d.startsIso),
      message: d.notes || null,
      meta: {
        flow: "booking",
        appointment_id: d.apptId,
        starts_at: d.startsIso,
        service_id: d.service,
        recommender: d.recommender,
        tz: TZ,
        ...d.extraMeta,
      },
    });
  } catch {
    /* swallow — appointment already saved */
  }
}
