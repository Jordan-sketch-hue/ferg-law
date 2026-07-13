import type { Metadata } from "next";
import { waLink } from "@/lib/site";
import { BookingProvider } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why Every Property Seller in Jamaica Needs an Attorney | H.O.M.E.™ by Ferguson Law",
  description: "Why every property seller in Jamaica needs an attorney – avoiding failed sales, protecting your proceeds and completing safely.",
};

const COMPARE = [
  ["Legal problems surface only after a buyer walks away", "Issues found and resolved before you list"],
  ["Down payments accepted directly, disputes follow", "Down payment held and released per the Agreement"],
  ["Purchase money released before funds clear", "Funds verified before any title document moves"],
  ["Exposed to claims long after completion", "Clear documentation that limits future disputes"],
  ["Mortgage discharge mishandled", "Lender coordinated, discharge properly registered"],
];

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const WarnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17.3v.2" />
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
          <span className="eyebrow">H.O.M.E.™ by Ferguson Law – Seller Explainer</span>
          <h1 className="g-h1">Why Every Property Seller in Jamaica Needs an Attorney</h1>
          <p className="g-sub">Selling Property Is More Than Finding a Buyer</p>

          <p className="g-lead">Selling your home, land or investment property is one of the most significant financial transactions you will ever undertake.</p>
          <p>Many sellers believe their job ends once a buyer is found. In reality, the legal process has only just begun.</p>
          <p>An experienced Jamaican Attorney-at-Law protects your interests, ensures the sale proceeds smoothly, and helps you avoid costly mistakes that could delay completion–or even expose you to lawsuits after the sale. Your attorney works to maximise your protection while ensuring the transaction closes efficiently.</p>

          <h2 className="g-h2">Confirming You Are Ready to Sell</h2>
          <p>Before your property is placed under contract, your attorney reviews its legal status to identify potential issues before a buyer discovers them.</p>
          <p className="g-leadin">This includes:</p>
          <ul className="g-list">
            <li>Confirming ownership</li>
            <li>Reviewing your Registered Title</li>
            <li>Identifying existing mortgages</li>
            <li>Checking for caveats or restrictions</li>
            <li>Verifying property tax status</li>
            <li>Reviewing strata obligations where applicable</li>
          </ul>
          <p>Resolving these issues early avoids unnecessary delays and strengthens buyer confidence.</p>

          <h2 className="g-h2">Avoiding Failed Sales</h2>
          <p>Many property transactions collapse because legal problems are discovered too late.</p>
          <p className="g-leadin">Common causes include:</p>
          <ul className="g-list cols2">
            <li>Missing title documents</li>
            <li>Outstanding mortgages</li>
            <li>Family ownership disputes</li>
            <li>Boundary discrepancies</li>
            <li>Unpaid property taxes</li>
            <li>Strata maintenance arrears</li>
            <li>Probate or estate issues</li>
          </ul>
          <p>Your attorney identifies these issues before they become deal breakers.</p>

          <h2 className="g-h2">Negotiating a Contract That Protects You</h2>
          <p>The Agreement for Sale should protect both parties–not just the purchaser.</p>
          <p className="g-leadin">Your attorney ensures the agreement contains fair provisions relating to:</p>
          <ul className="g-list cols2">
            <li>Down payment amounts</li>
            <li>Completion dates</li>
            <li>Default by the purchaser</li>
            <li>Extensions of time</li>
            <li>Interest for delayed completion</li>
            <li>Conditions allowing termination</li>
            <li>Allocation of closing costs</li>
            <li>Risk prior to completion</li>
          </ul>
          <p>A properly drafted contract significantly reduces the likelihood of disputes.</p>

          <h2 className="g-h2">Protecting Your Down payment</h2>
          <p>The purchaser&apos;s down payment is intended to demonstrate commitment–not create unnecessary disputes.</p>
          <p className="g-leadin">Your attorney ensures:</p>
          <ul className="g-list">
            <li>Down payments are securely held in an attorney&apos;s client account</li>
            <li>Funds are released only in accordance with the Agreement</li>
            <li>Down payment forfeiture provisions are fair and enforceable</li>
            <li>The transaction proceeds according to agreed milestones</li>
          </ul>
          <p>This protects both seller and purchaser throughout the transaction.</p>

          <h2 className="g-h2">Ensuring You Receive Your Purchase Money Safely</h2>
          <p>Receiving the purchase price is one of the most critical stages of the transaction.</p>
          <p className="g-leadin">Your attorney coordinates with:</p>
          <ul className="g-list cols2">
            <li>Mortgage lenders</li>
            <li>Purchaser&apos;s attorneys</li>
            <li>Financial institutions</li>
            <li>Real estate agents</li>
          </ul>
          <div className="g-call g-call--key">
            <KeyIcon />
            <p>Funds are <b>verified before title documents are released</b>, reducing the risk of fraud or payment complications.</p>
          </div>

          <h2 className="g-h2">Satisfying Your Legal Obligations</h2>
          <p>Every property sale involves legal documentation and statutory compliance.</p>
          <p className="g-leadin">Your attorney assists with:</p>
          <ul className="g-list">
            <li>Preparing transfer documents</li>
            <li>Calculating Transfer Tax and Stamp Duty obligations</li>
            <li>Coordinating registration requirements</li>
            <li>Meeting Proceeds of Crime Act (POCA) obligations</li>
            <li>Anti-Money Laundering (AML) compliance</li>
            <li>Source-of-funds enquiries where applicable</li>
          </ul>
          <p>Proper compliance prevents unnecessary delays at closing.</p>

          <h2 className="g-h2">Managing Existing Mortgages</h2>
          <p className="g-leadin">If your property is mortgaged, your attorney works with your lender to:</p>
          <ul className="g-list">
            <li>Obtain mortgage payout statements</li>
            <li>Coordinate discharge of the mortgage</li>
            <li>Ensure loan proceeds are correctly applied</li>
            <li>Register the discharge after completion</li>
          </ul>
          <p>This ensures the purchaser receives good title while protecting your interests.</p>

          <h2 className="g-h2">Protecting You From Future Claims</h2>
          <p>A poorly managed transaction can expose sellers to legal claims long after completion.</p>
          <p className="g-leadin">Your attorney helps minimise the risk of disputes involving:</p>
          <ul className="g-list cols2">
            <li>Misrepresentation</li>
            <li>Boundary issues</li>
            <li>Fixtures and fittings</li>
            <li>Vacant possession</li>
            <li>Outstanding utility balances</li>
            <li>Strata obligations</li>
            <li>Contract interpretation</li>
          </ul>
          <p>Clear documentation today prevents expensive litigation tomorrow.</p>

          <h2 className="g-h2">Coordinating Everyone Involved</h2>
          <p>A successful sale requires multiple parties working together.</p>
          <p className="g-leadin">Your attorney coordinates communication between:</p>
          <ul className="g-list cols2">
            <li>Purchaser&apos;s attorney</li>
            <li>Mortgage institutions</li>
            <li>Real estate agents</li>
            <li>Surveyors</li>
            <li>Valuators</li>
            <li>Government agencies</li>
            <li>The National Land Agency</li>
          </ul>
          <p>This keeps the transaction moving toward completion.</p>

          <h2 className="g-h2">Completing the Sale Properly</h2>
          <p>Completion is much more than handing over the keys.</p>
          <p className="g-leadin">Your attorney ensures:</p>
          <ul className="g-list">
            <li>Purchase monies have been received</li>
            <li>Transfer documents are correctly executed</li>
            <li>Mortgage discharges are completed</li>
            <li>Statutory obligations are satisfied</li>
            <li>Registration documents are lodged promptly</li>
            <li>Your legal responsibilities end when they should</li>
          </ul>
          <p>A properly completed transaction provides certainty for both parties.</p>

          <h2 className="g-h2">Common Mistakes Sellers Make</h2>
          <div className="g-call g-call--warn">
            <WarnIcon />
            <div>
              <p className="g-leadin">Many sellers unintentionally expose themselves to unnecessary risk by:</p>
              <ul>
                <li>Signing contracts before obtaining legal advice</li>
                <li>Accepting down payments directly</li>
                <li>Promising completion dates they cannot meet</li>
                <li>Removing fixtures that were intended to remain</li>
                <li>Failing to disclose known issues</li>
                <li>Waiting until the last minute to engage an attorney</li>
              </ul>
            </div>
          </div>
          <p>Early legal advice is almost always less expensive than resolving disputes later.</p>

          <h2 className="g-h2">The Cost of Going It Alone</h2>
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Selling without an attorney</th>
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
            <h3>Your Attorney Is Your Strategic Adviser</h3>
            <div className="stack">
              <span>Selling property is not simply about transferring ownership.</span>
              <span className="pin">It is about protecting your investment, your proceeds and your legal position.</span>
            </div>
            <p>An experienced conveyancing attorney manages risk, anticipates problems before they arise and guides your transaction from listing to closing with confidence.</p>
          </div>

          <p className="g-kick">Before you accept an offer. Before you sign. Before you hand over the keys. Speak with your attorney.</p>
          <p>The right legal advice today helps ensure your sale is completed smoothly, your proceeds are protected and your future remains secure.</p>

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
