import type { Metadata } from "next";
import Link from "next/link";
import EbookPaymentGate from "@/components/site/EbookPaymentGate";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Buy the H.O.M.E.™ Buyers Guide — Ferguson Law",
  description: "Pay securely to unlock the full H.O.M.E.™ Buyers Guide.",
};

export default function BuyersGuidePaymentPage() {
  return (
    <>
      <Nav />
      <main style={{ background: "#0e2518", color: "#f6f2ea", display: "grid", placeItems: "center", padding: 24, minHeight: "calc(100dvh - 120px)" }}>
        <div style={{ width: "100%", maxWidth: 560, background: "#fbf8f1", color: "#102a1e", borderRadius: 24, padding: 32, boxShadow: "0 32px 80px rgba(0,0,0,.24)" }}>
          <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: ".18em", color: "#a8853e", fontWeight: 700, fontSize: ".76rem" }}>H.O.M.E.™ Buyers Guide</p>
          <h1 style={{ fontSize: "2rem", margin: "0.4rem 0 0.7rem" }}>Unlock the full guide</h1>
          <p style={{ lineHeight: 1.7, marginBottom: 20 }}>
            This page now uses the email-gated checkout flow so you receive instant access and a download link after payment.
          </p>

          <EbookPaymentGate />

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link href="/buyers-guide" style={{ color: "#0e2518", textDecoration: "none", fontWeight: 600 }}>
              Back to guide overview
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
