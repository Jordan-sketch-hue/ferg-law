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
        <section style={{ background: "#f5f0e8", minHeight: "70vh", padding: "2rem 1rem 4rem" }}>
          <ValuationEstimatorClient />
        </section>
      </main>
      <Footer />
    </BookingProvider>
  );
}