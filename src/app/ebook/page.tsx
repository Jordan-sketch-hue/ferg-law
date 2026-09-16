"use client";

import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { BookingProvider } from "@/components/site/BookingProvider";
import { track } from "@/lib/analytics";

const PDF_URL = "https://home.fergusonlawja.com/HOME-Guide-Ferguson-Law.pdf";

export default function EbookPage() {
  return (
    <BookingProvider>
      <Nav />
      <style>{`
        .ebook-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }
        .ebook-left { color: #fff; }
        .ebook-cover { display: block; }
        @media (max-width: 768px) {
          .ebook-grid { grid-template-columns: 1fr; gap: 2rem; padding: 0 1rem; }
          .ebook-cover { max-width: 280px !important; margin: 0 auto !important; }
        }
      `}</style>
      <main style={{ background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)", minHeight: "100vh", paddingTop: "5rem", paddingBottom: "4rem" }}>
        <div className="ebook-grid">

          {/* Left — cover + blurb */}
          <div className="ebook-left">
            <p style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#c9a86a", marginBottom: "1rem" }}>
              Download · Ferguson Law
            </p>
            <h1 style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 600, lineHeight: 1.15, marginBottom: "1.2rem", color: "#fff" }}>
              The Ferguson Law H.O.M.E.® Buyer&apos;s Guide
            </h1>
            <p style={{ color: "rgba(255,255,255,.75)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem", maxWidth: 420 }}>
              Every step from readiness to registered title — plain English, no jargon. NHT, stamp duty, transfer tax, diaspora playbook and more.
            </p>
            <img
              src="/home-buyers-guide-cover.jpg"
              alt="H.O.M.E. Buyer's Guide cover"
              className="ebook-cover"
              style={{ width: "100%", maxWidth: 400, borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,.45)" }}
            />
          </div>

          {/* Right — direct download */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "2.5rem 2rem", boxShadow: "0 24px 64px rgba(0,0,0,.25)", textAlign: "center" }}>
            <svg style={{ width: 52, height: 52, color: "#c9a86a", margin: "0 auto 1.2rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
            <h2 style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.6rem", color: "#10211c", marginBottom: ".5rem" }}>
              H.O.M.E.® Buyer&apos;s Guide
            </h2>
            <p style={{ color: "#69736d", fontSize: ".9rem", marginBottom: "1.8rem", lineHeight: 1.6 }}>
              The complete guide — every step from readiness to closing. No sign-up required.
            </p>
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("pdf_download")}
              style={{ display: "inline-block", width: "100%", padding: "15px 0", background: "#c9a86a", color: "#10211c", fontWeight: 700, fontSize: "1rem", borderRadius: 10, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}
            >
              Download Guide (PDF)
            </a>
            <p style={{ marginTop: "1.2rem", fontSize: ".78rem", color: "#aaa" }}>
              Opens in a new tab. No sign-up required.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </BookingProvider>
  );
}
