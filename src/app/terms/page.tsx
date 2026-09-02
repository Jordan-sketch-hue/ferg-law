import Link from "next/link";
import { SITE } from "@/lib/site";
import React from "react";

export const metadata = { title: "Terms of Service — Ferguson Law" };

export default function TermsPage() {
  const S = {
    page: { maxWidth: 780, margin: "0 auto", padding: "0 24px 80px", paddingTop: 0 } as React.CSSProperties,
    hero: { background: "var(--ink,#10211c)", padding: "52px 24px 44px", marginBottom: 48 } as React.CSSProperties,
    heroInner: { maxWidth: 780, margin: "0 auto" },
    eyebrow: { fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "var(--gold-deep,#c9a86a)", fontWeight: 700, marginBottom: 10 },
    h1: { fontFamily: "var(--serif)", fontSize: "clamp(26px,4vw,38px)", color: "#fff", marginBottom: 8, lineHeight: 1.2 },
    meta: { fontSize: 13, color: "rgba(255,255,255,.45)" },
    body: { fontSize: 15.5, lineHeight: 1.85, color: "var(--text)", display: "flex", flexDirection: "column" as const, gap: 36 },
    h2: { fontFamily: "var(--serif)", fontSize: 20, color: "var(--ink)", marginBottom: 12, fontWeight: 700 },
    ul: { marginTop: 10, paddingLeft: 22, display: "flex", flexDirection: "column" as const, gap: 8 },
    footer: { marginTop: 48, paddingTop: 24, borderTop: "2px solid var(--line,#e8e2d6)", display: "flex", gap: 16, flexWrap: "wrap" as const },
  };

  return (
    <>
      <div style={S.hero}>
        <div style={S.heroInner}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, color:"rgba(255,255,255,.55)", marginBottom:20, textDecoration:"none" }}>← Back to Ferguson Law</Link>
          <div style={S.eyebrow}>Ferguson Law</div>
          <h1 style={S.h1}>Terms of Service</h1>
          <p style={S.meta}>Last updated: July 2026</p>
        </div>
      </div>
      <div style={S.page}>
        <div style={S.body}>

          <section>
            <h2 style={S.h2}>1. About Ferguson Law</h2>
            <p>Ferguson Law is a licensed law firm operating in Jamaica. These Terms of Service govern your access to and use of the Ferguson Law client portal at fergusonlawja.com (the "Portal") and any services provided through it.</p>
            <p style={{ marginTop: 10 }}>By creating an account and using the Portal, you agree to be bound by these Terms. If you do not agree, do not create an account or use the Portal.</p>
          </section>

          <section>
            <h2 style={S.h2}>2. Client Portal Access</h2>
            <p>The Portal is made available to existing and prospective clients of Ferguson Law for the purpose of managing legal matters, communicating with the firm, submitting required documentation, and tracking the progress of your matter.</p>
            <p style={{ marginTop: 10 }}>Access to the Portal does not by itself constitute the establishment of a solicitor-client relationship. A formal retainer agreement must be signed before Ferguson Law can act on your behalf.</p>
          </section>

          <section>
            <h2 style={S.h2}>3. Account Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must not share your password or permit any other person to access the Portal using your account. You agree to notify Ferguson Law immediately at <a href={`mailto:${SITE.email}`} style={{ color: "var(--ink)", fontWeight: 600 }}>{SITE.email}</a> if you become aware of any unauthorised use of your account.</p>
            <p style={{ marginTop: 10 }}>You must provide accurate, current, and complete information when registering and when submitting any documentation, including KYC (Know Your Customer) information. Providing false or misleading information is a breach of these Terms and may have legal consequences.</p>
          </section>

          <section>
            <h2 style={S.h2}>4. Know Your Customer (KYC)</h2>
            <p>Ferguson Law is required by Jamaican law, including the Proceeds of Crime Act and applicable anti-money laundering regulations, to verify the identity of all clients before providing legal services. By using the Portal, you agree to provide complete and accurate KYC information, including valid government-issued identification, proof of address, source of funds, and Politically Exposed Person (PEP) status as requested.</p>
            <p style={{ marginTop: 10 }}>Failure to complete KYC verification may prevent Ferguson Law from acting on your matter.</p>
          </section>

          <section>
            <h2 style={S.h2}>5. Communications</h2>
            <p>Messages sent through the Portal are for general communication relating to your matter. They do not constitute legal advice unless explicitly confirmed in writing by a solicitor at Ferguson Law. Do not send privileged or highly sensitive information via the Portal messaging feature without first consulting with your assigned solicitor.</p>
          </section>

          <section>
            <h2 style={S.h2}>6. Payments</h2>
            <p>All fees and payments are subject to the retainer agreement between you and Ferguson Law. Payment records displayed in the Portal are for your reference only. Formal receipts are issued separately. Ferguson Law reserves the right to suspend Portal access and cease work on a matter where fees are outstanding.</p>
          </section>

          <section>
            <h2 style={S.h2}>7. Intellectual Property</h2>
            <p>All content on the Portal, including text, branding, layout, and software, is the property of Ferguson Law and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works from any content on the Portal without prior written consent from Ferguson Law.</p>
          </section>

          <section>
            <h2 style={S.h2}>8. Limitation of Liability</h2>
            <p>The Portal is provided on an "as is" basis. Ferguson Law makes no warranties as to the uninterrupted availability of the Portal. To the maximum extent permitted by law, Ferguson Law shall not be liable for any indirect, incidental, or consequential loss arising from your use of the Portal, including loss of data or interruption to services.</p>
            <p style={{ marginTop: 10 }}>Nothing in these Terms limits Ferguson Law's liability for professional negligence in the provision of legal services, which is governed separately by your retainer agreement and applicable professional standards.</p>
          </section>

          <section>
            <h2 style={S.h2}>9. Termination</h2>
            <p>Ferguson Law may suspend or terminate your Portal access at any time, including where the solicitor-client relationship has ended, where you have breached these Terms, or for operational reasons. You may close your account at any time by contacting us.</p>
          </section>

          <section>
            <h2 style={S.h2}>10. Governing Law &amp; Jurisdiction</h2>
            <p>These Terms are governed by the laws of Jamaica. Any disputes arising from your use of the Portal shall be subject to the jurisdiction of the courts of Jamaica.</p>
            <p style={{ marginTop: 10 }}>If you access the Portal from outside Jamaica, nothing in these Terms overrides any statutory rights you are entitled to under the mandatory laws of your country of residence. In particular:</p>
            <ul style={S.ul}>
              <li><strong>EU / UK consumers:</strong> If you are a consumer located in the European Union or the United Kingdom, you retain all statutory rights granted under applicable EU or UK consumer protection legislation, including the right to seek redress from your local courts.</li>
              <li><strong>California residents:</strong> Your rights under the CCPA/CPRA are not affected by these Terms. We do not sell your personal information.</li>
              <li><strong>All international clients:</strong> Where our Portal facilitates legal services governed by Jamaican law (e.g., a Jamaican property transaction), Jamaican law will apply to that underlying matter regardless of your country of residence.</li>
            </ul>
          </section>

          <section>
            <h2 style={S.h2}>11. International Use</h2>
            <p>The Portal is operated from Jamaica. If you access it from outside Jamaica — including from the United States, South Africa, the United Arab Emirates, India, Qatar, Singapore, or the European Union — you do so at your own initiative and are responsible for compliance with applicable local laws to the extent they apply to you.</p>
            <p style={{ marginTop: 10 }}>We make no representation that the Portal is appropriate or available in all jurisdictions. We do not discriminate against any user based on their country of residence.</p>
          </section>

          <section>
            <h2 style={S.h2}>12. Changes to These Terms</h2>
            <p>Ferguson Law may update these Terms from time to time. We will notify you of material changes via email or through the Portal. Continued use of the Portal after changes are posted constitutes your acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 style={S.h2}>13. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <p style={{ marginTop: 10 }}>
              <strong>Ferguson Law</strong><br />
              <a href={`mailto:${SITE.email}`} style={{ color: "var(--ink)" }}>{SITE.email}</a><br />
              {SITE.whatsappDisplay}
            </p>
          </section>

        </div>

        <div style={S.footer}>
          <Link href="/privacy" style={{ color: "var(--ink)", fontWeight: 600, fontSize: 14 }}>Privacy Policy →</Link>
          <Link href="/" style={{ color: "var(--muted)", fontSize: 14 }}>← Back to Ferguson Law</Link>
        </div>
      </div>
    </>
  );
}
