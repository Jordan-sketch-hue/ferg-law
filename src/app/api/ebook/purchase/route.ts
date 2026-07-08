/**
 * POST /api/ebook/purchase
 *
 * Initialize an ebook purchase. Takes email + initiates WiPay checkout,
 * or free path if applicable. Returns { ok, ref, payUrl, amount } or error.
 *
 * Body: { email }
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createPayment } from "@/lib/payments/wipay";
import { consultFee } from "@/lib/payments/fees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EBOOK_PRICE_JMD = 3000; // 3000 JMD
const EBOOK_PRICE_USD = 20;   // $20 USD

function genRef(): string {
  return "EBK-" + Math.floor(100000 + Math.random() * 900000);
}

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
  let body: { email?: unknown } = {};
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();

  if (!emailRe.test(email)) {
    return Response.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const ref = genRef();

    // Record the purchase attempt (pending) in ebook_purchases.
    const { error: recordErr } = await supabase.from("ebook_purchases").insert({
      order_id: ref,
      email,
      amount: EBOOK_PRICE_JMD,
      currency: "JMD",
      provider: "wipay",
      status: "pending",
      meta: { service_type: "ebook", guide: "H.O.M.E." },
    });

    if (recordErr) {
      return Response.json(
        { ok: false, error: "Could not initialize purchase. Please try again." },
        { status: 500 },
      );
    }

    // Create the hosted-checkout URL (mock or live).
    const returnUrl = `${originFrom(req)}/api/ebook/return`;
    const { payUrl } = await createPayment({
      amount: EBOOK_PRICE_JMD,
      orderId: ref,
      customer: { name: email, email, phone: "" },
      returnUrl,
    });

    return Response.json({
      ok: true,
      ref,
      payUrl,
      amount: EBOOK_PRICE_JMD,
      currency: "JMD",
      amountUsd: EBOOK_PRICE_USD,
    });
  } catch {
    return Response.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
