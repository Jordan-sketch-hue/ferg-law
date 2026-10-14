import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Property Valuation Estimator | Ferguson Law Jamaica",
  description: "Our property valuation estimator is coming soon.",
};

export default function ValuationEstimatorPage() {
  return (
    <BookingProvider>
      <Nav />
      <main>
        <section style={{
          background: "linear-gradient(135deg,#0a1a10 0%,#0e2518 50%,#1a3828 100%)",
          padding: "7rem 1rem 7rem",
          textAlign: "center",
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <p style={{ margin: "0 0 14px", fontSize: ".7rem", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#c9a86a" }}>
              Ferguson Law Jamaica
            </p>
            <h1 style={{ margin: "0 0 18px", fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 600, color: "#fff", lineHeight: 1.15 }}>
              Coming Soon
            </h1>
            <p style={{ color: "rgba(246,242,234,.72)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 28 }}>
              Our Property Valuation Estimator is currently being refined. Check back shortly.
            </p>
            <a href="/" style={{ display: "inline-block", padding: "13px 30px", background: "#c9a86a", color: "#10211c", fontWeight: 700, borderRadius: 10, textDecoration: "none", fontSize: ".95rem" }}>
              Back to Home
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </BookingProvider>
  );
}