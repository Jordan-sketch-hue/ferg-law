/**
 * /pay/mock — the SANDBOX payment simulator.
 *
 * Only reached when WiPay is NOT live (the default until the merchant account
 * is approved). It stands in for the real WiPay hosted page: two buttons that
 * navigate to /api/payments/return with status=paid|failed&mock=1, exercising
 * the exact same return flow the live gateway will hit. Harmless in production
 * — once WIPAY_ENV=live, createPayment() returns the real WiPay URL instead and
 * visitors never land here.
 *
 * Next 16: searchParams is a Promise in server components — await it, then hand
 * the values to a tiny client component for the navigation.
 */
import type { Metadata } from "next";
import MockPayClient from "./MockPayClient";

export const metadata: Metadata = {
  title: "Sandbox payment — Ferguson Law",
  robots: { index: false, follow: false },
};

export default async function MockPayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] ?? "" : v ?? "";

  const order = one(sp.order);
  const amount = one(sp.amount);
  const ref = one(sp.ref) || order;
  const ret = one(sp.return);

  return (
    <MockPayClient order={order} amount={amount} reference={ref} returnUrl={ret} />
  );
}
