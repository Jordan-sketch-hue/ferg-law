"use client";
import { useState } from "react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";

const PERSONAS = [
  "A — Residential Buyer",
  "B — Residential Seller",
  "C — Diaspora Buyer",
  "D — Real Estate Professional (directory)",
  "E — Readiness Assessment",
  "F — Professional Listing",
  "G — Admin / Staff",
  "H — Finance Professional / Lender",
];

const ROLES = [
  "First-time buyer",
  "Experienced buyer / seller",
  "Real estate agent",
  "Banker / mortgage officer",
  "Surveyor / valuator",
  "Attorney",
  "Other",
];

const SITES = [
  "fergusonlawja.com",
  "fergusonlawja.com/admin (back office)",
];

const DEVICES = ["iOS (iPhone / Safari)", "Android (Chrome)", "Tablet", "Desktop / laptop", "Both iOS and Android"];

type CheckAnswer = "yes" | "no" | "partial" | "";
type CheckEntry = { answer: CheckAnswer; note: string };
type PersonaChecks = Record<string, CheckEntry>;

const PERSONA_QUESTIONS: Record<string, string[]> = {
  buyer: [
    "Did the chatbot give a clear, safe answer to your matter question — and remember the follow-up?",
    "Did you find the mortgage calculator, and was the result understandable and actionable?",
    "Was it obvious what your next step should be after using a buyer tool?",
    "Did the chatbot hand off to Ferguson Law smoothly, or did it feel generic?",
    "Was the consultation booking clear — service selection, fee, calendar, and confirmation?",
  ],
  seller: [
    "Did you find seller-specific guidance on what documents to prepare before selling?",
    "Was the chatbot able to address seller concerns — title, mortgage, boundary issues?",
    "Did the site make the sale timeline and next steps feel clear and manageable?",
    "Was it easy to find a relevant professional to contact from the seller's perspective?",
    "Was the consultation booking process straightforward for a seller?",
  ],
  lender: [
    "Did you find the professional directory and locate the finance or lender section?",
    "Could you locate or begin creating a professional profile or service listing?",
    "Was the terminology appropriate for a finance professional, not just buyer-focused?",
    "Did the chatbot answer lender-specific questions usefully?",
    "Did the partner or professional sign-up area feel complete and trustworthy?",
  ],
  pro: [
    "Did you find the professional directory and your relevant category?",
    "Was it clear how to list a service or profile as a professional?",
    "Did the site establish enough credibility for a professional referral relationship?",
    "Was it easy to contact Ferguson Law as a referring professional?",
  ],
  home: [
    "Was the readiness assessment easy to start and complete?",
    "Did the questions feel relevant to a Jamaican property buyer or seller?",
    "Were the results clear and did they suggest a useful next step?",
    "Did the overall experience feel seamless and connected throughout?",
  ],
};

const DEVICE_QUESTIONS: Record<string, string[]> = {
  ios: [
    "Did fonts render clearly at the correct size on your iPhone?",
    "Did any input fields cause the page to zoom unexpectedly when tapped?",
    "Were touch targets — buttons, links, form fields — large enough to tap comfortably?",
    "Did the site feel optimized for Safari on iOS overall?",
  ],
  android: [
    "Did the site feel native on Android Chrome?",
    "Were any layout elements cut off or misaligned on your screen size?",
    "Was scrolling smooth across all pages and sections?",
    "Did the mobile menu open and close correctly?",
  ],
};

function getPersonaKey(persona: string): string | null {
  if (persona.startsWith("A") || persona.startsWith("C")) return "buyer";
  if (persona.startsWith("B")) return "seller";
  if (persona.startsWith("H")) return "lender";
  if (persona.startsWith("D")) return "pro";
  if (persona.startsWith("E") || persona.startsWith("F")) return "home";
  return null;
}

function getDeviceKey(device: string): string | null {
  if (device.startsWith("iOS")) return "ios";
  if (device.startsWith("Android")) return "android";
  return null;
}

function buildChecksKey(label: string, prefix: string) {
  return `${prefix}::${label}`;
}

