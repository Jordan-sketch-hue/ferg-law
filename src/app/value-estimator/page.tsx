import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import ValuationEstimatorClient from "./ValuationEstimatorClient";
import { CmsText } from "@/components/cms/CmsBlock";

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
          background: "linear-gradient(135deg,#0a1a10 0%,#0e2518 50%,#1a3828 100%)",
          padding: "5.5rem 1rem 4rem",
          borderBottom: "1px solid rgba(201,168,106,.12)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div aria-hidden style={{
            position: "absolute", inset: 0, opacity: 0.07,
            backgroundImage: "linear-gradient(rgba(201,168,106,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,106,.4) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div style={{ maxWidth: 700, margin: "0 auto", position: "relative" }}>
            <p style={{ margin: "0 0 14px", fontSize: ".7rem", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#c9a86a" }}>
              <CmsText page="value-estimator" block="hero_eyebrow" fallback="Free Tool · Ferguson Law" />
            </p>
            <h1 style={{ margin: 0, fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 600, color: "#fff", lineHeight: 1.12, letterSpacing: "-.01em" }}>
              <CmsText page="value-estimator" block="hero_h1" fallback="Valuation Estimator" />
            </h1>
            <p style={{ marginTop: 14, color: "rgba(246,242,234,.72)", fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 520, marginBottom: 0 }}>
              <CmsText page="value-estimator" block="hero_lede" fallback="Get a free indicative market value for any property in Jamaica. Enter your parish, size and property type for an instant JMD & USD estimate." />
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(201,168,106,.12)", border: "1px solid rgba(201,168,106,.25)", fontSize: ".78rem", fontWeight: 600, color: "#c9a86a" }}>
                <CmsText page="value-estimator" block="badge_parishes" fallback="All 14 Parishes" />
              </span>
              <span style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(201,168,106,.12)", border: "1px solid rgba(201,168,106,.25)", fontSize: ".78rem", fontWeight: 600, color: "#c9a86a" }}>
                <CmsText page="value-estimator" block="badge_market_data" fallback="Live market data" />
              </span>
              <span style={{ padding: "5px 14px", borderRadius: 20, background: "rgba(201,168,106,.12)", border: "1px solid rgba(201,168,106,.25)", fontSize: ".78rem", fontWeight: 600, color: "#c9a86a" }}>
                <CmsText page="value-estimator" block="badge_currency" fallback="JMD & USD" />
              </span>
            </div>
          </div>
        </section>
        {/* Tool */}
        <section style={{ background: "#f9f7f4", paddingTop: "2.5rem", paddingBottom: "5rem" }}>
          <ValuationEstimatorClient />
        </section>
      </main>
      <Footer />
    </BookingProvider>
  );
}