"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { registerPartner, PARTNER_KINDS, type PartnerKind } from "@/lib/partners/api";
import { PARISHES } from "@/lib/partners/constants";

const VALID_KINDS = PARTNER_KINDS.map((k) => k.value) as PartnerKind[];

const PROFESSIONAL_ICONS: Record<PartnerKind, string> = {
  realtor: "🏠",
  loan_officer: "🏦",
  valuator: "📋",
  surveyor: "📐",
};

const KIND_DESCRIPTIONS: Record<PartnerKind, { title: string; blurb: string; examples: string }> = {
  realtor: {
    title: "Real Estate Agent",
    blurb: "List properties with photos & video. Connect with qualified buyers across Jamaica.",
    examples: "Buyer matchmaking · Property listings · Parish coverage",
  },
  loan_officer: {
    title: "Banker / Loan Officer",
    blurb: "Showcase mortgage products and rates to buyers who are assessment-ready.",
    examples: "Mortgage products · NHT guidance · Pre-approval support",
  },
  valuator: {
    title: "Valuator",
    blurb: "Display your valuation services and fees to buyers who need property valuations.",
    examples: "Residential valuations · Commercial · Estate valuations",
  },
  surveyor: {
    title: "Land Surveyor",
    blurb: "Offer your survey services and fees to buyers at every stage of the property journey.",
    examples: "Identification surveys · Subdivision · Title surveys",
  },
};

export default function JoinPage() {
  return (
    <Suspense>
      <JoinWizard />
    </Suspense>
  );
}

function JoinWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const kindParam = params.get("kind") as PartnerKind | null;

  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<PartnerKind>(
    kindParam && VALID_KINDS.includes(kindParam) ? kindParam : "realtor"
  );
  const [business, setBusiness] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [selectedParishes, setSelectedParishes] = useState<string[]>([]);
  const [islandwide, setIslandwide] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (kindParam && VALID_KINDS.includes(kindParam)) setKind(kindParam);
  }, [kindParam]);

  function toggleParish(p: string) {
    setSelectedParishes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function validateStep1() {
    if (!kind) return "Select your professional category.";
    return null;
  }

  function validateStep2() {
    if (!business.trim()) return "Add your business or professional name.";
    if (!contactName.trim()) return "Add your contact name.";
    if (!phone.trim()) return "Add a phone number.";
    return null;
  }

  function validateStep3() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  }

  function nextStep() {
    setErr(null);
    const validators = [null, validateStep1, validateStep2, validateStep3];
    const e = validators[step]?.();
    if (e) { setErr(e); return; }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setErr(null);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const v = validateStep3();
    if (v) { setErr(v); return; }
    setBusy(true);
    try {
      await registerPartner(email.trim(), password, kind, business.trim());
      fetch("/api/directory/partner-joined", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: business.trim(),
          contact: contactName.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          website: website.trim() || null,
          bio: bio.trim() || null,
          parishes: islandwide ? ["Islandwide"] : selectedParishes,
          kind,
          email: email.trim(),
        }),
      }).catch(() => {});
      setDone(true);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="dir-wrap">
        <div className="dir-form" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(27,77,50,.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--forest,#1B4D32)" strokeWidth="2.5" style={{ width: 28, height: 28 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.6rem", color: "var(--ink)", marginBottom: "0.5rem" }}>
            Application submitted
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Your {KIND_DESCRIPTIONS[kind].title} profile is pending verification. We&apos;ll
            review your details and notify you at <strong>{email}</strong> once approved.
          </p>
          <div style={{ background: "rgba(200,166,92,.08)", border: "1px solid rgba(200,166,92,.25)", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.5rem", textAlign: "left" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>What happens next?</p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
              1. Our team reviews your application (typically 1–2 business days).<br />
              2. You&apos;ll receive an email when approved.<br />
              3. Complete your profile — add photos, services, and availability.<br />
              4. Your listing goes live in the H.O.M.E. Professional Directory.
            </p>
          </div>
          <button
            onClick={() => router.push("/directory/dashboard")}
            className="btn btn-gold"
            style={{ width: "100%" }}
          >
            Go to my dashboard →
          </button>
          <Link href="/directory" style={{ display: "block", marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--muted)" }}>
            Browse the directory
          </Link>
        </div>
      </div>
    );
  }

  const progress = ((step - 1) / 3) * 100;

  return (
    <div className="dir-wrap">
      <div className="dir-form" style={{ maxWidth: 520 }}>
        {/* Progress bar */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--gold-deep)", fontWeight: 600 }}>
              {step === 1 ? "Step 1 — Your category" : step === 2 ? "Step 2 — Professional info" : "Step 3 — Create account"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{step} / 3</span>
          </div>
          <div style={{ height: 4, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: "linear-gradient(90deg, var(--forest,#1B4D32), var(--gold,#C8A65C))",
              width: `${progress + 33}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {err && (
          <div className="dform-err" style={{ marginBottom: "1rem" }}>{err}</div>
        )}

        {/* ── Step 1: Category ── */}
        {step === 1 && (
          <div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "1.75rem", color: "var(--ink)", marginBottom: "0.4rem" }}>
              List your business
            </h1>
            <p className="lede" style={{ marginBottom: "1.5rem" }}>
              What best describes your professional role?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {PARTNER_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  style={{
                    border: `2px solid ${kind === k.value ? "var(--gold,#C8A65C)" : "var(--line)"}`,
                    borderRadius: 12,
                    padding: "1.1rem 0.9rem",
                    textAlign: "left",
                    background: kind === k.value ? "rgba(200,166,92,.07)" : "#fff",
                    cursor: "pointer",
                    transition: "border-color .15s, background .15s",
                    display: "flex", flexDirection: "column", gap: "0.4rem",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{PROFESSIONAL_ICONS[k.value]}</span>
                  <span style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)" }}>
                    {KIND_DESCRIPTIONS[k.value].title}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {KIND_DESCRIPTIONS[k.value].blurb}
                  </span>
                  {kind === k.value && (
                    <span style={{ fontSize: "0.65rem", color: "var(--gold-deep,#9a7b3a)", marginTop: "0.25rem" }}>
                      {KIND_DESCRIPTIONS[k.value].examples}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-gold"
              style={{ width: "100%", marginTop: "1.5rem" }}
              onClick={nextStep}
            >
              Continue →
            </button>
            <div className="dform-alt">
              Already listed? <Link href="/directory/login">Partner login</Link>
            </div>
          </div>
        )}

        {/* ── Step 2: Professional info ── */}
        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
            <button type="button" onClick={prevStep} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1rem", padding: 0,
            }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14 }}>
                <path d="M10 4l-4 4 4 4" />
              </svg>
              Back
            </button>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "1.75rem", color: "var(--ink)", marginBottom: "0.25rem" }}>
              {PROFESSIONAL_ICONS[kind]} {KIND_DESCRIPTIONS[kind].title}
            </h1>
            <p className="lede" style={{ marginBottom: "1.5rem" }}>
              Tell buyers a bit about your practice.
            </p>

            <div className="dform-field">
              <label htmlFor="biz">Business / agency name <span style={{ color: "var(--gold-deep)" }}>*</span></label>
              <input id="biz" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Blue Mahoe Realty" required />
            </div>
            <div className="dform-field">
              <label htmlFor="cn">Your name <span style={{ color: "var(--gold-deep)" }}>*</span></label>
              <input id="cn" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Marcus Campbell" required />
            </div>
            <div className="dform-field">
              <label htmlFor="ph">Phone number <span style={{ color: "var(--gold-deep)" }}>*</span></label>
              <input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(876) 000-0000" required />
            </div>
            <div className="dform-field">
              <label htmlFor="wa">WhatsApp <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional — defaults to phone)</span></label>
              <input id="wa" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(876) 000-0000" />
            </div>
            <div className="dform-field">
              <label htmlFor="ws">Website <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <input id="ws" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourbusiness.com" />
            </div>
            <div className="dform-field">
              <label htmlFor="bio">About your practice <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your services, experience, and what makes you different…"
                rows={4}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>

            {/* Parish selection */}
            <div className="dform-field">
              <label>Parishes served</label>
              <div style={{ marginBottom: "0.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: "var(--ink)" }}>
                  <input type="checkbox" checked={islandwide} onChange={(e) => { setIslandwide(e.target.checked); if (e.target.checked) setSelectedParishes([]); }} />
                  Islandwide
                </label>
              </div>
              {!islandwide && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PARISHES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleParish(p)}
                      style={{
                        border: `1.5px solid ${selectedParishes.includes(p) ? "var(--gold,#C8A65C)" : "var(--line)"}`,
                        borderRadius: 999,
                        padding: "4px 12px",
                        fontSize: "0.78rem",
                        background: selectedParishes.includes(p) ? "rgba(200,166,92,.1)" : "#fff",
                        color: selectedParishes.includes(p) ? "var(--ink)" : "var(--muted)",
                        cursor: "pointer",
                        fontWeight: selectedParishes.includes(p) ? 600 : 400,
                        transition: "border-color .15s, background .15s",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: "0.5rem" }}>
              Continue →
            </button>
          </form>
        )}

        {/* ── Step 3: Account ── */}
        {step === 3 && (
          <form onSubmit={onSubmit} noValidate>
            <button type="button" onClick={prevStep} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1rem", padding: 0,
            }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14 }}>
                <path d="M10 4l-4 4 4 4" />
              </svg>
              Back
            </button>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "1.75rem", color: "var(--ink)", marginBottom: "0.25rem" }}>
              Create your account
            </h1>
            <p className="lede" style={{ marginBottom: "1.5rem" }}>
              Set up your login to manage your listing.
            </p>

            {/* Summary pill */}
            <div style={{
              background: "rgba(27,77,50,.06)", border: "1px solid rgba(27,77,50,.12)",
              borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.25rem",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: "1.25rem" }}>{PROFESSIONAL_ICONS[kind]}</span>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)" }}>{business || KIND_DESCRIPTIONS[kind].title}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{KIND_DESCRIPTIONS[kind].title} · {islandwide ? "Islandwide" : selectedParishes.length > 0 ? selectedParishes.slice(0, 3).join(", ") + (selectedParishes.length > 3 ? " +" + (selectedParishes.length - 3) : "") : "No parish selected"}</div>
              </div>
            </div>

            <div className="dform-field">
              <label htmlFor="em">Email address <span style={{ color: "var(--gold-deep)" }}>*</span></label>
              <input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" required />
            </div>
            <div className="dform-field">
              <label htmlFor="pw">Create a password <span style={{ color: "var(--gold-deep)" }}>*</span></label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="pw"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{ width: "100%", paddingRight: "40px" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Terms notice */}
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
              By creating an account you agree to our{" "}
              <Link href="/terms" style={{ color: "var(--gold-deep)" }}>Terms of Service</Link>.
              Your listing will be reviewed before going live — typically 1–2 business days.
            </p>

            <button className="btn btn-gold" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Submitting application…" : "Submit application →"}
            </button>

            <div className="dform-alt">
              Already listed? <Link href="/directory/login">Partner login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