export default function TestingPage() {
  const [form, setForm] = useState({
    tester_name: "",
    tester_role: "",
    persona: "",
    site_tested: "",
    device_type: "",
    rating: 0,
    what_worked: "",
    what_didnt: "",
    suggestions: "",
    would_use: null as boolean | null,
  });
  const [checks, setChecks] = useState<PersonaChecks>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string | number | boolean | null) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setCheck(key: string, field: "answer" | "note", value: string) {
    setChecks(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { answer: "", note: "" }), [field]: value },
    }));
  }

  const personaKey = getPersonaKey(form.persona);
  const deviceKey = getDeviceKey(form.device_type);
  const personaQs = personaKey ? PERSONA_QUESTIONS[personaKey] ?? [] : [];
  const deviceQs = deviceKey ? DEVICE_QUESTIONS[deviceKey] ?? [] : [];
  const hasConditional = personaQs.length > 0 || deviceQs.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tester_name || !form.tester_role || !form.persona || !form.rating) {
      setError("Please fill in all required fields.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/testing/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, persona_checks: Object.keys(checks).length ? checks : null }),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Nav />
      <main style={{ minHeight: "100vh", background: "#faf9f6", paddingTop: 80 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>

          <div style={{ marginBottom: 12 }}>
            <a href="/test-guide" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, color: "#b8872a", textDecoration: "none",
            }}>
              Back to test guide
            </a>
          </div>

          <div style={{ marginBottom: 40 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#b8872a", textTransform: "uppercase" }}>
              Beta Testing
            </span>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", marginTop: 8, marginBottom: 8 }}>
              Tester Feedback
            </h1>
            <p style={{ color: "#555", lineHeight: 1.6, margin: 0 }}>
              Ferguson Law platform — your feedback shapes what we build next. Takes about 5 minutes.
            </p>
          </div>

          {submitted ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: "48px 32px", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 40, marginBottom: 16, color: "#b8872a", fontWeight: 700 }}>Done</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>Feedback received</h2>
              <p style={{ color: "#555", marginBottom: 24 }}>Thank you. Your input has been logged and will be reviewed by the Ferguson Law team.</p>
              <a href="/test-guide" style={{
                display: "inline-block", background: "#1a1a1a", color: "#fff",
                padding: "12px 28px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none",
              }}>Back to test guide</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              <Card title="About you">
                <Field label="Full name *">
                  <input type="text" value={form.tester_name} onChange={(e) => set("tester_name", e.target.value)}
                    placeholder="Your name" style={inputStyle} />
                </Field>
                <Field label="Your role *">
                  <select value={form.tester_role} onChange={(e) => set("tester_role", e.target.value)} style={inputStyle}>
                    <option value="">Select your role</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Which persona did you test as? *">
                  <select value={form.persona} onChange={(e) => { set("persona", e.target.value); setChecks({}); }} style={inputStyle}>
                    <option value="">Select a persona</option>
                    {PERSONAS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Which site did you test?">
                  <select value={form.site_tested} onChange={(e) => set("site_tested", e.target.value)} style={inputStyle}>
                    <option value="">Select a site</option>
                    {SITES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="What device did you test on?">
                  <select value={form.device_type} onChange={(e) => { set("device_type", e.target.value); setChecks({}); }} style={inputStyle}>
                    <option value="">Select a device</option>
                    {DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </Card>

              {/* Conditional persona-specific questions */}
              {hasConditional && (
                <Card title={`${personaKey ? "Persona" : ""}${personaKey && deviceKey ? " + " : ""}${deviceKey ? "Device" : ""} Checks`}>
                  <p style={{ fontSize: 13, color: "#777", margin: "0 0 4px", lineHeight: 1.6 }}>
                    These questions are tailored to your persona and device. Answer what applies.
                  </p>

                  {personaQs.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 8 }}>
                      {personaQs.map((q, i) => {
                        const key = buildChecksKey(q, "persona");
                        return (
                          <CheckQuestion key={i} question={q} entry={checks[key]} onChange={(f, v) => setCheck(key, f, v)} />
                        );
                      })}
                    </div>
                  )}

                  {deviceKey && deviceQs.length > 0 && (
                    <>
                      <div style={{ borderTop: "1px solid #f0ede6", margin: "18px 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#b8872a", textTransform: "uppercase" }}>
                        {deviceKey === "ios" ? "iOS" : "Android"} specific
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        {deviceQs.map((q, i) => {
                          const key = buildChecksKey(q, "device");
                          return (
                            <CheckQuestion key={i} question={q} entry={checks[key]} onChange={(f, v) => setCheck(key, f, v)} />
                          );
                        })}
                      </div>
                    </>
                  )}
                </Card>
              )}

              <Card title="Your experience">
                <Field label="Overall rating *">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => set("rating", n)}
                        style={{
                          width: 44, height: 44, borderRadius: 8, border: "2px solid",
                          borderColor: form.rating >= n ? "#b8872a" : "#e0ddd6",
                          background: form.rating >= n ? "#b8872a" : "#fff",
                          color: form.rating >= n ? "#fff" : "#888",
                          fontWeight: 700, fontSize: 16, cursor: "pointer",
                        }}>{n}</button>
                    ))}
                    <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                      {form.rating === 1 ? "Poor" : form.rating === 2 ? "Fair" : form.rating === 3 ? "Good" : form.rating === 4 ? "Very good" : form.rating === 5 ? "Excellent" : "1 = Poor, 5 = Excellent"}
                    </span>
                  </div>
                </Field>
                <Field label="What worked well?">
                  <textarea value={form.what_worked} onChange={(e) => set("what_worked", e.target.value)}
                    placeholder="Features, flows, or interactions that felt smooth..."
                    rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                <Field label="What did not work or felt confusing?">
                  <textarea value={form.what_didnt} onChange={(e) => set("what_didnt", e.target.value)}
                    placeholder="Anything broken, missing, or hard to understand..."
                    rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                <Field label="Suggestions or anything else?">
                  <textarea value={form.suggestions} onChange={(e) => set("suggestions", e.target.value)}
                    placeholder="Features you wish existed, things to improve..."
                    rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
              </Card>

              <Card title="Final question">
                <Field label="Would you use this platform when it goes live?">
                  <div style={{ display: "flex", gap: 12 }}>
                    {([["Yes", true], ["No", false]] as const).map(([label, val]) => (
                      <button key={String(label)} type="button" onClick={() => set("would_use", val)}
                        style={{
                          padding: "10px 28px", borderRadius: 8, border: "2px solid",
                          borderColor: form.would_use === val ? "#b8872a" : "#e0ddd6",
                          background: form.would_use === val ? "#b8872a" : "#fff",
                          color: form.would_use === val ? "#fff" : "#555",
                          fontWeight: 600, cursor: "pointer",
                        }}>{label}</button>
                    ))}
                  </div>
                </Field>
              </Card>

              {error && <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>}

              <button type="submit" disabled={busy} style={{
                background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 10,
                padding: "16px 32px", fontWeight: 700, fontSize: 16,
                cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
              }}>
                {busy ? "Submitting..." : "Submit feedback"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function CheckQuestion({
  question, entry, onChange,
}: {
  question: string;
  entry?: CheckEntry;
  onChange: (field: "answer" | "note", value: string) => void;
}) {
  const ans = entry?.answer ?? "";
  return (
    <div>
      <p style={{ fontSize: 13.5, fontWeight: 600, color: "#1a1a1a", margin: "0 0 8px", lineHeight: 1.5 }}>{question}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: ans ? 8 : 0 }}>
        {(["yes", "partial", "no"] as CheckAnswer[]).map(a => (
          <button key={a} type="button" onClick={() => onChange("answer", ans === a ? "" : a)}
            style={{
              padding: "6px 16px", borderRadius: 7, border: "1.5px solid",
              borderColor: ans === a ? (a === "yes" ? "#2a7a4b" : a === "partial" ? "#b8872a" : "#c0392b") : "#e0ddd6",
              background: ans === a ? (a === "yes" ? "#eafaf2" : a === "partial" ? "#fffbf0" : "#fbeaea") : "#fff",
              color: ans === a ? (a === "yes" ? "#2a7a4b" : a === "partial" ? "#b8872a" : "#c0392b") : "#888",
              fontWeight: 600, fontSize: 12, cursor: "pointer", textTransform: "capitalize",
            }}>{a === "partial" ? "Partially" : a}</button>
        ))}
      </div>
      {!!ans && (
        <input
          type="text"
          value={entry?.note ?? ""}
          onChange={e => onChange("note", e.target.value)}
          placeholder="Add a note (optional)"
          style={{ ...inputStyle, fontSize: 13, marginTop: 2 }}
        />
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 20px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #f0ede6" }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid #e0ddd6",
  borderRadius: 8,
  fontSize: 14,
  color: "#1a1a1a",
  background: "#faf9f6",
  outline: "none",
  boxSizing: "border-box",
};
