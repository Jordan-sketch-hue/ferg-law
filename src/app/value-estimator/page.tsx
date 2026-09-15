import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import ValuationEstimatorClient from "./ValuationEstimatorClient";

export const metadata: Metadata = {
  title: "Property Value Estimator | Ferguson Law Jamaica",
  description:
    "Get a free indicative valuation of your Jamaica property. Enter your parish, property type and size for an instant estimate based on market benchmarks.",
};

export default function ValuationEstimatorPage() {
  return (
    <BookingProvider>
      <Nav />
      <main style={{ paddingTop: "6rem", paddingBottom: "4rem" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 1rem 2rem" }}>
          <p style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#c9a86a", marginBottom: 8 }}>
            Free Tool · Ferguson Law
          </p>
          <h1 style={{ margin: 0, fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 600, color: "#10211c", lineHeight: 1.2 }}>
            Property Value Estimator
          </h1>
          <p style={{ marginTop: 10, color: "#5c6a60", fontSize: "1rem", lineHeight: 1.65, maxWidth: 560 }}>
            Enter your property details for a free indicative valuation based on Jamaica market benchmarks.
            This is not a formal valuation — for a certified report, speak with a licensed valuator.
          </p>
        </div>
        <ValuationEstimatorClient />
      </main>
      <Footer />
    </BookingProvider>
  );
}
