"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookingProvider, useBooking } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { SITE, waLink, CONSULT_FEE_DISPLAY, CONSULT_DURATION_MIN } from "@/lib/site";

const GREEN = "#102A1E";
const GOLD = "#C8A65C";
const CREAM = "#fbf8f1";
const MUTED = "#5c645e";
const LINE = "rgba(16,42,30,.12)";

type Moment = { headline: string; body: string; cta?: { label: string; href: string } };
type Role = { id: string; label: string; tagline: string; moments: Moment[]; explainer?: string };

const ROLES: Role[] = [
  {
    id: "buyer",
    label: "Buyer",
    tagline: "You found a property you love. Here's exactly what happens next.",
    explainer: "/explainers/buyer",
    moments: [
      {
        headline: "You reach out. We talk.",
        body: "A 20-minute call with our Attorney. By the time it ends you know the full costs of purchase, all the steps in the process and what to watch for before you sign a single page. Consultation fee: $8,000 (credited towards your total legal fees once you engage Ferguson Law).",
      },
      {
        headline: "We need to know who you are.",
        body: "A secure link arrives in your inbox. Your government ID, TRN, proof of address, a brief declaration that the funds are clean. Ten minutes, from wherever you are. Once it clears, we can move.",
      },
      {
        headline: "We go to the National Land Agency.",
        body: "Before you spend a cent, we search the title. We're checking who actually owns this property â€” and what's sitting on it. Caveats, liens, undisclosed mortgages, outstanding property tax. If something's off, you hear about it before it costs you.",
      },
      {
        headline: "The contract lands on our desk.",
        body: "The seller's lawyer sends the Agreement for Sale. We read every line. Risky clauses get flagged, completion dates get fixed, your deposit goes into a secure client account â€” not the vendor's hands. We don't sign off until it protects you.",
      },
      {
        headline: "Financing falls into place.",
        body: "NHT benefit, bank mortgage, or cash â€” we coordinate with everyone. We tell each party exactly what they need. We track the conditions. You focus on the move.",
      },
      {
        headline: "The Closing process.",
        body: "This stage unfolds over days, not a single afternoon. Transfer tax is paid, documents are lodged with the NLA, every figure is accounted for â€” and then the keys change hands.",
      },
      {
        headline: "Your title arrives.",
        body: "A Duplicate Certificate of Title with your name on it â€” registered, clean, yours. The transaction is done. The property is protected.",
      },
    ],
  },
  {
    id: "seller",
    label: "Seller",
    tagline: "Someone wants to buy your property. Before you agree to anything â€” read this.",
    explainer: "/explainers/seller",
    moments: [
      {
        headline: "Before you accept an offer, we talk.",
        body: "A 20-minute Consultation call before anything is signed. You'll know exactly what your net proceeds will be, an estimate of the time, and what protects you throughout the process. Consultation fee: $8,000 (credited towards your total legal fees once you engage Ferguson Law).",
      },
      {
        headline: "We confirm your identity.",
        body: "Jamaican law requires it. Your ID, TRN, and proof of address â€” submitted securely before any documents are exchanged. We handle this before the agreement is signed. You're clear before you commit.",
      },
      {
        headline: "The agreement is drafted in your favour.",
        body: "We prepare or review the Agreement for Sale. Completion dates that are real. Clear terms for what happens if the buyer defaults. Protection on your deposit. You know what you're agreeing to.",
      },
      {
        headline: "Your existing mortgage gets discharged.",
        body: "If there's a mortgage on the property, we coordinate with your lender to get the discharge ready before closing. No last-minute delays on your end.",
      },
      {
        headline: "Transfer tax is handled.",
        body: "We calculate what's owed on the agreed price. Revenue stamps, compliance certificate, all NLA filings â€” taken care of. You receive a clear breakdown of every fee before anything moves.",
      },
      {
        headline: "Proceeds hit your account.",
        body: "Once title transfer is confirmed and every condition is met, the sale proceeds are released to you. No surprises. No missing documents holding things up.",
      },
    ],
  },
  {
    id: "professional",
    label: "Professional",
    tagline: "You serve buyers, sellers, or lenders in the Jamaican property market. Here's how you fit into the H.O.M.E.â„¢ platform.",
    moments: [
      {
        headline: "You create a profile on H.O.M.E.â„¢",
        body: "The joint platform operated by Ferguson Law. Your services, your coverage area, your credentials â€” listed clearly for the clients who need you.",
        cta: { label: "Go to H.O.M.E.â„¢", href: `${SITE.homeApp}onboarding?role=agent` },
      },
      {
        headline: "Ferguson Law verifies you.",
        body: "Your professional license and registration are confirmed before your profile goes live. Clients see a verified badge. Your reputation stays protected.",
      },
      {
        headline: "Qualified clients come to you (where applicable).",
        body: "When a buyer, seller, or lender on the platform reaches a stage that requires your services, they're matched to you based on role, location, and stage. No cold leads. They're already in the process.",
      },
      {
        headline: "You coordinate through one system.",
        body: "Client milestones, document requests, and updates are tracked in a shared space. Ferguson Law manages the legal anchor. You deliver your speciality. Nothing drops.",
      },
      {
        headline: "Transactions close with confidence.",
        body: "With full legal coverage and a complete professional team, clients move from first enquiry to registered title â€” and you're the professional who helped make it happen.",
      },
    ],
  },
  {
    id: "divorcing",
    label: "Divorcing",
    tagline: "You've made a difficult decision. Here's how Ferguson Law carries the legal weight from here.",
    moments: [
      {
        headline: "You talk to our Attorney first. (it won't necessarily be me)",
        body: "A 20-minute Consultation call. No judgment, just clarity on the steps in the process, how long it takes and what your rights are. Consultation fee: $8,000 (credited towards your full Legal fee when you engage Ferguson Law).",
      },
      {
        headline: "Your identity and marriage go on record.",
        body: "We gather your marriage certificate, TRN, proof of address, and any relevant financial documents. Everything needed to file correctly from the start.",
      },
      {
        headline: "The petition is filed.",
        body: "We prepare and file the divorce petition in the Supreme Court of Jamaica. Grounds, timelines, and next steps are explained at every stage â€” you're never left wondering where things stand.",
      },
      {
        headline: "Financial matters are settled.",
        body: "Maintenance, property division, and any joint assets are documented and agreed. If there are children involved, custody and support arrangements are formalised with their interests at the centre.",
      },
      {
        headline: "The Decree Nisi is granted.",
        body: "The court makes the conditional order. You're in the final stretch. Ferguson Law handles every remaining filing and court appearance.",
      },
      {
        headline: "The Decree Absolute is issued.",
        body: "The marriage is legally dissolved. Every order is in writing. You leave with a clear record of what's been agreed â€” and the certainty to move forward.",
      },
    ],
  },
  {
    id: "estate",
    label: "Estate & Wills",
    tagline: "You want to protect what you've built. Here's how Ferguson Law makes sure it goes exactly where you intend.",
    moments: [
      {
        headline: "You tell us what you have and who gets it.",
        body: "A 20-minute Consultation call. We map your assets, property, accounts, business interests and the people you want to provide for. We help you to fulfill your loved ones wishes and distribute their assets as they intended. Consultation fee: $8,000 (credited to your full Legal fee when you engage Ferguson Law).",
      },
      {
        headline: "Your Will is drafted.",
        body: "Every instruction is captured precisely: who receives what, under what conditions, and who you trust to carry it out. We flag anything that could create a dispute or delay â€” and fix it before it's signed.",
      },
      {
        headline: "It's executed properly.",
        body: "A Will that isn't correctly signed and witnessed is invalid under Jamaican law. We manage the execution â€” witnesses, formalities, everything â€” so there's no question about its validity.",
      },
      {
        headline: "Safekeeping is arranged.",
        body: "Your original Will is stored securely. Your executor knows where to find it and what to do. If your circumstances change, we update it.",
      },
      {
        headline: "When the time comes â€” Probate.",
        body: "Ferguson Law applies to the Supreme Court to administer the estate. Assets are identified, debts settled, and everything distributed according to your instructions. Your family doesn't have to figure it out alone.",
      },
    ],
  },
  {
    id: "business",
    label: "Business Owner",
    tagline: "You're building something. Here's the legal foundation that protects it at every stage.",
    moments: [
      {
        headline: "Your company is properly formed.",
        body: "A 20-minute Consultation call with our Attorney to understand your structure - sole trader, limited liability company, or partnership. We draft your foundational documents, register with the Companies Office of Jamaica and keep you operating on solid ground. Consultation fee: $8,000 (credited to your Legal fee when you engage Ferguson Law).",
      },
      {
        headline: "Your contracts say what you mean.",
        body: "Service agreements, supplier terms, employment contracts, shareholder agreements â€” reviewed or drafted so they protect you, not just the other side. Plain language, Jamaican law, no ambiguity.",
      },
      {
        headline: "You stay compliant.",
        body: "Annual returns, regulatory filings, changes to directors or share structure â€” Ferguson Law keeps your company in good standing so you can focus on running it.",
      },
      {
        headline: "Commercial deals are handled.",
        body: "Joint ventures, acquisitions, leases, licensing arrangements â€” we review every material agreement before you sign. Nothing moves until the terms are right for you.",
      },
      {
        headline: "You have counsel when it matters.",
        body: "Disputes, demand letters, regulatory queries â€” you're not handling them alone. Ferguson Law is your legal anchor for as long as you're in business.",
      },
    ],
  },
  {
    id: "athlete",
    label: "Athlete / Creator",
    tagline: "Your talent is your asset. Here's how Ferguson Law makes sure it earns â€” and stays protected.",
    moments: [
      {
        headline: "We understand what you're building.",
        body: "A 20-minute Consultation call. Whether you're a professional athlete, a recording artiste, a content creator or brand we identify where you're exposed and where you're leaving money on the table. Consultation fee $8,000 (credited towards your full Legal fee when you engage Ferguson Law).",
      },
      {
        headline: "Your contracts are read before you sign.",
        body: "Representation agreements, sponsorship deals, performance contracts, record deals â€” we go line by line. Unfair clauses get flagged. Royalty splits, image rights, exclusivity windows, and termination terms are negotiated in your favour.",
      },
      {
        headline: "Your intellectual property is registered.",
        body: "Your name, likeness, brand, and creative work are assets. Trademarks, copyright, and licensing frameworks are put in place so others can't profit from what you built.",
      },
      {
        headline: "Endorsement and image rights are locked down.",
        body: "Who can use your name, your face, your performance â€” and under what terms and for how long. Ferguson Law drafts and negotiates the agreements that govern it.",
      },
      {
        headline: "You have legal cover going forward.",
        body: "Career transitions, new deals, disputes with clubs, labels, or brands â€” you have counsel who understands the industry and the law. Nothing gets signed without us seeing it first.",
      },
    ],
  },
];

