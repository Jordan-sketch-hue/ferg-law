import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Get the H.O.M.E.® Buyer's Guide | Ferguson Law",
  description:
    "The complete Ferguson Law H.O.M.E.® Buyer's Guide — every step from readiness to registered title. NHT, stamp duty, transfer tax, diaspora playbook and more. Free download.",
  openGraph: {
    title: "Get the H.O.M.E.® Buyer's Guide | Ferguson Law",
    description:
      "The complete Ferguson Law H.O.M.E.® Buyer's Guide — every step from readiness to registered title. Free download.",
    url: "https://fergusonlawja.com/ebook",
    siteName: "Ferguson Law",
    images: [
      {
        url: "https://fergusonlawja.com/home-buyers-guide-cover.jpg",
        width: 800,
        height: 1000,
        alt: "H.O.M.E. Buyer's Guide — Ferguson Law",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Get the H.O.M.E.® Buyer's Guide | Ferguson Law",
    description:
      "The complete Ferguson Law H.O.M.E.® Buyer's Guide — every step from readiness to registered title. Free download.",
    images: ["https://fergusonlawja.com/home-buyers-guide-cover.jpg"],
  },
  alternates: { canonical: "https://fergusonlawja.com/ebook" },
};

export default function EbookLayout({ children }: { children: ReactNode }) {
  return children;
}
