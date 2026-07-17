import type { Metadata } from "next";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import Link from "next/link";
import { SITE, CONSULT_DURATION_MIN } from "@/lib/site";

export const metadata: Metadata = {
  title: "What a Property Purchase in Jamaica Really Costs | H.O.M.E.™ by Ferguson Law",
  description:
    "Transfer tax, stamp duty, attorney fees, valuation, survey — every closing cost explained so you're never surprised at the table.",
};

const COSTS = [
  {
    n: "01",
    name: "Transfer Tax",
    who: "Seller pays",
    pct: "2% of Selling price",
    desc: "Paid on the transfer of the title. A 2% charge on the agreed Selling price, normally paid by the seller.",
  },
  {
    n: "02",
    name: "Stamp Duty",
    who: "Both parties pay",
    pct: "$5,000",
    desc: "A government duty on the transfer documents. Both buyer and seller pay this at closing.",
  },
  {
    n: "03",
    name: "Registration Fee",
    who: "Both parties pay",
    pct: "0.5% of Selling price",
    desc: "A charge to the National Land Agency to register the title in the new owner's name. Both buyer and seller pay this fee.",
  },
  {
    n: "04",
    name: "Attorney's Fees",
    who: "Buyer & seller each",
    pct: "Negotiable",
    desc: "Legal fees for conveyancing — searches, agreements, compliance and completion. Both parties retain their own attorney.",
  },
  {
    n: "05",
    name: "Valuation Fee",
    who: "Buyer pays",
    pct: "Fixed by licensed valuator",
    desc: "A licensed valuation is required by every bank and the NHT before mortgage approval. Non-negotiable for financed purchases.",
  },
  {
    n: "06",
    name: "Survey Fee",
    who: "Buyer pays",
    pct: "Varies by lot size",
    desc: "Confirms the boundaries and exact size of the lot. Required for most purchases and always recommended.",
  },
  {
    n: "07",
    name: "Mortgage Processing Fee",
    who: "Purchaser pays",
    pct: "1–3% of loan amount",
    desc: "Charged by the lender for processing and approving the mortgage application. Varies by institution.",
  },
  {
    n: "08",
    name: "Life Insurance",
    who: "Purchaser pays",
    pct: "Monthly premium",
    desc: "Required by most lenders as a condition of the mortgage. Covers the outstanding balance in the event of the borrower's death.",
  },
  {
    n: "09",
    name: "Agreement for Sale",
    who: "Purchaser & Vendor equally",
    pct: "~J$100,000–150,000",
    desc: "Legal fee for drafting or reviewing the Agreement for Sale — the binding contract that governs the transaction.",
  },
  {
    n: "10",
    name: "Sundry Legal Costs",
    who: "Purchaser pays",
    pct: "~J$30,000–40,000",
    desc: "Miscellaneous disbursements including searches, compliance certificates, courier fees and other incidentals.",
  },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function CostsExplainer() {
  return (
    <BookingProvider>
      <Reveal />
      <Nav />

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)",
          padding: "5rem 1.5rem 4rem",
          textAlign: "center",
          color: "var(--paper)",
        }}
      >
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
          H.O.M.E.™ by Ferguson Law — Property Explainer
        </span>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(2rem,5vw,3.2rem)",
            lineHeight: 1.08,
            margin: "0 0 1rem",
            color: "#fff",
          }}
        >
          What a Property Purchase in Jamaica Really Costs
        </h1>
        <p
          style={{
            maxWidth: 560,
            margin: "0 auto 2rem",
            fontSize: "1.1rem",
            lineHeight: 1.65,
            color: "rgba(246,242,234,.78)",
          }}
        >
          A Jamaican property transaction involves 6 categories of fees beyond the purchase price. Together they can add{" "}
          <strong style={{ color: "#fff" }}>10–20% to your total cost.</strong> Ferguson Law explains every figure before you commit to anything.
        </p>
        <div style={{ display: "flex", gap: ".9rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/explainers" style={{ color: "rgba(246,242,234,.6)", fontSize: ".9rem", textDecoration: "none" }}>
            ← Back to all Explainers
          </Link>
        </div>
      </section>

      {/* Cost Cards */}
      <section style={{ padding: "4rem 1.5rem 2rem", background: "var(--paper)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
              gap: "1.2rem",
            }}
          >
            {COSTS.map((c) => (
              <div
                key={c.n}
                className="serv reveal"
                style={{ padding: "1.8rem 1.6rem" }}
              >
                <div className="num">{c.n}</div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: ".3rem" }}>{c.name}</h3>
                <div
                  style={{
                    display: "flex",
                    gap: ".5rem",
                    flexWrap: "wrap",
                    marginBottom: ".8rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: ".75rem",
                      fontWeight: 600,
                      background: "rgba(200,166,92,.1)",
                      color: "var(--gold-deep)",
                      borderRadius: 6,
                      padding: ".2rem .6rem",
                    }}
                  >
                    {c.who}
                  </span>
                  <span
                    style={{
                      fontSize: ".75rem",
                      fontWeight: 600,
                      background: "var(--paper-2)",
                      color: "var(--muted)",
                      borderRadius: 6,
                      padding: ".2rem .6rem",
                    }}
                  >
                    {c.pct}
                  </span>
                </div>
                <p style={{ fontSize: ".95rem", color: "var(--muted)", lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Summary callout — full width */}
      <section style={{ background: "linear-gradient(135deg,#0e2518,#1a3828)", padding: "2.8rem 2rem", color: "var(--paper)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
            <div
              style={{
                fontSize: ".72rem",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--gold)",
                fontWeight: 700,
                marginBottom: ".6rem",
              }}
            >
              The bottom line
            </div>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(1.3rem,2.5vw,1.8rem)",
                margin: "0 0 .8rem",
                color: "#fff",
              }}
            >
              Most buyers are surprised. <em>You won&apos;t be.</em>
            </h2>
            <p style={{ color: "rgba(246,242,234,.78)", marginBottom: "1.5rem", maxWidth: 580 }}>
              Every deal is different. Book a {CONSULT_DURATION_MIN}-minute consultation and Ferguson Law will walk you through the exact costs for your purchase — before you sign anything.
            </p>
            <BookButton className="btn btn-gold">
              Book a consultation <ArrowIcon />
            </BookButton>
        </div>
      </section>

      <style>{HomeBadgeBackCss}</style>
      <Footer />

      <style>{`
        @media(max-width:640px){
          [style*="repeat(auto-fill"]{grid-template-columns:1fr !important;}
        }
      `}</style>
    </BookingProvider>
  );
}

const HomeBadgeBackCss = `
  .g-more{font-size:.85rem;font-weight:600;color:var(--gold-deep);}
`;
