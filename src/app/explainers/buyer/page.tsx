import type { Metadata } from "next";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import { waLink } from "@/lib/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why Every Jamaican Property Buyer Needs an Attorney | H.O.M.E.™ by Ferguson Law",
  description: "Why every Jamaican property buyer needs an attorney – title searches, fraud protection, contracts and protecting your down payment.",
};

const FRAUD = [
  { t: "Identity Fraud", d: "Someone impersonates the true owner using forged identification." },
  { t: "Double Selling", d: "The same property is sold to multiple purchasers." },
  { t: "Phantom Developments", d: "Developers collect down payments for projects that never receive approvals or financing." },
  { t: "Defective Title", d: "Family land disputes, missing beneficiaries or unresolved ownership issues surface years later." },
  { t: "Hidden Financial Obligations", d: "Undisclosed mortgages, liens or judgments become expensive problems after purchase." },
];

const COMPARE = [
  ["Title problems surface after you've already paid", "Official NLA title search before any money moves"],
  ["Your down payment is handed straight to the vendor", "Funds held safely in an attorney's client account"],
  ["Exposure to fraud and double-selling", "Seller and property independently verified"],
  ["Buying into an unapproved development", "Subdivision, NEPA and building approvals confirmed"],
  ["Years of delay before you hold title", "Transaction managed through to a registered title"],
];

const WarnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17.3v.2" />
  </svg>
);
const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export default function GuidePage() {
  return (
    <BookingProvider>
      <Reveal />
      <Nav />
      <article className="section guide-article">
        <div className="wrap g-wrap">
          <Link href="/explainers" className="g-back">™ All guides</Link>
          <span className="eyebrow">H.O.M.E.™ by Ferguson Law – Buyer Explainer</span>
          <h1 className="g-h1">Why Every Jamaican Property Buyer Needs an Attorney</h1>
          <p className="g-sub">Your Biggest Investment Deserves Your Strongest Protection</p>

          <p className="g-lead">Buying property is one of the largest financial commitments most people will ever make. Whether you are purchasing your first home, investing in real estate, or buying from overseas, a qualified Jamaican Attorney-at-Law is your strongest safeguard against costly mistakes, fraud and unnecessary delays.</p>
          <p>Many property transactions appear straightforward–until something goes wrong. A missing title, an undisclosed mortgage, an unapproved development or a poorly drafted agreement can cost purchasers millions of dollars and years of litigation.</p>
          <p>An attorney&apos;s role is not simply to prepare documents. Your attorney manages legal risk, protects your investment and guides your transaction from contract to registration.</p>

          <h2 className="g-h2">Verifying That the Property Can Be Sold</h2>
          <p>Before you commit a single dollar, your attorney confirms that the seller has the legal right to sell the property.</p>
          <p className="g-leadin">This includes:</p>
          <ul className="g-list">
            <li>Conducting an official title search at the National Land Agency (NLA)</li>
            <li>Confirming ownership</li>
            <li>Identifying mortgages, caveats, liens and judgments</li>
            <li>Verifying outstanding property taxes</li>
            <li>Reviewing strata records where applicable</li>
          </ul>
          <div className="g-call g-call--warn">
            <WarnIcon />
            <p>If a seller says <b>&quot;the title is still being processed,&quot;</b> treat it as a warning sign. <b>Never pay a down payment</b> until your attorney independently verifies the legal status of the property.</p>
          </div>

          <h2 className="g-h2">Protecting You from Property Fraud</h2>
          <p>Property fraud continues to affect buyers in Jamaica. An experienced attorney helps protect you against:</p>
          <div className="g-tiles">
            {FRAUD.map((f) => (
              <div className="g-tile" key={f.t}>
                <h4>{f.t}</h4>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
          <p>Early legal investigation is far less expensive than correcting these problems after closing.</p>

          <h2 className="g-h2">Ensuring the Development Is Lawful</h2>
          <p>Purchasing in a new development requires more than trusting attractive brochures and sales presentations.</p>
          <p className="g-leadin">Your attorney confirms that the development has:</p>
          <ul className="g-list">
            <li>Registered ownership</li>
            <li>Proper subdivision approval</li>
            <li>NEPA approvals where required</li>
            <li>Municipal Corporation approvals</li>
            <li>Valid building permits</li>
          </ul>
          <p>Without these approvals, obtaining your registered title may become difficult–or impossible.</p>

          <h2 className="g-h2">Negotiating a Contract That Protects You</h2>
          <p>The Agreement for Sale determines what happens if things go wrong. Many purchasers sign contracts prepared entirely for the developer&apos;s benefit.</p>
          <p className="g-leadin">Your attorney negotiates critical provisions such as:</p>
          <ul className="g-list">
            <li>Fixed completion dates</li>
            <li>Compensation for construction delays</li>
            <li>Safe handling of down payments</li>
            <li>Detailed specifications of finishes and fixtures</li>
            <li>Defect liability periods</li>
            <li>Clear timelines for title transfer</li>
            <li>Refund rights if the developer defaults</li>
          </ul>
          <p>Well-drafted contracts reduce uncertainty and prevent disputes before they arise.</p>

          <h2 className="g-h2">Protecting Your Down payment</h2>
          <p>Your down payment may represent years of savings.</p>
          <div className="g-call g-call--key">
            <KeyIcon />
            <p>Rather than paying funds directly to a developer or vendor, your attorney can ensure monies are <b>held securely in an attorney&apos;s client account</b> and released only when contractual conditions have been satisfied. This significantly reduces financial risk.</p>
          </div>

          <h2 className="g-h2">Helping You Meet Legal and Banking Requirements</h2>
          <p>Property purchases require compliance with several legal and regulatory requirements.</p>
          <p className="g-leadin">Your attorney assists with:</p>
          <ul className="g-list">
            <li>Obtaining your Jamaican Tax Registration Number (TRN)</li>
            <li>Anti-Money Laundering (AML) compliance</li>
            <li>Proceeds of Crime Act (POCA) requirements</li>
            <li>Source-of-funds documentation</li>
            <li>Company searches at the Companies Office of Jamaica</li>
            <li>Coordinating with your bank, mortgage lender and the National Housing Trust (NHT), where applicable</li>
          </ul>
          <p>Proper preparation prevents unnecessary delays during financing and closing.</p>

          <h2 className="g-h2">Identifying Dangerous Contract Clauses</h2>
          <p>Some agreements contain provisions that heavily favour the vendor.</p>
          <p className="g-leadin">Examples include:</p>
          <ul className="g-list">
            <li>Excessive forfeiture of down payments</li>
            <li>&quot;Time is of the essence&quot; clauses with severe penalties</li>
            <li>Vague completion dates</li>
            <li>Incomplete fixtures and fittings schedules</li>
            <li>No requirement for vacant possession</li>
          </ul>
          <p>Your attorney explains these clauses, negotiates fairer terms and ensures you understand the legal consequences before signing.</p>

          <h2 className="g-h2">Managing the Transaction from Beginning to End</h2>
          <p className="g-leadin">Your attorney coordinates the entire legal process, including:</p>
          <ul className="g-list">
            <li>Reviewing the Agreement for Sale</li>
            <li>Conducting due diligence</li>
            <li>Liaising with banks and mortgage providers</li>
            <li>Preparing transfer documents</li>
            <li>Paying transfer taxes and stamp duty</li>
            <li>Registering the transfer at the National Land Agency</li>
            <li>Delivering your registered title</li>
          </ul>
          <p>This allows you to focus on your move while knowing every legal requirement is being properly handled.</p>

          <h2 className="g-h2">The Cost of Not Using an Attorney</h2>
          <p>Attempting to save legal fees can become the most expensive decision in a property transaction. A single mistake can cost substantially more than the legal fees that could have prevented it.</p>
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Going it alone</th>
                  <th>With Ferguson Law</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([no, yes]) => (
                  <tr key={no}>
                    <td>{no}</td>
                    <td>{yes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="g-green">
            <h3>Your Attorney Is Your Advocate</h3>
            <div className="stack">
              <span>Every seller has someone protecting their interests.</span>
              <span>Every developer has lawyers.</span>
              <span>Every bank has lawyers.</span>
              <span className="pin">You should too.</span>
            </div>
            <p>An experienced conveyancing attorney ensures that your interests–not someone else&apos;s–remain protected throughout every stage of the transaction.</p>
          </div>

          <p className="g-kick">Before you sign. Before you pay. Speak with your attorney.</p>
          <p>The right legal advice today can save years of stress and substantial financial loss tomorrow.</p>

          <div className="g-cta">
            <a className="btn btn-gold" href={waLink()} target="_blank" rel="noopener">Speak with Ferguson Law</a>
            <Link className="btn btn-ghost" href="/explainers">More Explainers</Link>
          </div>
        </div>
      </article>
      <p style={{ fontSize: ".75rem", color: "var(--muted)", textAlign: "center", padding: "1rem 1.5rem 0", borderTop: "1px solid var(--line)", marginTop: "2rem" }}>
        H.O.M.E.™ Buyer&apos;s Guide. Informational only, not legal advice. © Ferguson Law. All rights reserved.
      </p>
      <Footer />
    </BookingProvider>
  );
}
