import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import ValuationEstimatorClient from "./ValuationEstimatorClient";

export const metadata: Metadata = {
  title: "Valuation Estimator | Ferguson Law Jamaica",
  description:
    "Get a free indicative valuation of your Jamaica property. Enter your parish, property type and size for an instant estimate based on mid-2026 market benchmarks.",
};

export default function ValuationEstimatorPage() {
  return (
    <BookingProvider>
      <Nav />
      <main>
        {/* Dark hero */}
        <section
          style={{
            background: "linear-gradient(135deg, #0d2518 0%, #1a4a2e 60%, #102A1E 100%)",
            padding: "6rem 1.5rem 4.5rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Radial glow accent */}
          <div
            style={{
              position: "absolute", top: "-30%", right: "-5%",
              width: 500, height: 500, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(200,166,92,0.1) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ maxWidth: 780, margin: "0 auto", position: "relative" }}>
            <p
              style={{
                fontSize: ".7rem", fontWeight: 700, letterSpacing: ".18em",
                textTransform: "uppercase", color: "#C8A65C", marginBottom: 14,
              }}
            >
              Free Tool · Ferguson Law
            </p>
            <h1
              style={{
                margin: "0 0 16px",
                fontFamily: "var(--serif, Georgia, serif)",
                fontSize: "clamp(2rem,5vw,3rem)",
                fontWeight: 600, color: "#fff", lineHeight: 1.15,
              }}
            >
              Valuation Estimator
            </h1>
            <p
              style={{
                margin: 0, color: "rgba(255,255,255,0.65)",
                fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 540,
              }}
            >
              Enter your property details for a free indicative valuation based on Jamaica market benchmarks. Not a formal valuation — for a certified report, speak with a licensed valuator.
            </p>
          </div>
        </section>

        {/* Form section */}
        <section style={{ background: "#f5f0e8", minHeight: "60vh", padding: "0 1rem 4rem" }}>
          <ValuationEstimatorClient />
        </section>
      </main>
      <Footer />
    </BookingProvider>
  );
}