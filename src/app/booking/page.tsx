"use client";
import { useEffect } from "react";
import { BookingProvider, useBooking } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ width: 16, height: 16 }}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const PILLS = ["20-min call", "Real answers", "No obligation", "Online or in-person"];

const TESTIMONIALS = [
  { quote: "I'm in Toronto and thought buying back home would be a nightmare. Ferguson Law handled everything — I signed online and got my title without one stressful day off work.", name: "Marcus R.", role: "Diaspora buyer" },
  { quote: "The readiness score told me the truth — I wasn't ready yet. Six months later I was. No other lawyer ever made it that clear or that human.", name: "Keisha L.", role: "First-time buyer" },
  { quote: "They understood the money and the law. Closing costs, NHT, the contract — explained like a friend would, not a textbook. Keys in hand in weeks.", name: "Andre & Shanice", role: "New homeowners" },
];

function BookingContent() {
  const { openBooking } = useBooking();
  useEffect(() => { openBooking(); }, [openBooking]);

  return (
    <main style={{ background: "var(--paper)", paddingBottom: "4rem" }}>
      {/* Hero strip */}
      <section style={{ padding: "5rem 1.5rem 2.5rem", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
        <p style={{ fontFamily: "var(--serif)", fontSize: "0.78rem", letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--gold)", margin: "0 0 1rem" }}>Ferguson Law</p>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.9rem,4vw,2.7rem)", color: "var(--ink)", margin: "0 0 1rem", lineHeight: 1.1 }}>Book a Consultation</h1>
        <p style={{ color: "var(--ink-light)", lineHeight: 1.65, margin: "0 0 1.75rem" }}>
          20 minutes with our attorney — real answers for your specific situation. Pick a service and a time that works for you.
        </p>
        {/* Trust pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginBottom: "1.75rem" }}>
          {PILLS.map(p => (
            <span key={p} style={{ padding: "0.3rem 0.9rem", borderRadius: 999, border: "1px solid var(--gold)", color: "var(--gold-deep)", fontSize: "0.8rem", fontWeight: 600, background: "rgba(200,166,92,.07)" }}>
              {p}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-gold" onClick={openBooking} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Book now <ArrowIcon />
          </button>
          <a className="btn btn-light" href="/">Back to home</a>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.25rem" }}>
        <p style={{ textAlign: "center", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted,#888)", marginBottom: "1.5rem" }}>In their words</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1rem" }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: "#fff", borderRadius: 14, padding: "1.5rem", border: "1px solid rgba(18,16,12,.07)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "#b8a060", fontSize: "0.85rem", margin: 0 }}>★★★★★</p>
              <p style={{ color: "var(--ink)", lineHeight: 1.65, fontSize: "0.9rem", margin: 0, fontStyle: "italic" }}>&ldquo;{t.quote}&rdquo;</p>
              <div style={{ marginTop: "auto" }}>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: 0, color: "var(--ink)" }}>{t.name}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted,#888)", margin: 0 }}>{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function BookingPage() {
  return (
    <BookingProvider>
      <Nav />
      <BookingContent />
      <Footer />
    </BookingProvider>
  );
}
