import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import ValuationEstimatorClient from "./ValuationEstimatorClient";

export const metadata: Metadata = {
  title: "Property Valuation Estimator | Ferguson Law Jamaica",
  description: "Get an indicative property valuation estimate for Jamaica real estate — land, house, apartment or commercial. Based on current market data.",
};

export default function ValuationEstimatorPage() {
  return (
    <BookingProvider>
      <Nav />
      <main>
        <section style={{
          background: "linear-gradient(135deg,#0a1a10 0%,#0e2518 50%,#1a3828 100%)",
          padding: "5rem 1rem 4rem",
          textAlign: "center",
        }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <p style={{ margin: "0 0 12px", fontSize: ".7rem", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#c9a86a" }}>
              Ferguson Law Jamaica
            </p>
            <h1 style={{ margin: "0 0 16px", fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 600, color: "#fff", lineHeight: 1.15 }}>
              Property Valuation Estimator
            </h1>
            <p style={{ color: "rgba(246,242,234,.72)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 0 }}>
              Get an indicative market value estimate for Jamaica real estate based on current listing data.
            </p>
          </div>
        </section>

        <section style={{ background: "#f5f0e8", padding: "3rem 1rem 5rem" }}>
          <ValuationEstimatorClient />
        </section>
      </main>
      <Footer />
    </BookingProvider>
  );
}
