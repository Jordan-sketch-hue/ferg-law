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
        {/* Hero */}
        <section style={{
          background: "linear-gradient(135deg, #0d2518 0%, #1a4a2e 60%, #102A1E 100%)",
          padding: "5rem 1.5rem 4rem",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Grain texture */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }} />
          {/* Glow orb */}
          <div style={{
            position: "absolute", top: "-40%", right: "-10%",
            width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,166,92,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ maxWidth: 780, margin: "0 auto", position: "relative" }}>
            <p style={{
              fontSize: ".7rem", fontWeight: 700, letterSpacing: ".18em",
              textTransform: "uppercase", color: "#C8A65C", marginBottom: 14,
            }}>
              Free Tool &middot; Ferguson Law
            </p>
            <h1 style={{
              margin: "0 0 16px",
              fontFamily: "var(--serif, Georgia, serif)",
              fontSize: "clamp(2rem,5vw,3rem)",
              fontWeight: 600, color: "#fff", lineHeight: 1.15,
            }}>
              Valuation Estimator
            </h1>
            <p style={{
              margin: 0, color: "rgba(255,255,255,0.65)", fontSize: "1.05rem",
              lineHeight: 1.7, maxWidth: 540,
            }}>
              Enter your property details for a free indicative valuation based on
              Jamaica market benchmarks. Not a formal valuation &mdash; for a certified report,
              speak with a licensed valuator.
            </p>
          </div>
        </section>

        {/* Form + Results */}
        <section style={{ background: "#f5f0e8", minHeight: "60vh", padding: "0 1rem 4rem" }}>
          <ValuationEstimatorClient />
        </section>
      </main>
      <Footer />
    </BookingProvider>
  );
}