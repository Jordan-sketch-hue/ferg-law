import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Jamaican Property Glossary — H.O.M.E.™ by Ferguson Law",
  description:
    "A plain-English glossary of Jamaican property terms — how they compare to UK and USA/Canada equivalents, for buyers at home and abroad.",
};

const COMPARE_TERMS = [
  { term: "Attorney-at-Law", ja: "Primary legal advisor in property transaction", uk: "Solicitor", us: "Attorney" },
  { term: "Completion", ja: "Completion", uk: "Completion", us: "Closing" },
  { term: "Conveyancing", ja: "Property transfer process", uk: "Same", us: "Often called Closing or Escrow" },
  { term: "Down Payment", ja: "Usually 5–10% on signing Agreement for Sale", uk: "Often 10% exchange deposit", us: "Earnest Money Deposit" },
  { term: "Mortgage", ja: "Loan secured by property", uk: "Same", us: "Same" },
  { term: "Real Estate Agent", ja: "Licensed real estate professional", uk: "Estate Agent", us: "Realtor / Broker" },
  { term: "Strata", ja: "Apartment ownership structure", uk: "Leasehold / Commonhold equivalent", us: "Condominium (Condo)" },
  { term: "Surveyor", ja: "Measures boundaries, subdivision work", uk: "Similar", us: "Land Surveyor" },
  { term: "Title", ja: "Registered ownership document", uk: "Registry title", us: "Deed often proves ownership" },
  { term: "Valuation", ja: "Valuation report", uk: "Valuation", us: "Appraisal" },
];

const LEGAL_TERMS = [
  {
    term: "Agreement for Sale",
    plain: "The deal document before ownership changes hands.",
    why: "It sets the terms, rights, and obligations before transfer.",
  },
  {
    term: "AML (Anti-Money Laundering)",
    plain: "Compliance checks to prevent illegal funds entering the transaction.",
    why: "Protects the transaction from being used for unlawful activity.",
  },
  {
    term: "Apostille",
    plain: "Certification for foreign documents such as Powers of Attorney, affidavits, and declarations.",
    why: "Confirms that foreign paperwork is properly validated for use in the transaction.",
  },
  {
    term: "Beneficial Owner",
    plain: "The real person who ultimately owns or controls the property or transaction.",
    why: "Identifies the true owner behind the legal paperwork.",
  },
  {
    term: "Caveat",
    plain: "A warning flag on the property record.",
    why: "It alerts others that title is being challenged or claimed.",
  },
  {
    term: "Certificate of Title",
    plain: "The official proof of who owns the property.",
    why: "It confirms ownership and transfer rights.",
  },
  {
    term: "Conveyancing",
    plain: "The process that moves property from seller to buyer.",
    why: "It covers the steps needed to complete the transaction.",
  },
  {
    term: "Easement",
    plain: "Someone else may use part of the land for a specific purpose.",
    why: "You may own the land but not have exclusive use of every part.",
  },
  {
    term: "Encumbrance",
    plain: "Baggage attached to a property.",
    why: "It can affect use, sale, or value.",
  },
  {
    term: "KYC (Know Your Customer)",
    plain: "Identity and background checks required before a transaction can proceed.",
    why: "Helps verify who is involved and supports compliance checks.",
  },
  {
    term: "Notary Public",
    plain: "Certification for foreign documents such as Powers of Attorney, affidavits, and declarations.",
    why: "Confirms that foreign paperwork is properly validated for use in the transaction.",
  },
  {
    term: "Source of Funds",
    plain: "Proof showing where purchase money came from — salary, savings, sale proceeds, or inheritance.",
    why: "Shows the money is legitimate and properly documented.",
  },
];

const JAMAICA_TERMS = [
  { term: "NHT", desc: "National Housing Trust — a concept unique to Jamaica with no direct foreign equivalent. Allows qualifying contributors to withdraw savings toward a home purchase or access NHT mortgage financing." },
  { term: "TRN", desc: "Tax Registration Number — a 9-digit number required for virtually all property transactions in Jamaica. Similar in function to a Social Security Number (USA) or National Insurance Number (UK), though not a direct equivalent." },
  { term: "NLA", desc: "National Land Agency — Jamaica's land registry authority, responsible for title registration and searches." },
  { term: "TAJ", desc: "Tax Administration Jamaica — responsible for Stamp Duty, Property Tax, and Transfer Tax administration." },
  { term: "Registered Land", desc: "Land governed by the Registration of Titles Act. This is the gold standard of Jamaican property ownership — the title is government-guaranteed." },
];

