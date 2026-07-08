/**
 * /booking/complete?ref=…&status=paid|failed
 *
 * Where the payment-return handler lands the visitor after the gateway.
 *   • paid   → success: green check, ref badge, "confirmation sent", WhatsApp.
 *   • failed → friendly retry message + WhatsApp.
 *
 * Next 16: searchParams is a Promise — await it (server component).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { SITE, waLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Booking — Ferguson Law",
  robots: { index: false, follow: false },
};

const GREEN = "#102A1E";
const GOLD = "#C8A65C";

export default async function BookingCompletePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] ?? "" : v ?? "";

  const ref = one(sp.ref);
  const paid = one(sp.status) === "paid";

  const wa = paid
    ? waLink(
        `Hi Ferguson Law — my consultation is paid and confirmed.\nRef: ${ref}`,
      )
    : waLink(
        `Hi Ferguson Law — I had trouble paying for my consultation${
          ref ? ` (Ref: ${ref})` : ""
        }. Can you help me book?`,
      );

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.brand}>Ferguson Law</div>

        {paid ? (
          <>
            <div style={{ ...S.check, ...S.checkPaid }}>✓</div>
            <h1 style={S.h1}>You&apos;re booked.</h1>
            <p style={S.p}>
              Your payment went through and your consultation is confirmed. A
              confirmation is on its way to your email — and you can send the
              details to us on WhatsApp below.
            </p>
            {ref && (
              <div style={S.refBadge}>
                Reference&nbsp; <span style={S.mono}>{ref}</span>
              </div>
            )}
            <a href={wa} target="_blank" rel="noopener" style={S.goldBtn}>
              Send details on WhatsApp
            </a>
            <Link href="/" style={S.ghostBtn}>
              Return to site
            </Link>
          </>
        ) : (
          <>
            <div style={{ ...S.check, ...S.checkFail }}>!</div>
            <h1 style={S.h1}>Payment didn&apos;t go through.</h1>
            <p style={S.p}>
              No charge was made and your slot wasn&apos;t lost. You can try
              booking again, or message us on WhatsApp and we&apos;ll lock in
              your consultation for you.
            </p>
            <Link href="/" style={S.goldBtn}>
              Try booking again
            </Link>
            <a href={wa} target="_blank" rel="noopener" style={S.ghostBtn}>
              Book on WhatsApp instead
            </a>
          </>
        )}

        <p style={S.foot}>
          {SITE.whatsappDisplay} &nbsp;·&nbsp; {SITE.email}
        </p>
      </div>
    </div>
  );
}

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
    padding: "36px 32px 28px",
    width: "100%",
    maxWidth: 460,
    textAlign: "center",
    boxShadow: "0 36px 80px -28px rgba(0,0,0,.6)",
  },
  brand: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontWeight: 600,
    fontSize: "1.3rem",
    color: GREEN,
    marginBottom: 18,
  },
  check: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: "2rem",
    fontWeight: 700,
    margin: "0 auto 18px",
  },
  checkPaid: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
  checkFail: { background: "rgba(190,60,60,.14)", color: "#a23b3b" },
  h1: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "1.6rem",
    color: GREEN,
    margin: "0 0 12px",
  },
  p: { color: "#5c645e", fontSize: ".96rem", lineHeight: 1.7, margin: "0 0 22px" },
  refBadge: {
    display: "inline-block",
    background: "rgba(16,42,30,.06)",
    border: "1px solid rgba(16,42,30,.14)",
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: ".82rem",
    color: GREEN,
    marginBottom: 24,
    letterSpacing: ".04em",
  },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700 },
  goldBtn: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    borderRadius: 12,
    background: GOLD,
    color: GREEN,
    fontWeight: 700,
    fontSize: "1rem",
    textDecoration: "none",
    marginBottom: 12,
  },
  ghostBtn: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(18,16,12,.2)",
    color: "#69736d",
    fontWeight: 600,
    fontSize: ".92rem",
    textDecoration: "none",
  },
  foot: {
    color: "#9a937f",
    fontSize: ".78rem",
    lineHeight: 1.6,
    margin: "24px 0 0",
  },
};