function GetStartedContent() {
  const [roleId, setRoleId] = useState("buyer");
  const { openBooking } = useBooking();

  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];

  // Read ?role= from URL on mount (avoids useSearchParams + Suspense requirement)
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("role") ?? "";
    if (ROLES.find((x) => x.id === r)) setRoleId(r);
  }, []);

  function switchRole(id: string) {
    setRoleId(id);
    window.history.replaceState(null, "", `/get-started?role=${id}`);
  }

  return (
    <main>
      {/* Hero */}
      <section style={S.hero}>
        <div style={S.heroInner}>
          <span style={S.eyebrow}>Ferguson Law &nbsp;&middot;&nbsp; Client Journey</span>
          <h1 style={S.h1}>How can we help you?</h1>
          <p style={S.heroSub}>
            Whether you&apos;re buying, selling, or working as a property professional â€” here&apos;s exactly what working with Ferguson Law looks like, from the first call to the finish line.
          </p>
          <div style={S.tabs}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => switchRole(r.id)}
                style={{ ...S.tab, ...(r.id === roleId ? S.tabActive : {}) }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section style={S.journeySection}>
        <div style={S.journeyInner}>
          <p style={S.tagline}>{role.tagline}</p>

          <div style={S.moments}>
            {role.moments.map((m, i) => (
              <div key={i} style={S.momentRow}>
                <div style={S.momentLeft}>
                  <div style={S.momentDot} />
                  {i < role.moments.length - 1 && <div style={S.connector} />}
                </div>
                <div style={S.momentCard}>
                  <span style={S.momentNum}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 style={S.momentHeadline}>{m.headline}</h3>
                  <p style={S.momentBody}>{m.body}</p>
                  {m.cta && (
                    <a href={m.cta.href} target="_blank" rel="noopener" style={S.momentCta}>
                      {m.cta.label} &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA â€” Client Portal is the main feature; consultation available, not the headline */}
      <section style={S.ctaBand}>
        <div style={S.ctaInner}>
          <div>
            <h2 style={S.ctaH2}>Ready when you are.</h2>
            <p style={S.ctaSub}>
              {role.id === "professional"
                ? "Your partner dashboard is where your listings, referrals and verification live. Log in to get started."
                : `Your client journey lives in the Ferguson Law Client Portal â€” log in 24/7 and see exactly what stage your matter is at. Prefer to talk first? A ${CONSULT_DURATION_MIN}-minute consultation with Owen Ferguson is ${CONSULT_FEE_DISPLAY}, credited toward your legal fees once you engage us.`}
            </p>
          </div>
          <div style={S.ctaBtns}>
            {role.id === "professional" ? (
              <Link href="/directory/login" style={S.goldLink}>
                Partner login
              </Link>
            ) : (
              <Link href="/directory/client-login" style={S.goldLink}>
                Client portal
              </Link>
            )}
            <button onClick={openBooking} style={S.ghostBtn}>Book a Consultation</button>
            <a
              href={waLink("Hi Ferguson Law â€” I'd like to learn more about working with you.")}
              target="_blank"
              rel="noopener"
              style={S.ghostBtn}
            >
              WhatsApp us
            </a>
          </div>
        </div>
      </section>

      {/* Explainer â€” deliberately AFTER the portal CTA (no diversions before it) */}
      {role.explainer && (
        <section style={{ background: CREAM, padding: "0 24px" }}>
          <div style={{ ...S.explainerStrip, maxWidth: 880, margin: "0 auto", borderTop: "none", padding: "22px 0 26px" }}>
            <span style={{ color: MUTED, fontSize: ".88rem" }}>Want the full legal picture?</span>
            <Link href={role.explainer} style={S.explainerLink}>
              Explainer &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* Pillars */}
      <section style={S.pillarsSection}>
        <div style={S.pillarsInner}>
          <p style={S.pillarsEyebrow}>Counsel &middot; Compliance &middot; Care</p>
          <div style={S.pillars}>
            {[
              {
                t: "Every seller has a lawyer.",
                d: "Every developer has lawyers. Every bank has lawyers. When you work with Ferguson Law, so do you.",
              },
              {
                t: "Nothing hidden at closing.",
                d: "Transfer tax, stamp duty, legal fees, AML requirements â€” you know what's coming before anything moves.",
              },
              {
                t: "You're not chasing updates.",
                d: "The Ferguson Law CLIENT PORTAL tracks every milestone. Log in 24/7 and see exactly what stage your matter is at. When something moves, you know. When we need something from you, you hear about it.",
              },
            ].map((p) => (
              <div key={p.t} style={S.pillar}>
                <h3 style={S.pillarT}>{p.t}</h3>
                <p style={S.pillarD}>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={S.contactStrip}>
        <span style={{ color: MUTED, fontSize: ".82rem" }}>
          {SITE.city} &nbsp;&middot;&nbsp; {SITE.whatsappDisplay} &nbsp;&middot;&nbsp; {SITE.email}
        </span>
      </div>
    </main>
  );
}

export default function GetStartedPage() {
  return (
    <BookingProvider>
      <Nav />
      <GetStartedContent />
      <Footer />
    </BookingProvider>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { background: GREEN, padding: "80px 24px 56px" },
  heroInner: { maxWidth: 680, margin: "0 auto", textAlign: "center" },
  eyebrow: {
    display: "block", fontSize: ".72rem", fontWeight: 700,
    letterSpacing: ".14em", textTransform: "uppercase", color: GOLD, marginBottom: 18,
  },
  h1: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "clamp(2rem, 5vw, 3rem)", color: CREAM,
    margin: "0 0 16px", lineHeight: 1.15,
  },
  heroSub: {
    color: "rgba(251,248,241,.68)", fontSize: ".97rem", lineHeight: 1.75,
    margin: "0 auto 36px", maxWidth: 520,
  },
  tabs: {
    display: "flex", flexWrap: "wrap", justifyContent: "center",
    background: "rgba(255,255,255,.08)",
    borderRadius: 16, padding: 4, gap: 4, maxWidth: 640,
  },
  tab: {
    padding: "10px 20px", borderRadius: 12, border: "none",
    background: "transparent", color: "rgba(251,248,241,.6)",
    fontWeight: 600, fontSize: ".85rem", cursor: "pointer", transition: "all .18s",
    whiteSpace: "nowrap",
  },
  tabActive: { background: GOLD, color: GREEN },

  journeySection: { background: CREAM, padding: "64px 24px" },
  journeyInner: { maxWidth: 680, margin: "0 auto" },
  tagline: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "1.18rem", color: GREEN, lineHeight: 1.55,
    margin: "0 0 48px", fontStyle: "italic",
  },

  moments: { display: "flex", flexDirection: "column" },
  momentRow: { display: "flex", gap: 24 },
  momentLeft: {
    display: "flex", flexDirection: "column", alignItems: "center",
    flexShrink: 0, width: 18,
  },
  momentDot: {
    width: 10, height: 10, borderRadius: "50%",
    background: GOLD, flexShrink: 0, marginTop: 6,
  },
  connector: {
    width: 1, flex: 1, minHeight: 24,
    background: `${GOLD}55`, margin: "6px 0",
  },
  momentCard: { paddingBottom: 40, flex: 1 },
  momentNum: {
    display: "block", fontSize: ".7rem", fontWeight: 800,
    letterSpacing: ".1em", color: `${GOLD}99`, marginBottom: 4,
  },
  momentHeadline: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "1.12rem", color: GREEN, margin: "0 0 8px", fontWeight: 700,
  },
  momentBody: { color: MUTED, fontSize: ".92rem", lineHeight: 1.75, margin: 0 },
  momentCta: {
    display: "inline-block", marginTop: 10,
    fontSize: ".85rem", fontWeight: 700, color: GOLD, textDecoration: "none",
  },

  explainerStrip: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 16, borderTop: `1px solid ${LINE}`, paddingTop: 24, marginTop: 4,
    flexWrap: "wrap",
  },
  explainerLink: { fontSize: ".88rem", fontWeight: 700, color: GREEN, textDecoration: "none" },

  ctaBand: { background: GREEN, padding: "60px 24px" },
  ctaInner: {
    maxWidth: 800, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 32, flexWrap: "wrap",
  },
  ctaH2: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "1.7rem", color: CREAM, margin: "0 0 8px",
  },
  ctaSub: { color: "rgba(251,248,241,.68)", fontSize: ".91rem", lineHeight: 1.65, margin: 0 },
  ctaBtns: { display: "flex", gap: 12, flexWrap: "wrap", flexShrink: 0 },
  goldBtn: {
    padding: "14px 28px", borderRadius: 12, background: GOLD,
    color: GREEN, fontWeight: 700, fontSize: ".95rem",
    border: "none", cursor: "pointer", whiteSpace: "nowrap",
  },
  goldLink: {
    padding: "14px 28px", borderRadius: 12, background: GOLD,
    color: GREEN, fontWeight: 700, fontSize: ".95rem",
    textDecoration: "none", display: "inline-block", whiteSpace: "nowrap",
  },
  ghostBtn: {
    padding: "14px 24px", borderRadius: 12,
    border: "1px solid rgba(251,248,241,.25)", color: "rgba(251,248,241,.82)",
    fontWeight: 600, fontSize: ".88rem", textDecoration: "none",
    display: "inline-block", whiteSpace: "nowrap",
  },

  pillarsSection: { background: "#f0ece3", padding: "60px 24px" },
  pillarsInner: { maxWidth: 860, margin: "0 auto" },
  pillarsEyebrow: {
    fontSize: ".7rem", fontWeight: 700, letterSpacing: ".14em",
    textTransform: "uppercase", color: GOLD, textAlign: "center",
    marginBottom: 32,
  },
  pillars: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 },
  pillar: {
    background: CREAM, borderRadius: 14, padding: "26px 22px",
    border: `1px solid ${LINE}`,
  },
  pillarT: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "1rem", color: GREEN, margin: "0 0 10px", fontWeight: 700, lineHeight: 1.4,
  },
  pillarD: { color: MUTED, fontSize: ".87rem", lineHeight: 1.7, margin: 0 },

  contactStrip: {
    borderTop: `1px solid ${LINE}`, padding: "16px 24px",
    textAlign: "center", background: CREAM,
  },
};

