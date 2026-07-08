/**
 * WiPay payment adapter — server-only. Env-driven, never throws on misconfig.
 *
 * TWO MODES, chosen by env (NO code change to flip):
 *   • SANDBOX / MOCK (default) — returns an internal `/pay/mock` URL so the
 *     entire pay-before-booking flow is testable end-to-end with no WiPay
 *     account. This is what runs until the merchant account is approved.
 *   • LIVE — POSTs WiPay Jamaica's hosted-checkout "request a payment" call and
 *     returns the hosted-page URL the visitor is redirected to.
 *
 * Going live is purely an env change:
 *   WIPAY_ENV=live + WIPAY_ACCOUNT_NUMBER + WIPAY_API_KEY  → real payments.
 * If live is requested but creds are half-set, we log and fall back to mock so
 * a booking is never hard-blocked by a misconfiguration.
 */

const WIPAY_BASE = "https://jm.wipayfinancial.com"; // Jamaica gateway base

export type PaymentCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type CreatePaymentArgs = {
  amount: number; // whole JMD
  orderId: string; // our booking ref (also the WiPay order_id)
  customer: PaymentCustomer;
  returnUrl: string; // absolute URL WiPay redirects back to
};

export type CreatePaymentResult = {
  payUrl: string;
  mode: "mock" | "live";
};

export type ParsedReturn = {
  orderId: string;
  status: "paid" | "failed";
  txn: string | null;
};

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * True only when WiPay is fully configured for real charges:
 * WIPAY_ENV=live AND an account number AND an API key are all present.
 */
export function isLive(): boolean {
  return (
    env("WIPAY_ENV").toLowerCase() === "live" &&
    env("WIPAY_ACCOUNT_NUMBER") !== "" &&
    env("WIPAY_API_KEY") !== ""
  );
}

/**
 * Create a hosted payment and return the URL to redirect the visitor to.
 * Falls back to the internal mock gateway whenever live is not (fully) on.
 */
export async function createPayment(
  args: CreatePaymentArgs,
): Promise<CreatePaymentResult> {
  const { amount, orderId, customer, returnUrl } = args;

  // --- Mock / sandbox path (default) ---------------------------------------
  // Build an internal URL the in-app simulator page understands. No network,
  // no creds — the flow is fully exercisable. The simulator's two buttons hit
  // /api/payments/return with status=paid|failed.
  if (!isLive()) {
    const params = new URLSearchParams({
      order: orderId,
      amount: String(amount),
      ref: orderId,
      return: returnUrl,
    });
    return { payUrl: `/pay/mock?${params.toString()}`, mode: "mock" };
  }

  // --- Live path -----------------------------------------------------------
  // TODO(WiPay-approval): CONFIRM the exact endpoint path, the param names, and
  // the return-hash verification against the merchant's WiPay developer
  // dashboard once the account is approved. Everything WiPay-specific is
  // isolated to this block + parseReturn() so confirming it is a ~5-minute edit.
  // The shape below follows WiPay JM's documented "request a payment" /
  // plugin/payment-as-a-service hosted call; adjust field names if the
  // dashboard's API reference differs.
  try {
    const body = new URLSearchParams({
      account_number: env("WIPAY_ACCOUNT_NUMBER"),
      total: String(amount),
      currency: "JMD",
      order_id: orderId,
      return_url: returnUrl,
      fee_structure: "customer_pay",
      environment: "live",
      developer_id: env("WIPAY_DEVELOPER_ID"),
      country_code: env("WIPAY_COUNTRY") || "JM",
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    });

    const resp = await fetch(`${WIPAY_BASE}/plugins/payments/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        // TODO(WiPay-approval): confirm whether the API key is sent as a Bearer
        // header (as below) or as an `api_key` body param — dashboard decides.
        Authorization: `Bearer ${env("WIPAY_API_KEY")}`,
      },
      body: body.toString(),
    });

    const data = (await resp.json().catch(() => null)) as
      | { url?: string; payment_url?: string; data?: { url?: string } }
      | null;

    // TODO(WiPay-approval): confirm the exact field holding the hosted-page URL.
    const payUrl =
      data?.url || data?.payment_url || data?.data?.url || "";

    if (!resp.ok || !payUrl) {
      console.warn(
        "[wipay] live createPayment did not return a pay URL; falling back to mock.",
        { status: resp.status },
      );
      return fallbackMock(args);
    }

    return { payUrl, mode: "live" };
  } catch (err) {
    console.warn(
      "[wipay] live createPayment threw; falling back to mock.",
      err instanceof Error ? err.message : err,
    );
    return fallbackMock(args);
  }
}

function fallbackMock(args: CreatePaymentArgs): CreatePaymentResult {
  const params = new URLSearchParams({
    order: args.orderId,
    amount: String(args.amount),
    ref: args.orderId,
    return: args.returnUrl,
  });
  return { payUrl: `/pay/mock?${params.toString()}`, mode: "mock" };
}

/**
 * Interpret the gateway's return query.
 *   • Mock: trusts the `status` param (paid|failed) the simulator sends.
 *   • Live: reads WiPay's returned status + transaction_id.
 * Returns a normalized { orderId, status, txn }.
 */
export function parseReturn(
  query: Record<string, string | undefined>,
): ParsedReturn {
  const orderId = (query.order_id || query.order || "").toString();

  // Mock returns carry our own simple status param.
  if (query.mock === "1") {
    return {
      orderId,
      status: query.status === "paid" ? "paid" : "failed",
      txn: query.txn || null,
    };
  }

  // --- Live return ---------------------------------------------------------
  // TODO(WiPay-approval): confirm the exact return param names AND verify the
  // response hash (WiPay signs the return) before trusting `status`. WiPay JM
  // documents a `status` of "success"/"failed" plus `transaction_id`; adjust
  // here once the dashboard's callback reference is confirmed.
  const raw = (query.status || "").toString().toLowerCase();
  const paid = raw === "success" || raw === "paid" || raw === "completed";
  return {
    orderId,
    status: paid ? "paid" : "failed",
    txn: query.transaction_id || query.txn || null,
  };
}
