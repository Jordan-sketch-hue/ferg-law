import type { Metadata } from "next";
import Link from "next/link";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import { CmsText } from "@/components/cms/CmsBlock";

export const metadata: Metadata = {
  title: "Understanding NHT Loan Offerings – Ferguson Law",
  description:
    "A plain-English guide to NHT Open Market Loans and the External Financing Mortgage Programme (EFMP) – eligibility, loan limits, rates and how to apply.",
};

const TOC = [
  { id: "role", label: "NHT's role in homeownership" },
  { id: "open-market", label: "Open Market Loans" },
  { id: "limits", label: "Current loan limits (houses vs land)" },
  { id: "efmp", label: "The EFMP explained" },
  { id: "who", label: "Who applies through EFMP?" },
  { id: "rates", label: "Does your interest rate change?" },
  { id: "process", label: "Typical application process" },
  { id: "legal", label: "Why legal advice matters" },
];

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: "inline-block",
    background: "rgba(200,166,92,.22)",
    color: "#f0d080",
    border: "1px solid rgba(200,166,92,.35)",
    borderRadius: 6,
    padding: ".18rem .6rem",
    fontSize: ".82rem",
    fontWeight: 600,
    marginRight: ".4rem",
    marginBottom: ".4rem",
  }}>{children}</span>
);

