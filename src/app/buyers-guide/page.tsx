import type { Metadata } from "next";
import { CONSULT_DURATION_MIN } from "@/lib/site";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import { SITE } from "@/lib/site";
import { HomeBadge, HomeBadgeCSS } from "@/components/site/HomeBadge";
import BuyersGuideHero from "@/components/site/BuyersGuideHero";
import { CmsText } from "@/components/cms/CmsBlock";

export const metadata: Metadata = {
  title: "H.O.M.E.\u00ae Buyer\u2019s Guide \u2014 Home Ownership Made Easy | Ferguson Law",
  description:
    "The complete H.O.M.E.\u00ae Buyers Guide by Ferguson Law \u2014 everything a Jamaican home buyer needs to know, from readiness to registered title.",
};

const GUIDE_CARDS = [
  { n: "01", t: "Know If You\u2019re Ready", d: "Assess your financial position, credit, and savings - before you start shopping." },
  { n: "02", t: "Understanding the Costs", d: "Transfer tax, stamp duty, attorney fees, valuation, survey - every figure explained." },
  { n: "03", t: "NHT & Financing", d: "How to access your NHT benefits, qualify for a mortgage, and calculate your down payment." },
  { n: "04", t: "Finding Your Team", d: "Vetted real estate agents, valuators, surveyors, and lenders - the professionals you need." },
  { n: "05", t: "The Agreement for Sale", d: "What the contract means, what to watch for, and why your attorney must review it." },
  { n: "06", t: "From Contract to Title", d: "The legal steps from signed agreement to your name on a registered title." },
  { n: "07", t: "Buying from Overseas", d: "Power of attorney, source of funds, remote signing - what diaspora buyers need to know." },
  { n: "08", t: "Protecting Your Investment", d: "Fraud warning signs, due diligence, and why a Ferguson Law attorney is your strongest safeguard." },
];

export default function BuyersGuidePage() {
  return (
    <BookingProvider>
      <Reveal />
      <Nav />

      {/* Hero: ebook cover image + lead-capture form side by side */}
      <BuyersGuideHero />

      {/* What's in the guide */}
      <section className="section" style={{ background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)", color: "var(--paper)" }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow" style={{ color: "var(--gold)" }}>
              <CmsText page="buyers-guide" block="cards_eyebrow" fallback="What\u2019s inside" />
            </span>
            <h2 style={{ color: "#fff", overflowWrap: "break-word" }}>
              <CmsText page="buyers-guide" block="cards_h2" fallback="One guide. Every stage of your journey." />
            </h2>
            <p className="lead" style={{ color: "rgba(246,242,234,.78)" }}>
              <CmsText page="buyers-guide" block="cards_lede" fallback="The H.O.M.E.\u00ae Buyers Guide covers the entire home-buying process from first question to keys in hand - written for Jamaicans at home and abroad." />
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1.2rem", marginTop: "2rem" }}>
            {GUIDE_CARDS.map((item) => (
              <div key={item.n} className="serv reveal" style={{ padding: "1.6rem 1.4rem", background: "rgba(255,255,255,.07)", borderColor: "rgba(255,255,255,.12)" }}>
                <div className="num">{item.n}</div>
                <h3 style={{ fontSize: "1.05rem", color: "#fff" }}>
                  <CmsText page="buyers-guide" block={`card_${item.n}_title`} fallback={item.t} />
                </h3>
                <p style={{ fontSize: ".95rem", color: "rgba(246,242,234,.7)" }}>
                  <CmsText page="buyers-guide" block={`card_${item.n}_desc`} fallback={item.d} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Readiness CTA */}
      <section className="section" style={{ background: "#f6f2ea", textAlign: "center" }}>
        <div className="wrap" style={{ maxWidth: 600 }}>
          <span className="eyebrow">
            <CmsText page="buyers-guide" block="readiness_eyebrow" fallback="Ready to take the next step?" />
          </span>
          <h2 style={{ margin: ".6rem 0 1rem" }}>
            <CmsText page="buyers-guide" block="readiness_h2" fallback="Start with a free readiness check \u2014 or speak with our attorney." />
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: "1.8rem" }}>
            <CmsText page="buyers-guide" block="readiness_lede" fallback={`The H.O.M.E.\u00ae readiness assessment tells you exactly where you stand in 3 minutes. When you\u2019re ready, book a ${CONSULT_DURATION_MIN}-minute consultation with our attorney.`} />
          </p>
          <div style={{ display: "flex", gap: ".9rem", justifyContent: "center", flexWrap: "wrap" }}>
            <HomeBadge href={`${SITE.homeApp}readiness`} external>
              Take the readiness assessment
            </HomeBadge>
            <BookButton className="btn btn-gold">
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
            H.O.M.E.\u00ae by Ferguson Law - Home Ownership Made Easy\u00ae \u00b7 Informational only, not legal advice.<br />
            \u00a9 Ferguson Law. All rights reserved.
          </small>
        </div>
      </section>
    </BookingProvider>
  );
}