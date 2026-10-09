import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Valuation Estimator | Ferguson Law Jamaica",
  description: "The Valuation Estimator is temporarily unavailable. Please contact Ferguson Law for a property valuation.",
};

export default function ValuationEstimatorPage() {
  return (
    <BookingProvider>
      <Nav />
      <main>
        <section style={{
          background: "linear-gradient(135deg,#0a1a10 0%,#0e2518 50%,#1a3828 100%)",
          padding: "7rem 1rem 8rem",
          textAlign: "center",
        }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <p style={{ margin: "0 0 16px", fontSize: ".7rem", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#c9a86a" }}>
              Ferguson Law Jamaica
            </p>
            <h1 style={{ margin: "0 0 20px", fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 600, color: "#fff", lineHeight: 1.15 }}>
              Valuation Estimator
            </h1>
            <p style={{ color: "rgba(246,242,234,.72)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 32 }}>
              This tool is temporarily unavailable while we improve its accuracy. Please contact us directly for a property valuation.
            </p>
            <a href="/#contact" style={{
              display: "inline-block", padding: "13px 32px", background: "#c9a86a", color: "#0a1a10",
              fontWeight: 700, fontSize: ".92rem", borderRadius: 4, textDecoration: "none", letterSpacing: ".02em",
            }}>
              Contact Us
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </BookingProvider>
  );
}