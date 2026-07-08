import type { Metadata } from "next";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import Link from "next/link";
import { CONSULT_DURATION_MIN } from "@/lib/site";

export const metadata: Metadata = {
  title: "10 Costly Property Mistakes a Surveyor's ID Report Can Prevent | Ferguson Law",
  description:
    "Why a Surveyor's Identification Report is essential before buying property in Jamaica — and the 10 costly mistakes it can prevent. By Ferguson Law.",
};

const POINTS = [
  {
    n: "01",
    title: "Buying the Wrong Parcel of Land",
    body: "In Jamaica, parcels of land are identified by volume and folio numbers on a registered title. Without a surveyor physically identifying the parcel, buyers can — and sometimes do — pay for one piece of land while assuming they are purchasing a different one. The SIR confirms that the physical land on the ground matches the legal description on the title.",
  },
  {
    n: "02",
    title: "Discovering Boundary Disputes After Closing",
    body: "Boundary disputes between neighbouring landowners are common in Jamaica, particularly in areas where properties have changed hands several times. A Surveyor's Identification Report shows the exact boundaries of the property based on registered survey data. Discovering that a neighbour disputes a boundary after you have already closed can be extremely costly and time-consuming to resolve.",
  },
  {
    n: "03",
    title: "Purchasing Property with Encroaching Buildings",
    body: "Sometimes a boundary wall, a structure or a portion of a building sits on a neighbouring property — or conversely, a neighbour's structure encroaches onto the land you are purchasing. These encroachments may not be visible to the naked eye without professional measurement. A surveyor can identify and document them before you commit to the purchase.",
  },
  {
    n: "04",
    title: "Assuming Every Structure Is Located on the Property",
    body: "A building that appears to be on a property may actually extend beyond its boundary. This can affect the legal ownership of the structure itself, create liability for the encroachment, and complicate any future development, sale or financing of the property. The SIR confirms the relationship between registered boundaries and existing structures.",
  },
  {
    n: "05",
    title: "Buying Property Without Legal Access",
    body: "Some properties are landlocked — meaning they have no direct legal access to a public road. Access may have been informally arranged with a neighbour or may be assumed based on a path that has no legal status. Purchasing such a property without understanding the access situation can severely limit what you can do with it and reduce its value significantly.",
  },
  {
    n: "06",
    title: "Unexpected Mortgage Delays",
    body: "Most Jamaican financial institutions require a Surveyor's Identification Report as part of the mortgage approval process. Buyers who do not obtain an SIR early enough often experience delays in financing that can push back the closing date, trigger penalty clauses in the sale agreement, or — in the worst cases — cause the transaction to collapse.",
  },
  {
    n: "07",
    title: "Inheriting Someone Else's Longstanding Problems",
    body: "Property problems — including unresolved boundary disputes, encroachments and access issues — do not disappear when a property changes hands. When you buy property, you inherit its history. An SIR allows you to identify existing problems before you become the new owner and inherit the responsibility for resolving them.",
  },
  {
    n: "08",
    title: "Paying More Than the Property Is Worth",
    body: "Boundary discrepancies and encroachments can affect the usable area of a property — and therefore its market value. Paying full price for a parcel that is smaller than represented, or that has portions subject to encroachment or dispute, means overpaying for what you actually receive. An SIR gives you accurate information on which to base your offer.",
  },
  {
    n: "09",
    title: "Creating Problems When You Decide to Sell",
    body: "Many property owners who skipped the SIR when purchasing discover the problem years later — when they try to sell and their buyer's attorney or bank raises concerns. At that point, resolving the issue becomes your responsibility, at your cost, potentially under time pressure from a buyer who may choose to walk away.",
  },
  {
    n: "10",
    title: "Believing a Registered Title Eliminates Every Risk",
    body: "A registered title in Jamaica is strong evidence of ownership — but it does not confirm that the physical boundaries on the ground match the legal description, that there are no encroachments, or that access exists. Title registration and physical survey are separate matters. A clean title does not mean the physical property is free of all issues.",
  },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ width: 18, height: 18, marginLeft: 6 }}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function SurveyorExplainer() {
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
          H.O.M.E.™ by Ferguson Law – Property Explainer
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
          10 Costly Property Mistakes a Surveyor&apos;s Identification Report Can Prevent
        </h1>
        <p
          style={{
            maxWidth: 580,
            margin: "0 auto 2rem",
            fontSize: "1.1rem",
            lineHeight: 1.65,
            color: "rgba(246,242,234,.78)",
          }}
        >
          Why a Surveyor&apos;s Identification Report is one of the most important pieces of due diligence a Jamaican property buyer can commission — before signing anything.
        </p>
        <div style={{ display: "flex", gap: ".9rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/explainers" style={{ color: "rgba(246,242,234,.6)", fontSize: ".9rem", textDecoration: "none" }}>
            ™ Back to all Explainers
          </Link>
        </div>
      </section>

      {/* Intro */}
      <section style={{ padding: "3rem 1.5rem 0", background: "var(--paper)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--muted)", marginBottom: "1rem" }}>
            A Surveyor&apos;s Identification Report (SIR) is prepared by a licensed land surveyor and confirms that the physical land being purchased matches the legal description on the registered title. It identifies the boundaries of the property, flags any encroachments, and reveals access issues that may not be apparent from a simple walk-around.
          </p>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--muted)" }}>
            Many buyers — particularly first-time purchasers — skip this step to save money or accelerate the process. Here are ten reasons that decision often proves to be a costly one.
          </p>
        </div>
      </section>

      {/* Points */}
      <section style={{ padding: "3rem 1.5rem 2rem", background: "var(--paper)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
              gap: "1.2rem",
            }}
          >
            {POINTS.map((p) => (
              <div key={p.n} className="serv reveal" style={{ padding: "1.8rem 1.6rem" }}>
                <div className="num">{p.n}</div>
                <h3 style={{ fontSize: "1.05rem", marginBottom: ".7rem", lineHeight: 1.35 }}>{p.title}</h3>
                <p style={{ fontSize: ".93rem", color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom line callout — full width */}
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
              Prevention Is Always Less Expensive Than Correction
            </div>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(1.3rem,2.5vw,1.8rem)",
                margin: "0 0 .8rem",
                color: "#fff",
              }}
            >
              Commission the SIR before you sign — not after.
            </h2>
            <p style={{ color: "rgba(246,242,234,.78)", marginBottom: "1rem", maxWidth: 600 }}>
              The cost of a Surveyor&apos;s Identification Report is modest relative to the value of the transaction. The cost of resolving a boundary dispute, correcting an encroachment, or obtaining legal access after closing is not. The SIR is essential due diligence — not an optional extra.
            </p>
            <p style={{ color: "rgba(246,242,234,.7)", marginBottom: "1.5rem", maxWidth: 600, fontSize: ".95rem" }}>
              Ferguson Law recommends that all property buyers in Jamaica commission an SIR as part of the due diligence process — alongside a title investigation and a legal review of the sale agreement. These steps exist to protect buyers from exactly the problems described above.
            </p>
            <p style={{ color: "rgba(246,242,234,.7)", marginBottom: "1.5rem", maxWidth: 600, fontSize: ".95rem" }}>
              Book a {CONSULT_DURATION_MIN}-minute consultation with Ferguson Law to discuss your property transaction, understand your due diligence obligations, and make sure every stage of your purchase is handled correctly.
            </p>
            <BookButton className="btn btn-gold">
              Book a consultation <ArrowIcon />
            </BookButton>
        </div>
      </section>

      <Footer />

      <style>{`
        @media(max-width:640px){
          [style*="repeat(auto-fill"]{grid-template-columns:1fr !important;}
        }
      `}</style>
    </BookingProvider>
  );
}
