import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/site/Footer";
import Nav from "@/components/site/Nav";

export const metadata: Metadata = {
  title: "H.O.M.E.™ Buyers Guide preview — Ferguson Law",
  description: "Preview the H.O.M.E.™ Buyers Guide before unlocking the full paid guide.",
};

export default function BuyersGuidePreviewPage() {
  return (
    <>
      <Nav />
      <main style={{ background: "#f6f2ea", color: "#102a1e", padding: 24 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", background: "#fff", borderRadius: 24, padding: 32, boxShadow: "0 24px 70px rgba(0,0,0,.08)" }}>
          <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: ".18em", color: "#a8853e", fontWeight: 700, fontSize: ".76rem" }}>Preview</p>
          <h1 style={{ fontSize: "2rem", margin: "0.4rem 0 0.7rem" }}>H.O.M.E.™ Buyers Guide overview</h1>
          <p style={{ lineHeight: 1.7 }}>
            This preview gives you a quick look at the guide&apos;s structure. The complete version is available after a one-time payment of US$20 / J$3,000.
          </p>
          <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
            {[
              "Know if you’re ready",
              "Understand the costs",
              "Navigate NHT and mortgage financing",
              "Choose your legal and real estate team",
              "Review the agreement for sale",
              "Close from contract to title",
            ].map((item) => (
              <div key={item} style={{ border: "1px solid #e7ddcc", borderRadius: 14, padding: "14px 16px", background: "#fcfaf6" }}>{item}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <Link href="/buyers-guide/payment" style={{ background: "#c8a65c", color: "#102a1e", borderRadius: 999, padding: "12px 16px", fontWeight: 700, textDecoration: "none" }}>
              Unlock full guide
            </Link>
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
