import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Policy — Ferguson Law" };

export default function PrivacyPage() {
  return (
    <div className="dir-wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 760 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gold-deep)", fontWeight: 700, marginBottom: 8 }}>
          Ferguson Law
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(24px,4vw,36px)", color: "var(--ink)", marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Last updated: July 2026</p>
      </div>

      <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)", display: "flex", flexDirection: "column", gap: 28 }}>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>1. Who We Are</h2>
          <p>Ferguson Law is a licensed law firm operating in Jamaica. We are the data controller responsible for the personal information you provide when using our website and client portal at fergusonlawja.com.</p>
          <p style={{ marginTop: 10 }}>Contact us at <a href={`mailto:${SITE.email}`} style={{ color: "var(--ink)", fontWeight: 600 }}>{SITE.email}</a> with any privacy-related enquiries.</p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>2. Information We Collect</h2>
          <p>We collect and process the following categories of personal information:</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>Account information:</strong> Name, email address, and password when you register on the Portal.</li>
            <li><strong>Identity and KYC information:</strong> Full legal name, date of birth, nationality, residential address, government-issued ID type and number, source of funds, and Politically Exposed Person (PEP) status, as required by law.</li>
            <li><strong>Matter information:</strong> Documents, messages, and communications relating to your legal matter.</li>
            <li><strong>Payment information:</strong> Payment amounts, method, reference numbers, and receipt records. We do not store card numbers or banking credentials.</li>
            <li><strong>Usage information:</strong> Log data, browser type, and IP address collected automatically when you use the Portal.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>3. How We Use Your Information</h2>
          <p>We use your personal information for the following purposes:</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>To provide legal services under your retainer agreement</li>
            <li>To verify your identity and comply with anti-money laundering obligations under the Proceeds of Crime Act</li>
            <li>To communicate with you about your matter via the Portal and by email</li>
            <li>To process and record payments</li>
            <li>To maintain records as required by law and professional standards</li>
            <li>To operate and improve the Portal</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>4. Legal Basis for Processing</h2>
          <p>We process your personal information on the following legal bases:</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>Contract:</strong> Processing necessary to deliver the legal services you have engaged us for.</li>
            <li><strong>Legal obligation:</strong> Processing required under Jamaican law, including AML/CFT regulations, professional conduct rules, and record-keeping requirements.</li>
            <li><strong>Consent:</strong> Where you have provided explicit consent, such as at account registration. You may withdraw consent at any time, though this will not affect processing already undertaken.</li>
            <li><strong>Legitimate interests:</strong> Operating and securing the Portal and communicating with you about your matter.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>5. Sharing Your Information</h2>
          <p>We do not sell your personal information. We may share it in the following limited circumstances:</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li><strong>Service providers:</strong> We use Supabase (database and authentication) and Resend (transactional email). These providers process data on our behalf under data processing agreements.</li>
            <li><strong>Legal requirements:</strong> Where required by law, court order, or regulatory authority.</li>
            <li><strong>Professional obligations:</strong> Where disclosure is necessary to provide your legal services, such as to counterparties, financial institutions, or the National Land Agency in the course of a property transaction.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>6. Data Retention</h2>
          <p>We retain your personal information for as long as necessary to provide legal services and to comply with our legal and professional obligations. In Jamaica, solicitors are generally required to retain client files for a minimum of seven (7) years after the conclusion of a matter. KYC records are retained for a minimum of five (5) years as required under AML legislation.</p>
          <p style={{ marginTop: 10 }}>Where data is no longer required, it is securely deleted or anonymised.</p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>7. Data Security</h2>
          <p>We take the security of your personal information seriously. The Portal uses encrypted connections (HTTPS), and your data is stored on secured servers provided by Supabase. Access to client data within the firm is restricted to authorised staff only.</p>
          <p style={{ marginTop: 10 }}>No system is completely secure. If you believe your account has been compromised, contact us immediately at <a href={`mailto:${SITE.email}`} style={{ color: "var(--ink)" }}>{SITE.email}</a>.</p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>8. Your Rights</h2>
          <p>Subject to applicable law, you have the right to:</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your information, where we are not legally required to retain it</li>
            <li>Withdraw consent where processing is based on consent</li>
            <li>Object to processing based on legitimate interests</li>
          </ul>
          <p style={{ marginTop: 10 }}>To exercise any of these rights, contact us at <a href={`mailto:${SITE.email}`} style={{ color: "var(--ink)", fontWeight: 600 }}>{SITE.email}</a>. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>9. Cookies and Tracking</h2>
          <p>The Portal uses essential session cookies to maintain your login state. We do not use advertising cookies or third-party tracking pixels. Usage data (IP address, browser type, page visits) is collected in server logs for security and operational purposes only.</p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Material changes will be communicated to you by email or through the Portal. Continued use of the Portal after a change is posted constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)", marginBottom: 10 }}>11. Contact</h2>
          <p>For any privacy-related questions or to exercise your rights:</p>
          <p style={{ marginTop: 10 }}>
            <strong>Ferguson Law</strong><br />
            <a href={`mailto:${SITE.email}`} style={{ color: "var(--ink)" }}>{SITE.email}</a><br />
            {SITE.whatsappDisplay}
          </p>
        </section>

      </div>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/terms" style={{ color: "var(--ink)", fontWeight: 600, fontSize: 14 }}>Terms of Service →</Link>
        <Link href="/" style={{ color: "var(--muted)", fontSize: 14 }}>← Back to Ferguson Law</Link>
      </div>
    </div>
  );
}
