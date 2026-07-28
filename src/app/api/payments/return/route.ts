/**
 * GET /api/payments/return
 *
 * The gateway (mock or live WiPay) redirects here after checkout. We:
 *   1. parseReturn() the query → { orderId, status, txn }.
 *   2. Look up the `payments` row by order_id (= the booking ref).
 *   3. On PAID: mark payments 'paid' + appointment payment_status='paid' /
 *      status='confirmed', update the lead, send the confirmation email, then
 *      302 → /booking/complete?ref=…&status=paid.
 *   4. On FAILED: mark both failed, 302 → /booking/complete?ref=…&status=failed.
 *
 * Idempotent: if the payments row is already 'paid' we skip the writes + email,
 * so re-hitting the URL never double-confirms or double-sends.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseReturn } from "@/lib/payments/wipay";
import { fullWhenLabel } from "@/lib/booking/format";
import { sendBookingConfirmation } from "@/lib/email/send";

async function createZoomMeeting(topic: string, startsAt: string, duration: number): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) return null;
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      { method: "POST", headers: { Authorization: `Basic ${credentials}` } },
    );
    if (!tokenRes.ok) return null;
    const { access_token } = await tokenRes.json() as { access_token: string };
    const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startsAt,
        duration,
        settings: { join_before_host: true, waiting_room: false },
      }),
    });
    if (!meetingRes.ok) return null;
    const data = await meetingRes.json() as { join_url: string };
    return data.join_url;
  } catch { return null; }
}

function normaliseOrderId(value: string | undefined): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  return raw.replace(/^order=/i, "").replace(/^ref=/i, "").trim();
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirect(req: NextRequest, ref: string, status: "paid" | "failed") {
  const origin = new URL(req.url).origin;
  const url = `${origin}/booking/complete?ref=${encodeURIComponent(ref)}&status=${status}`;
  return Response.redirect(url, 302);
}

async function findBookingRef(supabase: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data, error } = await supabase.from("appointments").select("ref").eq("ref", orderId).limit(1).maybeSingle();
  if (!error && data?.ref) return data.ref;

  const { data: byLead, error: byLeadErr } = await supabase.from("ferguson_leads").select("ref").eq("ref", orderId).limit(1).maybeSingle();
  if (!byLeadErr && byLead?.ref) return byLead.ref;

  const { data: byPayment, error: byPaymentErr } = await supabase.from("payments").select("appointment_ref").eq("order_id", orderId).limit(1).maybeSingle();
  if (!byPaymentErr && byPayment?.appointment_ref) return byPayment.appointment_ref;

  return orderId;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  const { orderId, status, txn } = parseReturn(query);
  const normalizedOrderId = normaliseOrderId(orderId);

  // Without an order id we can't reconcile anything — show a generic failure.
  if (!normalizedOrderId) return redirect(req, "", "failed");

  const supabase = createAdminClient();
  const resolvedRef = await findBookingRef(supabase, normalizedOrderId);

  // Settle the checkout in one privileged step (payments + appointment + lead),
  // returning the appointment detail for the email and whether THIS call is the
  // one that flipped it to paid (so re-hits never double-send). `payments` and
  // `appointments` are server-only, so this goes through a SECURITY DEFINER RPC.
  const paid = status === "paid";
  const { data: rows, error } = await supabase.rpc("fl_settle_payment", {
    p_order_id: normalizedOrderId,
    p_paid: paid,
    p_txn: txn || null,
  });

  type SettleRow = {
    r_ref: string | null;
    r_name: string | null;
    r_email: string | null;
    r_service: string | null;
    r_starts: string | null;
    newly_paid: boolean | null;
  };
  const row = (Array.isArray(rows) ? rows[0] : null) as SettleRow | null;
  const ref = row?.r_ref || resolvedRef || normalizedOrderId;

  if (error || !paid) {
    return redirect(req, ref, "failed");
  }

  // Confirmation email fires once, only on the transition to paid.
  if (row?.newly_paid && row.r_email) {
    let meetingUrl: string | undefined;
    try {
      const url = await createZoomMeeting("Ferguson Law Consultation", row.r_starts ?? new Date().toISOString(), 60);
      if (url) {
        meetingUrl = url;
        await supabase.from("appointments").update({ meta: { zoom_url: url } }).eq("ref", ref);
      }
    } catch { /* swallow */ }

    try {
      await sendBookingConfirmation({
        to: row.r_email,
        name: row.r_name || "",
        service: row.r_service || "Consultation",
        whenLabel: row.r_starts ? fullWhenLabel(row.r_starts) : "",
        ref,
        meetingUrl,
      });
    } catch {
      /* swallow — payment already settled */
    }
  }

  return redirect(req, ref, "paid");
}
