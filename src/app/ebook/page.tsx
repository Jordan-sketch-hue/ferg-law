"use client";

import { useState } from "react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { BookingProvider } from "@/components/site/BookingProvider";

const PDF_URL = "https://home.fergusonlawja.com/HOME-Guide-Ferguson-Law.pdf";

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  timeframe: string;
  purchase_location: string;
  financing_type: string;
  first_time_buyer: string;
  budget_band: string;
  consent: boolean;
}

const EMPTY: FormData = {
  full_name: "",
  email: "",
  phone: "",
  country: "",
  timeframe: "",
  purchase_location: "",
  financing_type: "",
  first_time_buyer: "",
  budget_band: "",
  consent: false,
};

function fmt(v: string | boolean) { return String(v); }

export default function EbookPage() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  function set(key: keyof FormData, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) { setError("Please confirm your consent to continue."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/ebook/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "fergusonlawja-ebook" }),
      });
      const data = await res.json();
      if (data.ok && data.pdf_url) {
        setPdfUrl(data.pdf_url);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px", fontSize: ".9rem", border: "1.5px solid #e2ddd4", borderRadius: 8, outline: "none", background: "#faf9f7", boxSizing: "border-box", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#69736d", marginBottom: 5 };
  const radio: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: ".9rem", cursor: "pointer" };

  return (
    <BookingProvider>
      <Nav />
      <main style={{ background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)", minHeight: "100vh", paddingTop: "5rem", paddingBottom: "4rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "start" }}>

          {/* Left — cover + blurb */}
          <div style={{ color: "#fff" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#c9a86a", marginBottom: "1rem" }}>
              Free Download · Ferguson Law
            </p>
            <h1 style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 600, lineHeight: 1.15, marginBottom: "1.2rem", color: "#fff" }}>
              The H.O.M.E.® Jamaica Buyer&apos;s Guide
            </h1>
            <p style={{ color: "rgba(255,255,255,.75)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem", maxWidth: 420 }}>
              Every step from readiness to registered title — plain English, no jargon. NHT, stamp duty, transfer tax, diaspora playbook and more.
            </p>
            <div style={{ width: "100%", maxWidth: 340, borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,.5)", background: "linear-gradient(145deg,#1a3828 0%,#10211c 100%)", border: "1px solid rgba(201,168,106,.25)", padding: "2.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div style={{ width: 48, height: 4, background: "#c9a86a", borderRadius: 2 }} />
              <p style={{ color: "#c9a86a", fontSize: ".65rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", margin: 0 }}>H.O.M.E.® Series · Ferguson Law</p>
              <p style={{ color: "#fff", fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.35rem", fontWeight: 600, lineHeight: 1.3, margin: 0 }}>The Jamaica Buyer&apos;s Guide</p>
              <p style={{ color: "rgba(255,255,255,.55)", fontSize: ".8rem", lineHeight: 1.65, margin: 0 }}>NHT · Stamp Duty · Transfer Tax · Diaspora Playbook · Title Registration</p>
              <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid rgba(201,168,106,.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,255,255,.4)", fontSize: ".7rem" }}>Ferguson Law Jamaica</span>
                <span style={{ background: "#c9a86a", color: "#10211c", fontSize: ".65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>FREE</span>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "2.5rem 2rem", boxShadow: "0 24px 64px rgba(0,0,0,.25)" }}>
            {pdfUrl ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <svg style={{ width: 56, height: 56, color: "#16a34a", margin: "0 auto 1rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                <h2 style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.6rem", marginBottom: ".5rem", color: "#10211c" }}>You&apos;re all set!</h2>
                <p style={{ color: "#69736d", fontSize: ".9rem", marginBottom: "1.8rem" }}>Your free H.O.M.E.® Buyer&apos;s Guide is ready.</p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", width: "100%", padding: "14px 0", background: "#c9a86a", color: "#10211c", fontWeight: 700, fontSize: ".95rem", borderRadius: 10, textAlign: "center", textDecoration: "none" }}
                >
                  Download PDF Guide
                </a>
                <p style={{ marginTop: "1.2rem", fontSize: ".78rem", color: "#aaa" }}>A Ferguson Law associate may reach out to assist with your home purchase journey.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ marginBottom: ".25rem" }}>
                  <span style={{ display: "inline-block", background: "#f0fdf4", color: "#16a34a", fontSize: ".72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 20, marginBottom: ".75rem" }}>Free Download</span>
                  <h2 style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.5rem", color: "#10211c", margin: 0 }}>Get the free guide</h2>
                  <p style={{ color: "#69736d", fontSize: ".85rem", marginTop: 6 }}>The complete Jamaica buyer&apos;s guide — every step from readiness to closing.</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lbl}>Full name *</label>
                    <input required style={inp} value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your full name" />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lbl}>Email address *</label>
                    <input required type="email" style={inp} value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@email.com" />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lbl}>Phone / WhatsApp</label>
                    <input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 876 000 0000" />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lbl}>Country of residence *</label>
                    <input required style={inp} value={form.country} onChange={e => set("country", e.target.value)} placeholder="e.g. Jamaica, USA, Canada, UK" />
                  </div>
                  <div>
                    <label style={lbl}>Purchase timeframe *</label>
                    <select required style={inp} value={form.timeframe} onChange={e => set("timeframe", e.target.value)}>
                      <option value="">Select…</option>
                      <option>Within 6 months</option>
                      <option>6–12 months</option>
                      <option>1–2 years</option>
                      <option>2+ years</option>
                      <option>Just exploring</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Purchase location *</label>
                    <select required style={inp} value={form.purchase_location} onChange={e => set("purchase_location", e.target.value)}>
                      <option value="">Select…</option>
                      <option>Jamaica</option>
                      <option>USA</option>
                      <option>Canada</option>
                      <option>UK</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lbl}>Budget band *</label>
                    <select required style={inp} value={form.budget_band} onChange={e => set("budget_band", e.target.value)}>
                      <option value="">Select…</option>
                      <option>Under J$10M</option>
                      <option>J$10M – J$20M</option>
                      <option>J$20M – J$40M</option>
                      <option>J$40M – J$80M</option>
                      <option>Over J$80M</option>
                      <option>USD — under US$100K</option>
                      <option>USD — US$100K–US$300K</option>
                      <option>USD — over US$300K</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={lbl}>Financing type *</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: 4 }}>
                    {["Cash", "Mortgage", "NHT", "Undecided"].map(opt => (
                      <label key={opt} style={radio}>
                        <input type="radio" name="financing_type" value={opt} checked={form.financing_type === opt} onChange={() => set("financing_type", opt)} required />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>First-time buyer? *</label>
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: 4 }}>
                    {["Yes", "No"].map(opt => (
                      <label key={opt} style={radio}>
                        <input type="radio" name="first_time_buyer" value={opt} checked={form.first_time_buyer === opt} onChange={() => set("first_time_buyer", opt)} required />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: ".82rem", color: "#555", cursor: "pointer" }}>
                  <input type="checkbox" style={{ marginTop: 2, flexShrink: 0 }} checked={form.consent} onChange={e => set("consent", e.target.checked)} />
                  I consent to Ferguson Law contacting me about my home purchase journey. *
                </label>

                {error && <p style={{ color: "#dc2626", fontSize: ".82rem", margin: 0 }}>{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ width: "100%", padding: "14px 0", background: submitting ? "#e2d5b0" : "#c9a86a", color: "#10211c", fontWeight: 700, fontSize: ".95rem", borderRadius: 10, border: "none", cursor: submitting ? "default" : "pointer" }}
                >
                  {submitting ? "Submitting…" : "Get the free guide"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </BookingProvider>
  );
}
