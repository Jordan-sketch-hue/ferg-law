"use client";

/**
 * Client half of the sandbox simulator — builds the return URLs and navigates.
 * The return URL passed in already points at /api/payments/return; we append
 * the simulated status + mock=1 so parseReturn() trusts it.
 */
import { formatJmd } from "@/lib/payments/fees";

export default function MockPayClient({
  order,
  amount,
  reference,
  returnUrl,
}: {
  order: string;
  amount: string;
  reference: string;
  returnUrl: string;
}) {
  const amt = Number(amount) || 0;

  function go(status: "paid" | "failed") {
    const base = returnUrl || "/api/payments/return";
    const sep = base.includes("?") ? "&" : "?";
    const url = `${base}${sep}order=${encodeURIComponent(order)}&status=${status}&mock=1`;
    window.location.href = url;
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.testBanner}>
          ⚠ This is a test gateway — no real charge will be made.
        </div>

        <div style={S.brand}>Ferguson Law</div>
        <div style={S.kicker}>Sandbox payment</div>

        <div style={S.amount}>{formatJmd(amt)}</div>
        <div style={S.sub}>
          Consultation fee for <span style={S.mono}>{reference || "—"}</span>
        </div>
        <div style={S.credit}>
          Credited toward your legal fees once you engage Ferguson Law.
        </div>

        <button type="button" style={S.payBtn} onClick={() => go("paid")}>
          Simulate successful payment
        </button>
        <button type="button" style={S.failBtn} onClick={() => go("failed")}>
          Simulate failed payment
        </button>

        <p style={S.foot}>
          Live WiPay checkout replaces this page automatically once the merchant
          account is approved (env only — no code change).
        </p>
      </div>
    </div>
  );
}

const GREEN = "#102A1E";
const GOLD = "#C8A65C";

const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    background: GREEN,
    fontFamily: "var(--sans, system-ui, sans-serif)",
    padding: 20,
  },
  card: {
    background: "#fbf8f1",
    borderRadius: 20,
    padding: "30px 30px 26px",
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
    boxShadow: "0 36px 80px -28px rgba(0,0,0,.6)",
  },
  testBanner: {
    background: "rgba(200,166,92,.18)",
    border: "1px solid rgba(200,166,92,.5)",
    color: "#8a6a22",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: ".78rem",
    fontWeight: 600,
    marginBottom: 22,
  },
  brand: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontWeight: 600,
    fontSize: "1.35rem",
    color: GREEN,
  },
  kicker: {
    fontSize: ".68rem",
    letterSpacing: ".22em",
    textTransform: "uppercase",
    color: "#a8853e",
    fontWeight: 700,
    marginTop: 6,
  },
  amount: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "2.6rem",
    fontWeight: 700,
    color: GREEN,
    margin: "20px 0 4px",
    lineHeight: 1,
  },
  sub: { color: "#69736d", fontSize: ".9rem", marginBottom: 10 },
  credit: {
    color: "#a8853e",
    fontSize: ".8rem",
    fontWeight: 600,
    margin: "0 auto 24px",
    maxWidth: 300,
    lineHeight: 1.5,
  },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: GREEN },
  payBtn: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "none",
    background: GOLD,
    color: GREEN,
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    marginBottom: 12,
  },
  failBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(18,16,12,.2)",
    background: "transparent",
    color: "#69736d",
    fontWeight: 600,
    fontSize: ".9rem",
    cursor: "pointer",
  },
  foot: {
    color: "#9a937f",
    fontSize: ".74rem",
    lineHeight: 1.6,
    margin: "22px 0 0",
  },
};
