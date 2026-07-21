import type { Metadata } from "next";
import Link from "next/link";
import { CONSULT_DURATION_MIN } from "@/lib/site";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import { SITE } from "@/lib/site";
import { HomeBadge, HomeBadgeCSS } from "@/components/site/HomeBadge";
import EbookPaymentGate from "@/components/site/EbookPaymentGate";

export const metadata: Metadata = {
  title: "H.O.M.E.™ Buyer's Guide — Home Ownership Made Easy | Ferguson Law",
  description:
    "The complete H.O.M.E.™ Buyers Guide by Ferguson Law — everything a Jamaican home buyer needs to know, from readiness to registered title.",
};

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function BuyersGuidePage() {
  return (
    <BookingProvider>
      <Reveal />
      <Nav />

      {/* Hero */}
      <section
        id="top"
        style={{
          background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)",
          padding: "4rem 1.5rem",
          color: "var(--paper)",
        }}
      >
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "3rem", alignItems: "center" }}>
          <div>
            <span
              style={{
                display: "inline-block",
                fontSize: ".72rem",
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--gold)",
                marginBottom: "1rem",
              }}
            >
              H.O.M.E.™ by Ferguson Law · Home Ownership Made Easy™
            </span>
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(2rem,4vw,3.2rem)",
                lineHeight: 1.08,
                margin: "0 0 1rem",
                color: "#fff",
              }}
            >
              The H.O.M.E.™ Buyer's Guide
            </h1>
            <p
              style={{
                maxWidth: 480,
                margin: "0 0 2rem",
                fontSize: "1.05rem",
                lineHeight: 1.65,
                color: "rgba(246,242,234,.78)",
              }}
            >
              Everything a Jamaican home buyer needs to know — from readiness to registered
              title. Plain English. Backed by a Ferguson Law attorney.
            </p>
            <div style={{ display: "flex", gap: ".9rem", flexWrap: "wrap" }}>
              <a className="btn btn-gold" href="#get-guide">
                Get Access Now <ArrowIcon />
              </a>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/home-ebook-cover.jpg"
            alt="The H.O.M.E. Buyers Guide — Ferguson Law"
            style={{ width: 320, borderRadius: 18, boxShadow: "0 24px 60px rgba(0,0,0,.45)", flexShrink: 0 }}
            className="bg-hero-img"
          />
        </div>
      </section>

      {/* What's in the guide */}
      <section className="section" style={{ background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)", color: "var(--paper)" }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow" style={{ color: "var(--gold)" }}>What&apos;s inside</span>
            <h2 style={{ color: "#fff", overflowWrap: "break-word" }}>
              One guide. Every stage of <em>your journey.</em>
            </h2>
            <p className="lead" style={{ color: "rgba(246,242,234,.78)" }}>
              The H.O.M.E.™ Buyers Guide covers the entire home-buying process from
              first question to keys in hand — written for Jamaicans at home and abroad.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1.2rem", marginTop: "2rem" }}>
            {[
              { n: "01", t: "Know If You&apos;re Ready", d: "Assess your financial position, credit, and savings — before you start shopping." },
              { n: "02", t: "Understanding the Costs", d: "Transfer tax, stamp duty, attorney fees, valuation, survey — every figure explained." },
              { n: "03", t: "NHT &amp; Financing", d: "How to access your NHT benefits, qualify for a mortgage, and calculate your down payment." },
              { n: "04", t: "Finding Your Team", d: "Vetted real estate agents, valuators, surveyors, and lenders — the professionals you need." },
              { n: "05", t: "The Agreement for Sale", d: "What the contract means, what to watch for, and why your attorney must review it." },
              { n: "06", t: "From Contract to Title", d: "The legal steps from signed agreement to your name on a registered title." },
              { n: "07", t: "Buying from Overseas", d: "Power of attorney, source of funds, remote signing — what diaspora buyers need to know." },
              { n: "08", t: "Protecting Your Investment", d: "Fraud warning signs, due diligence, and why a Ferguson Law attorney is your strongest safeguard." },
            ].map((item) => (
              <div key={item.n} className="serv reveal" style={{ padding: "1.6rem 1.4rem", background: "rgba(255,255,255,.07)", borderColor: "rgba(255,255,255,.12)" }}>
                <div className="num">{item.n}</div>
                <h3 style={{ fontSize: "1.05rem", color: "#fff" }} dangerouslySetInnerHTML={{ __html: item.t }} />
                <p style={{ fontSize: ".95rem", color: "rgba(246,242,234,.7)" }} dangerouslySetInnerHTML={{ __html: item.d }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="get-guide"
        className="section"
        style={{ background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)", color: "var(--paper)", padding: "3rem 1.5rem" }}
      >
        <div className="wrap">
          <div className="sec-head reveal" style={{ marginBottom: "2rem" }}>
            <span style={{ display: "inline-block", fontSize: ".72rem", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gold)", marginBottom: ".8rem" }}>
              H.O.M.E.™ Buyer's Guide
            </span>
            <h2 style={{ color: "#fff", margin: "0 0 .6rem" }}>Get Your Copy Today</h2>
            <p style={{ color: "rgba(246,242,234,.72)", margin: 0, maxWidth: 460, fontSize: "1rem", lineHeight: 1.6 }}>
              Instant access to the complete home-buying guide — plain English, attorney-backed.
            </p>
          </div>
          <EbookPaymentGate />
        </div>
      </section>

      {/* CTA */}
      <section
        className="section"
        style={{ background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)", color: "var(--paper)", textAlign: "center" }}
      >
        <div className="wrap" style={{ maxWidth: 600 }}>
          <span className="eyebrow" style={{ color: "var(--gold)" }}>Ready to take the next step?</span>
          <h2 style={{ color: "#fff", margin: ".6rem 0 1rem" }}>
            Start with a free readiness check — or speak with our attorney.
          </h2>
          <p style={{ color: "rgba(246,242,234,.78)", marginBottom: "1.8rem" }}>
            The H.O.M.E.™ readiness assessment tells you exactly where you stand in 3 minutes.
            When you&apos;re ready, book a {CONSULT_DURATION_MIN}-minute consultation with our attorney.
          </p>
          <div style={{ display: "flex", gap: ".9rem", justifyContent: "center", flexWrap: "wrap" }}>
            <HomeBadge href={`${SITE.homeApp}readiness`} external dark>
              Take the readiness assessment
            </HomeBadge>
            <BookButton className="btn btn-light">
              Book a consultation
            </BookButton>
          </div>
        </div>
      </section>

      <style>{HomeBadgeCSS}</style>
      <Footer />

      <section style={{ padding: "1rem 0", background: "#f6f2e9", textAlign: "center", borderTop: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", color: "#3d463f", fontSize: ".85rem" }}>
          <small>
            H.O.M.E.™ by Ferguson Law – Home Ownership Made Easy™ · Informational only, not legal advice. © Ferguson Law. All rights reserved.
          </small>
        </div>
      </section>

      <style>{`
        @media(max-width:640px){
          [style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr !important;}
          [style*="grid-template-columns: 1fr auto"]{grid-template-columns:1fr !important;}
          .bg-hero-img{display:none !important;}
        }
      `}</style>
    </BookingProvider>
  );
}
