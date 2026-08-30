import type { Metadata } from "next";
import CostEstimatorClient from "./CostEstimatorClient";

export const metadata: Metadata = {
  title: "Cost Estimator® | Ferguson Law Jamaica",
  description:
    "Estimate your Jamaica property closing costs — transfer tax, stamp duty, attorney's fees and more. Free tool by Ferguson Law.",
};

export default function CostEstimatorPage() {
  return (
    <main style={{ paddingTop: "6rem", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 1rem 2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#c9a86a", marginBottom: 8 }}>
            Free Tool · Ferguson Law
          </p>
          <h1 style={{ margin: 0, fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 600, color: "#10211c", lineHeight: 1.2 }}>
            Cost Estimator<sup style={{ fontSize: ".55em", verticalAlign: "super" }}>®</sup>
          </h1>
          <p style={{ marginTop: 10, color: "#5c6a60", fontSize: "1rem", lineHeight: 1.65, maxWidth: 560 }}>
            See what buying or selling a property in Jamaica will actually cost you — taxes, legal fees, surveyor, valuator and more. Download your estimate as a PDF or spreadsheet.
          </p>
        </div>
      </div>
      <CostEstimatorClient />
    </main>
  );
}