const CONFUSING = [
  {
    pair: "\"Completion\" vs \"Registration\"",
    a: "Completion is the stage at which the sale transaction is finalised — following payment of the purchase money.",
    b: "Registration is when the new owner's name is placed on the title and possession is granted.",
  },
  {
    pair: "\"Pre-Qualification\" vs \"Mortgage Approval\"",
    a: "A Pre-Qualification is a conditional indication from a mortgage lender that the applicant may be favourably considered for a mortgage loan of a stated sum.",
    b: "It is a strong indicator to real estate agents and vendors of the amount of financing the applicant is likely to have in place.",
  },
  {
    pair: "\"Registered Owner\" vs \"Beneficial Owner\"",
    a: "The Registered Owner's name appears on the title.",
    b: "Property may have a Beneficial Owner on whose behalf the Registered Owner holds the property.",
  },
  {
    pair: "\"Title\" vs \"Deed\"",
    a: "Title usually refers to the Registered Title issued by the NLA under the Registration of Titles Act.",
    b: "A Deed shows ownership of unregistered land.",
  },
  {
    pair: "\"Valuation\" vs \"Inspection\"",
    a: "A Valuation report provides a professional estimate of the market value of the property.",
    b: "An Inspection may be conducted by the purchaser or professionals acting on their behalf to confirm the condition of the property, the boundaries, and whether any other interests or activities are apparent which might affect the purchaser's interests.",
  },
];

export default function GlossaryPage() {
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
          H.O.M.E.™ by Ferguson Law
        </span>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(2rem,5vw,3rem)",
            lineHeight: 1.08,
            margin: "0 0 1rem",
            color: "#fff",
          }}
        >
          Jamaican Property Glossary
        </h1>
        <p
          style={{
            maxWidth: 560,
            margin: "0 auto",
            fontSize: "1.05rem",
            lineHeight: 1.65,
            color: "rgba(246,242,234,.78)",
          }}
        >
          Plain-English definitions of the terms you&apos;ll encounter when buying or
          selling property in Jamaica — and how they compare to UK and USA/Canada equivalents.
        </p>
      </section>

      {/* Section A — Compare terms */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <span className="eyebrow">Section A</span>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.4rem,2.5vw,1.9rem)", margin: ".5rem 0 1.5rem" }}>
            Terms That Differ Between Jamaica, UK, USA &amp; Canada
          </h2>
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Jamaica</th>
                  <th>UK</th>
                  <th>USA / Canada</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_TERMS.map((r) => (
                  <tr key={r.term}>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{r.term}</td>
                    <td>{r.ja}</td>
                    <td style={{ color: "var(--muted)" }}>{r.uk}</td>
                    <td style={{ color: "var(--muted)" }}>{r.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section B — Legal terms */}
      <section className="section" style={{ background: "var(--paper-2)", borderTop: "1px solid var(--line)" }}>
        <div className="wrap">
          <span className="eyebrow">Section B</span>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.4rem,2.5vw,1.9rem)", margin: ".5rem 0 1.5rem" }}>
            Legal Terms
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1rem" }}>
            {LEGAL_TERMS.map((item) => (
              <div key={item.term} style={{ background: "#fff", borderRadius: 16, padding: "1.4rem 1.3rem", border: "1px solid var(--line)" }}>
                <h4 style={{ fontFamily: "var(--serif)", color: "var(--ink)", margin: "0 0 .5rem", fontSize: "1rem" }}>{item.term}</h4>
                <p style={{ fontSize: ".92rem", color: "var(--muted)", margin: "0 0 .5rem", lineHeight: 1.55 }}>
                  <strong style={{ color: "var(--ink-2)" }}>Plain English:</strong> {item.plain}
                </p>
                <p style={{ fontSize: ".9rem", color: "var(--gold-deep)", margin: 0, lineHeight: 1.5 }}>
                  <strong>Why it matters:</strong> {item.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section G — Jamaica-specific */}
      <section className="section" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <span className="eyebrow">Section C</span>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.4rem,2.5vw,1.9rem)", margin: ".5rem 0 1.5rem" }}>
            Jamaica-Specific Terms
          </h2>
          <div style={{ display: "grid", gap: "1rem", maxWidth: 760 }}>
            {JAMAICA_TERMS.map((item) => (
              <div key={item.term} style={{ background: "var(--paper-2)", borderRadius: 14, padding: "1.2rem 1.3rem", border: "1px solid var(--line)", display: "grid", gridTemplateColumns: "100px 1fr", gap: "1rem", alignItems: "start" }}>
                <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--gold-deep)", fontFamily: "var(--serif)" }}>{item.term}</span>
                <p style={{ fontSize: ".95rem", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section H — Confusing terms */}
      <section className="section" style={{ background: "var(--paper-2)", borderTop: "1px solid var(--line)" }}>
        <div className="wrap">
          <span className="eyebrow">Section D</span>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.4rem,2.5vw,1.9rem)", margin: ".5rem 0 1.5rem" }}>
            Terms That Often Confuse Overseas Buyers
          </h2>
          <div style={{ display: "grid", gap: "1.1rem", maxWidth: 820 }}>
            {CONFUSING.map((item) => (
              <div key={item.pair} style={{ background: "#fff", borderRadius: 16, padding: "1.5rem 1.4rem", border: "1px solid var(--line)" }}>
                <h4 style={{ fontFamily: "var(--serif)", color: "var(--ink)", margin: "0 0 .8rem", fontSize: "1.02rem" }}>{item.pair}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                  <p style={{ fontSize: ".93rem", color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>{item.a}</p>
                  <p style={{ fontSize: ".93rem", color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>{item.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media(max-width:640px){
          [style*="grid-template-columns: repeat(auto-fill"]{grid-template-columns:1fr !important;}
          [style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr !important;}
          [style*="grid-template-columns: 100px"]{grid-template-columns:1fr !important;}
        }
      `}</style>
    </BookingProvider>
  );
}
