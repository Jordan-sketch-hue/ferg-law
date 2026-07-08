import { NextRequest } from "next/server";
import { createPayment } from "@/lib/payments/wipay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const orderId = `BG-${Math.floor(100000 + Math.random() * 900000)}`;
  const returnUrl = `${origin}/api/payments/return?flow=buyers-guide&next=%2Fbuyers-guide`;

  const { payUrl } = await createPayment({
    amount: 3000,
    orderId,
    customer: {
      name: "Buyers Guide access",
      email: "guides@fergusonlawja.com",
      phone: "+1-876-320-0235",
    },
    returnUrl,
  });

  return Response.json({ ok: true, payUrl, amount: 3000, orderId });
}
