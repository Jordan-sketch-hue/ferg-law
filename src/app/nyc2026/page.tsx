import type { Metadata } from "next";
import NYC2026Client from "./NYC2026Client";

export const metadata: Metadata = {
  title: "From Deed to Key · NYC 2026 | Ferguson Law",
  description:
    "Jamaica real estate made simple for the Diaspora. Take the Property Readiness Check, estimate your transaction costs, and book a consultation with Ferguson Law.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "From Deed to Key | Ferguson Law",
    description: "Own a piece of Jamaica. Expert conveyancing for Diaspora buyers.",
    images: ["/nyc/from-deed-to-key.webp"],
  },
};

export default function NYC2026Page() {
  return <NYC2026Client />;
}