export default function NhtExplainerPage() {
  return (
    <BookingProvider>
      <Reveal />
      <Nav />

      {/* –– Hero –– */}
      <section style={{
        background: "linear-gradient(160deg,#0e2518 0%,#1a3828 100%)",
        padding: "5rem 1.5rem 4rem",
        color: "#fff",
      }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <Link href="/explainers" style={{ display: "inline-block", fontSize: ".78rem", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold)", textDecoration: "none", marginBottom: "1.6rem" }}>
            <CmsText page="explainer-nht" block="hero_back_link" fallback="← Back to Explainers" />
          </Link>
          <div style={{ marginBottom: "1rem" }}>
            <Pill><CmsText page="explainer-nht" block="pill_01" fallback="Open Market Loans" /></Pill>
            <Pill><CmsText page="explainer-nht" block="pill_02" fallback="EFMP" /></Pill>
            <Pill><CmsText page="explainer-nht" block="pill_03" fallback="NHT Financing" /></Pill>
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(2.2rem,4.5vw,3.2rem)", lineHeight: 1.06, margin: "0 0 1.2rem", color: "#fff" }}>
            <CmsText page="explainer-nht" block="hero_h1" fallback="Understanding NHT Loan Offerings" />
          </h1>
          <p style={{ fontSize: "1.12rem", lineHeight: 1.75, color: "#fff", maxWidth: 640, margin: "0 0 2rem" }}>
            <CmsText page="explainer-nht" block="hero_sub" fallback="A guide to Open Market Loans and the External Financing Mortgage Programme (EFMP) – two programmes that have transformed how Jamaican contributors purchase homes." />
          </p>
          <BookButton className="btn btn-gold"><CmsText page="explainer-nht" block="hero_btn" fallback="Book a consultation –" /></BookButton>
        </div>
      </section>

      {/* –– Body –– */}
      <main style={{ background: "var(--paper)", padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr min(260px,28%)", gap: "3.5rem", alignItems: "start" }}>

          {/* –– Article –– */}
          <article style={{ minWidth: 0 }}>

            {/* Intro */}
            <p style={{ fontSize: "1.08rem", lineHeight: 1.8, color: "#3d463f", marginBottom: "3rem", borderLeft: "3px solid var(--gold)", paddingLeft: "1.2rem" }}>
              <CmsText page="explainer-nht" block="intro_quote" fallback="For many Jamaicans, the National Housing Trust (NHT) is the single most important institution in the journey towards homeownership. Understanding how the NHT finances home purchases can significantly improve your purchasing power and reduce your borrowing costs." />
            </p>

            {/* Section: Role */}
            <section id="role" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="role_h2" fallback="The NHT's Role in Homeownership" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <p><CmsText page="explainer-nht" block="role_p1" fallback="The NHT was established to make homeownership more affordable for Jamaican contributors. Through mandatory contributions made by employees, employers and self-employed persons, the Trust provides mortgage financing at interest rates that are generally well below those offered by commercial lenders." /></p>
                <p style={{ marginTop: "1rem" }}><CmsText page="explainer-nht" block="role_p2" fallback="Unlike conventional mortgages, NHT loans are intended to promote affordable housing rather than maximise profit. Consequently, qualifying contributors may benefit from lower interest rates, longer repayment periods and generous loan limits, making homeownership attainable for thousands of Jamaicans each year." /></p>
              </div>
            </section>

            {/* Section: Open Market */}
            <section id="open-market" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="open_market_h2" fallback="What Is an Open Market Loan?" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <p><CmsText page="explainer-nht" block="open_market_p1" fallback="An Open Market Loan enables an NHT contributor to purchase residential property from a private seller rather than directly from the NHT. This includes:" /></p>
                <ul style={{ marginTop: ".8rem", paddingLeft: "1.4rem", display: "flex", flexDirection: "column", gap: ".3rem" }}>
                  {["Existing houses", "Apartments", "Townhouses", "Residential lots", "Newly constructed homes sold by private developers"].map((item, idx) => (
                    <li key={item}><CmsText page="explainer-nht" block={`open_market_list_${String(idx + 1).padStart(2, "0")}`} fallback={item} /></li>
                  ))}
                </ul>
                <p style={{ marginTop: "1rem" }}><CmsText page="explainer-nht" block="open_market_p2" fallback="Unlike purchasing an NHT housing scheme unit, the buyer is free to negotiate with virtually any willing seller, provided the property satisfies the lending requirements of both the NHT and, where applicable, the participating financial institution." /></p>
                <p style={{ marginTop: "1rem" }}><CmsText page="explainer-nht" block="open_market_p3" fallback="This flexibility has made Open Market Loans one of the most popular NHT financing products because contributors are no longer limited to the Trust's own housing developments." /></p>
              </div>
            </section>

            {/* Section: Limits */}
            <section id="limits" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="limits_h2" fallback="Current Open Market Loan Limits" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <p><CmsText page="explainer-nht" block="limits_p1" fallback="The NHT sets different loan limits depending on the type of property being purchased. It is important to confirm which category applies to your transaction." /></p>

                <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "#102a1e", margin: "1.4rem 0 .6rem" }}>
                  <CmsText page="explainer-nht" block="limits_house_h3" fallback="Houses & Apartments" />
                </h3>
                <p style={{ marginBottom: ".8rem" }}><CmsText page="explainer-nht" block="limits_house_p1" fallback="For the purchase of a house, apartment or townhouse, eligible contributors may access:" /></p>
                <div style={{ margin: "0 0 1rem", display: "flex", flexDirection: "column", gap: ".7rem" }}>
                  {[
                    { label: "Single applicant", amount: "Up to J$9 million" },
                    { label: "Two contributors (joint)", amount: "Up to J$17 million" },
                    { label: "Three contributors (joint)", amount: "Up to J$23 million" },
                  ].map((r, idx) => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".9rem 1.2rem", background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
                      <span style={{ fontWeight: 600, color: "#102a1e" }}>
                        <CmsText page="explainer-nht" block={`limits_house_${String(idx + 1).padStart(2, "0")}_label`} fallback={r.label} />
                      </span>
                      <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                        <CmsText page="explainer-nht" block={`limits_house_${String(idx + 1).padStart(2, "0")}_amount`} fallback={r.amount} />
                      </span>
                    </div>
                  ))}
                </div>
                <p>
                  <CmsText page="explainer-nht" block="limits_house_note_pre" fallback="Single applicants purchasing qualifying properties priced at" />{" "}
                  <strong><CmsText page="explainer-nht" block="limits_house_note_bold1" fallback="J$14 million or less" /></strong>{" "}
                  <CmsText page="explainer-nht" block="limits_house_note_mid" fallback="may access a special loan limit of up to" />{" "}
                  <strong><CmsText page="explainer-nht" block="limits_house_note_bold2" fallback="J$12 million" /></strong>
                  <CmsText page="explainer-nht" block="limits_house_note_post" fallback=", subject to the applicable conditions and affordability assessment." />
                </p>

                <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "#102a1e", margin: "1.6rem 0 .6rem" }}>
                  <CmsText page="explainer-nht" block="limits_land_h3" fallback="Land / Residential Lots" />
                </h3>
                <p style={{ marginBottom: ".8rem" }}><CmsText page="explainer-nht" block="limits_land_p1" fallback="For the purchase of land or a residential lot only (without a house), the NHT applies lower limits:" /></p>
                <div style={{ margin: "0 0 1rem", display: "flex", flexDirection: "column", gap: ".7rem" }}>
                  {[
                    { label: "Single applicant", amount: "Up to J$5 million" },
                    { label: "Two contributors (joint)", amount: "Up to J$7 million" },
                    { label: "Three contributors (joint)", amount: "Up to J$10.5 million" },
                  ].map((r, idx) => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".9rem 1.2rem", background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
                      <span style={{ fontWeight: 600, color: "#102a1e" }}>
                        <CmsText page="explainer-nht" block={`limits_land_${String(idx + 1).padStart(2, "0")}_label`} fallback={r.label} />
                      </span>
                      <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                        <CmsText page="explainer-nht" block={`limits_land_${String(idx + 1).padStart(2, "0")}_amount`} fallback={r.amount} />
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ background: "rgba(200,166,92,.12)", border: "1px solid rgba(200,166,92,.3)", borderRadius: 10, padding: ".9rem 1.1rem", fontSize: ".95rem" }}>
                  <strong><CmsText page="explainer-nht" block="limits_note_bold" fallback="Note:" /></strong>{" "}
                  <CmsText page="explainer-nht" block="limits_note_text" fallback="Land purchase limits are significantly lower than house/apartment limits. Always confirm with your attorney or the NHT which category applies to your specific purchase before making financial plans." />
                </p>
              </div>
            </section>

            {/* Section: EFMP */}
            <section id="efmp" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="efmp_h2" fallback="What Is the External Financing Mortgage Programme?" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <p>
                  <CmsText page="explainer-nht" block="efmp_p1_pre" fallback="Many properties – particularly in Kingston, St. Andrew, St. Catherine and other high-demand areas – often exceed the amount the NHT alone is prepared to lend. The NHT introduced the" />{" "}
                  <strong><CmsText page="explainer-nht" block="efmp_p1_bold" fallback="External Financing Mortgage Programme (EFMP)" /></strong>{" "}
                  <CmsText page="explainer-nht" block="efmp_p1_post" fallback="to address this." />
                </p>
                <p style={{ marginTop: "1rem" }}>
                  <CmsText page="explainer-nht" block="efmp_p2_pre" fallback="The EFMP is a partnership between the NHT and approved banks, building societies and credit unions. Rather than obtaining the NHT loan directly from the Trust, eligible contributors apply through a participating financial institution. That institution processes the mortgage application, disburses the loan and administers the mortgage – while preserving the contributor's entitlement to the NHT's subsidised interest rates on the NHT-funded portion." />
                </p>
                <div style={{ marginTop: "1.4rem", display: "flex", flexDirection: "column", gap: ".8rem" }}>
                  {[
                    { n: "01", t: "Greater flexibility", b: "Obtain both NHT financing and any required additional mortgage funding through a single institution." },
                    { n: "02", t: "More housing solutions", b: "Allows the NHT to redirect more capital towards developing new housing across Jamaica rather than administering every mortgage directly." },
                  ].map(i => (
                    <div key={i.n} style={{ display: "flex", gap: "1rem", padding: "1.1rem 1.3rem", background: "#fff", border: "1px solid var(--line)", borderRadius: 14 }}>
                      <span style={{ fontFamily: "var(--serif)", fontSize: "1.5rem", color: "var(--gold)", lineHeight: 1, flexShrink: 0 }}>{i.n}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#102a1e", marginBottom: ".3rem" }}>
                          <CmsText page="explainer-nht" block={`efmp_${i.n}_title`} fallback={i.t} />
                        </div>
                        <div style={{ fontSize: ".95rem" }}>
                          <CmsText page="explainer-nht" block={`efmp_${i.n}_body`} fallback={i.b} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section: Who */}
            <section id="who" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="who_h2" fallback="Who Must Apply Through the EFMP?" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <p>
                  <CmsText page="explainer-nht" block="who_p1_pre" fallback="Under current policy, contributors earning" />{" "}
                  <strong><CmsText page="explainer-nht" block="who_p1_bold" fallback="more than J$30,000.99 per week" /></strong>{" "}
                  <CmsText page="explainer-nht" block="who_p1_post" fallback="generally apply for eligible NHT loans through one of the NHT's approved EFMP mortgage partners." />
                </p>
                <p style={{ marginTop: "1rem" }}>
                  <CmsText page="explainer-nht" block="who_p2_pre" fallback="Contributors earning" />{" "}
                  <strong><CmsText page="explainer-nht" block="who_p2_bold" fallback="J$30,000.99 per week or less" /></strong>{" "}
                  <CmsText page="explainer-nht" block="who_p2_post" fallback="will usually continue to apply directly to the NHT – unless they require financing beyond their NHT entitlement or are co-applying with a higher-income contributor. Contributors seeking certain grants or purchasing NHT scheme units continue to deal directly with the NHT." />
                </p>
              </div>
            </section>

            {/* Section: Rates */}
            <section id="rates" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="rates_h2" fallback="Does Your Interest Rate Change?" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <div style={{ background: "#102a1e", color: "#fff", borderRadius: 14, padding: "1.3rem 1.5rem", marginBottom: "1.2rem" }}>
                  <strong style={{ color: "var(--gold)" }}><CmsText page="explainer-nht" block="rates_misconception_label" fallback="Common misconception:" /></strong>{" "}
                  <CmsText page="explainer-nht" block="rates_misconception_text" fallback="Many contributors believe that applying through the EFMP means losing the NHT's favourable interest rates. That is not the case." />
                </div>
                <p>
                  <CmsText page="explainer-nht" block="rates_p1_pre" fallback="The NHT interest rate continues to apply to the" />{" "}
                  <strong><CmsText page="explainer-nht" block="rates_p1_bold1" fallback="NHT-funded portion" /></strong>{" "}
                  <CmsText page="explainer-nht" block="rates_p1_mid" fallback="of the mortgage even though the loan is administered by an external financial institution. Only any" />{" "}
                  <em><CmsText page="explainer-nht" block="rates_p1_em" fallback="additional financing" /></em>{" "}
                  <CmsText page="explainer-nht" block="rates_p1_post" fallback="provided by the commercial lender is charged at that lender's own mortgage rate." />
                </p>
                <p style={{ marginTop: "1rem" }}><CmsText page="explainer-nht" block="rates_p2" fallback="This distinction is important because it allows contributors to retain the value of their NHT benefit while accessing larger amounts of financing where necessary." /></p>
              </div>
            </section>

            {/* Section: Process */}
            <section id="process" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="process_h2" fallback="The Typical Application Process" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                  {[
                    { n: 1, t: "Request your NHT Eligibility Letter", b: "Apply through the NHT online portal. This confirms your loan entitlement, applicable interest rate and repayment period." },
                    { n: 2, t: "Select a suitable property", b: "Submit the mortgage application together with proof of income, identification, contribution history and property documentation." },
                    { n: 3, t: "Lender assessments", b: "The lender conducts affordability and credit assessments before issuing a mortgage commitment if approved." },
                    { n: 4, t: "Legal due diligence", b: "Your attorney investigates title, reviews the Agreement for Sale and satisfies lender requirements." },
                    { n: 5, t: "Execute & complete", b: "Mortgage documents are signed, security is registered against the title and purchase funds are released." },
                  ].map(s => (
                    <div key={s.n} style={{ display: "flex", gap: "1rem", padding: "1rem 1.2rem", background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
                      <span style={{ background: "var(--gold)", color: "#fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem", fontWeight: 800, flexShrink: 0 }}>{s.n}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#102a1e", marginBottom: ".25rem" }}>
                          <CmsText page="explainer-nht" block={`process_${String(s.n).padStart(2, "0")}_title`} fallback={s.t} />
                        </div>
                        <div style={{ fontSize: ".95rem" }}>
                          <CmsText page="explainer-nht" block={`process_${String(s.n).padStart(2, "0")}_body`} fallback={s.b} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section: Legal */}
            <section id="legal" style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem,2.2vw,1.9rem)", color: "#102a1e", margin: "0 0 1rem" }}>
                <CmsText page="explainer-nht" block="legal_h2" fallback="Why Legal Advice Matters" />
              </h2>
              <div style={{ color: "#48524d", lineHeight: 1.8, fontSize: "1rem" }}>
                <p><CmsText page="explainer-nht" block="legal_p1" fallback="Obtaining mortgage approval is only one part of purchasing property. A purchaser should always retain an experienced conveyancing attorney to investigate title, review the Agreement for Sale, identify legal risks, satisfy lender requirements and ensure the transfer of ownership is completed correctly." /></p>
                <p style={{ marginTop: "1rem" }}><CmsText page="explainer-nht" block="legal_p2" fallback="Many of the most expensive mistakes in property transactions arise not from financing issues but from defects in title, restrictive covenants, planning breaches or contractual provisions that are overlooked before closing." /></p>
                <p style={{ marginTop: "1rem" }}><CmsText page="explainer-nht" block="legal_p3" fallback="Before signing an Agreement for Sale or paying a deposit, prospective purchasers should ensure they fully understand both their financing options and the legal implications of the transaction. A carefully planned purchase is often the first step toward secure and successful homeownership." /></p>
              </div>
            </section>

            {/* CTA */}
            <section style={{ background: "#102a1e", borderRadius: 20, padding: "2.5rem", color: "#fff" }}>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.7rem", margin: "0 0 .8rem", color: "#fff" }}>
                <CmsText page="explainer-nht" block="cta_h2" fallback="Ready to plan your purchase?" />
              </h2>
              <p style={{ lineHeight: 1.7, color: "rgba(255,255,255,.82)", margin: "0 0 1.5rem" }}>
                <CmsText page="explainer-nht" block="cta_para" fallback="Book a consultation with Ferguson Law – we'll review your NHT eligibility, explain your financing options and handle the legal side so your transaction closes cleanly." />
              </p>
              <div style={{ display: "flex", gap: ".9rem", flexWrap: "wrap" }}>
                <BookButton className="btn btn-gold"><CmsText page="explainer-nht" block="cta_btn" fallback="Book a consultation –" /></BookButton>
                <Link href="/explainers" className="btn btn-ghost-light"><CmsText page="explainer-nht" block="cta_back_link" fallback="Back to Explainers" /></Link>
              </div>
            </section>

          </article>

          {/* –– Sidebar TOC –– */}
          <aside style={{ position: "sticky", top: "5rem" }}>
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "1.4rem 1.5rem" }}>
              <div style={{ fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, marginBottom: ".9rem" }}>
                <CmsText page="explainer-nht" block="toc_heading" fallback="In this explainer" />
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: ".1rem" }}>
                {TOC.map(t => (
                  <a key={t.id} href={`#${t.id}`} style={{ display: "block", padding: ".45rem .5rem", fontSize: ".9rem", color: "#48524d", textDecoration: "none", borderRadius: 7, lineHeight: 1.4 }}>
                    <CmsText page="explainer-nht" block={`toc_${t.id}_label`} fallback={t.label} />
                  </a>
                ))}
              </nav>
            </div>
          </aside>

        </div>
      </main>

      <Footer />

      <style>{`
        @media(max-width:700px){
          main > div { grid-template-columns: 1fr !important; }
          aside { display: none; }
        }
      `}</style>
    </BookingProvider>
  );
}