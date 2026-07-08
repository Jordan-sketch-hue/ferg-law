import type { Metadata } from "next";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import Link from "next/link";
import { CONSULT_DURATION_MIN } from "@/lib/site";

export const metadata: Metadata = {
  title: "10 Things to Expect from Your Real Estate Agent | Ferguson Law",
  description:
    "What every Jamaican property buyer and seller should expect from their real estate agent — and what to watch for. By Ferguson Law.",
};

const POINTS = [
  {
    n: "01",
    title: "Honest Advice — Even When It Isn't What You Want to Hear",
    body: "A good agent will tell you when a property is overpriced, when a neighbourhood has challenges, or when a deal needs to be reconsidered — even if that means losing a commission. Honest advice protects your long-term interests. If your agent always agrees with everything you say, that should give you pause.",
  },
  {
    n: "02",
    title: "A Thorough Understanding of the Local Market",
    body: "Your agent should know recent sale prices in the area, comparable properties currently on the market, and the factors that influence value in that specific location. This knowledge allows them to advise you on a fair offer price when buying, or an appropriate listing price when selling. Market knowledge is one of the most valuable things a skilled agent brings to the table.",
  },
  {
    n: "03",
    title: "Clear and Timely Communication",
    body: "You should never be left wondering what is happening with your transaction. A professional agent keeps you updated at every stage — when offers are submitted, when inspections are scheduled, when documents are received, and when there are delays. Unclear or infrequent communication is one of the most common sources of frustration in property transactions.",
  },
  {
    n: "04",
    title: "Skilled Negotiation",
    body: "Negotiation is a core skill for any real estate agent. Whether negotiating the purchase price, the deposit amount, the closing timeline, or the items included in the sale, your agent should be advocating firmly on your behalf. A well-negotiated deal can save buyers thousands of dollars and protect sellers from accepting terms that do not serve their interests.",
  },
  {
    n: "05",
    title: "Professional Marketing",
    body: "If you are selling a property, your agent should present it in the best possible light — including quality photographs, well-written listings, and exposure through appropriate channels. Poor marketing reduces the number of potential buyers who see your property, which can extend the time on market and reduce your final sale price.",
  },
  {
    n: "06",
    title: "Guidance Throughout the Buying Process",
    body: "The buying process in Jamaica involves multiple stages: identifying properties, making an offer, signing a sale agreement, conducting due diligence, arranging financing, and completing the legal transfer. Your agent should be guiding you through each stage — explaining what is happening, what is expected of you, and what comes next.",
  },
  {
    n: "07",
    title: "Coordination with Other Professionals",
    body: "A good agent works alongside other professionals involved in your transaction — including your attorney, your banker, the valuator, and the surveyor. They help ensure that information flows between parties, that timelines are respected, and that delays are addressed quickly. The smoother this coordination, the fewer surprises arise during the process.",
  },
  {
    n: "08",
    title: "Ethical Conduct",
    body: "Real estate agents in Jamaica are regulated by the Real Estate Board (REB). You should expect your agent to act in accordance with the standards of their profession — avoiding conflicts of interest, handling your information with discretion, and never misrepresenting a property or a transaction. If something feels wrong, you have the right to raise it.",
  },
  {
    n: "09",
    title: "Attention to Detail",
    body: "Property transactions involve significant amounts of money and detailed legal documentation. An agent who catches an error in a sale agreement, notices an inconsistency in the listing details, or identifies a missing document before it becomes a problem is providing real value. Attention to detail protects you from costly mistakes.",
  },
  {
    n: "10",
    title: "Continued Support Until Closing",
    body: "Your agent's job does not end when an offer is accepted. The period between offer and closing can involve inspections, mortgage approvals, legal searches, and potential renegotiation. A professional agent remains engaged and available throughout the process — right up to the day the keys change hands.",
  },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ width: 18, height: 18, marginLeft: 6 }}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function AgentExplainer() {
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
          10 Things to Expect from Your Real Estate Agent
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
          What every Jamaican property buyer and seller should expect from a professional real estate agent — and what to watch for when things fall short.
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
            Your real estate agent plays a central role in one of the most significant financial decisions you will ever make. Whether you are buying or selling, the agent you choose — and what you expect from them — can make the difference between a smooth transaction and a stressful one.
          </p>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--muted)" }}>
            Understanding what a professional agent should deliver helps you hold them accountable, ask the right questions, and recognise when the relationship is not serving your interests.
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
              Remember What Your Agent Does — and Doesn&apos;t Do
            </div>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(1.3rem,2.5vw,1.8rem)",
                margin: "0 0 .8rem",
                color: "#fff",
              }}
            >
              Your agent finds the property. Your attorney protects the deal.
            </h2>
            <p style={{ color: "rgba(246,242,234,.78)", marginBottom: "1rem", maxWidth: 600 }}>
              A skilled real estate agent is an invaluable guide through the market — but their role ends at the legal boundary. Your attorney reviews and negotiates the sale agreement, conducts title investigations, ensures that the property is free of encumbrances, and protects your interests from contract to completion.
            </p>
            <p style={{ color: "rgba(246,242,234,.7)", marginBottom: "1.5rem", maxWidth: 600, fontSize: ".95rem" }}>
              Never rely solely on your agent for legal advice. The two roles are complementary — and both are essential to a safe transaction. Ferguson Law works alongside agents, banks and developers to give clients comprehensive protection at every stage of the process.
            </p>
            <p style={{ color: "rgba(246,242,234,.7)", marginBottom: "1.5rem", maxWidth: 600, fontSize: ".95rem" }}>
              Book a {CONSULT_DURATION_MIN}-minute consultation with Ferguson Law to review your sale agreement, understand your rights, and ensure your property transaction is legally sound from start to finish.
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
