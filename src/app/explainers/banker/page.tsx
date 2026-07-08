import type { Metadata } from "next";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import Link from "next/link";
import { CONSULT_DURATION_MIN } from "@/lib/site";

export const metadata: Metadata = {
  title: "10 Things Your Banker Won't Tell You | Ferguson Law",
  description:
    "What every Jamaican property buyer should know before walking into a bank – the commercial realities your banker may not volunteer. By Ferguson Law.",
};

const POINTS = [
  {
    n: "01",
    title: "The bank is assessing you – not just the property.",
    body: "Many buyers believe the house is the most important part of the transaction. It isn't. The bank is primarily evaluating whether you are likely to repay the loan over the next twenty to thirty years. Your income, employment history, spending habits, existing debts, savings behaviour and overall financial discipline often matter more than the property itself. A beautiful home cannot compensate for weak financial management.",
  },
  {
    n: "02",
    title: "Your bank statements tell a story.",
    body: "Every transaction in your account creates a financial profile. Frequent overdrafts, returned cheques, gambling transactions, excessive cash withdrawals or irregular income patterns may raise concerns – even if your salary appears sufficient. Conversely, regular savings, consistent income and responsible spending build confidence. Many applicants focus on improving their credit score while overlooking the everyday picture painted by their bank statements.",
  },
  {
    n: "03",
    title: "The first offer is rarely the only offer.",
    body: "Interest rates, fees and lending terms are not always identical from one institution to another. Different banks have different lending appetites. One bank may decline your application while another approves it under slightly different conditions. Even within the same bank, stronger applicants sometimes qualify for better pricing than they initially receive. Shopping around is often worthwhile.",
  },
  {
    n: "04",
    title: "A larger down payment can save far more than you expect.",
    body: "Many buyers aim only to meet the minimum down payment requirement. However, contributing more upfront can significantly reduce monthly repayments, total interest paid, mortgage insurance costs (where applicable), and the likelihood of negative equity. A larger down payment also demonstrates financial stability, making you a more attractive borrower.",
  },
  {
    n: "05",
    title: "Pre-approval is not the same as final approval.",
    body: "Many purchasers celebrate receiving a pre-approval letter. While encouraging, pre-approval is not a guarantee that funds will ultimately be disbursed. Final approval often depends upon satisfactory property valuation, legal due diligence, title investigations, insurance arrangements, and verification that your financial circumstances have not materially changed. Changing jobs, taking on new debt or making major purchases before closing can jeopardize final approval.",
  },
  {
    n: "06",
    title: "Your lawyer can protect you from problems the bank is not investigating.",
    body: "The bank's legal team is primarily protecting the bank's security. Your attorney is protecting your investment. Issues such as title defects, easements, restrictive covenants, unpaid taxes, planning approvals, boundary discrepancies and contractual risks may affect your ownership even if the bank is satisfied. Never assume the bank's approval means every legal issue has been resolved. Independent legal advice remains essential.",
  },
  {
    n: "07",
    title: "Small debts can become big obstacles.",
    body: "Many applicants concentrate on large loans while ignoring smaller obligations. Credit cards, hire purchase agreements, personal loans, \"buy now, pay later\" arrangements and guarantor commitments all affect your debt servicing capacity. Sometimes paying off a relatively small debt before applying for a mortgage can substantially improve your borrowing power.",
  },
  {
    n: "08",
    title: "Timing matters.",
    body: "Banks periodically adjust lending policies based on market conditions, economic forecasts and regulatory guidance. An application submitted today may receive a different outcome than one submitted several months later. Interest rates also fluctuate. Preparing your finances before you actively begin house hunting can position you to move quickly when favourable opportunities arise.",
  },
  {
    n: "09",
    title: "Communication can make the process much smoother.",
    body: "Many delays occur because requested documents are submitted late or incomplete. Banks often require proof of income, identification, tax documents, employment verification, valuation reports and supporting financial information. Responding promptly to requests keeps your application moving and reduces unnecessary delays. The more organised you are, the easier the process generally becomes.",
  },
  {
    n: "10",
    title: "Your financial relationship doesn't end after the mortgage is approved.",
    body: "Obtaining the loan is only the beginning. Maintaining a good relationship with your bank can create future opportunities for refinancing, investment property financing, business lending, home improvement loans and wealth management services. Consistently meeting your obligations strengthens your financial reputation and opens doors in the future.",
  },
];

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function BankerExplainer() {
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
          10 Things Your Banker Won&apos;t Tell You
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
          What every property buyer should know before walking into a bank – the commercial realities and internal policies that your banker may not always volunteer.
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
            Your banker is one of the most important people you&apos;ll meet during your journey to buying a home or investing in property. They can unlock financing that makes your dreams possible – or decline an application that seemed certain to succeed.
          </p>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.75, color: "var(--muted)" }}>
            Most bankers genuinely want to help. However, they also represent their institution, which means there are commercial realities and internal policies that they may not always volunteer during your conversations. Understanding these realities can save you thousands of dollars, improve your chances of approval and place you in a stronger negotiating position.
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
              Buying property is a team effort.
            </h2>
            <p style={{ color: "rgba(246,242,234,.78)", marginBottom: "1rem", maxWidth: 600 }}>
              A knowledgeable banker is an invaluable partner – but so is a knowledgeable attorney. Your banker helps determine whether financing is available. Your attorney helps ensure the property is legally sound, your interests are protected and the transaction proceeds safely from contract to completion.
            </p>
            <p style={{ color: "rgba(246,242,234,.7)", marginBottom: "1.5rem", maxWidth: 600, fontSize: ".95rem" }}>
              The most successful buyers recognise that purchasing property is a team effort involving the bank, the realtor, the surveyor, the valuator and, most importantly, an experienced conveyancing attorney working on their behalf.
            </p>
            <p style={{ color: "rgba(246,242,234,.7)", marginBottom: "1.5rem", maxWidth: 600, fontSize: ".95rem" }}>
              Need guidance before applying for a mortgage or purchasing property? Book a {CONSULT_DURATION_MIN}-minute consultation and Ferguson Law will help you navigate every stage of the process – from reviewing contracts and conducting title investigations to coordinating with banks, developers and realtors.
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
