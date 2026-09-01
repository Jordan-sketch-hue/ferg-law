"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

// ─── Types ────────────────────────────────────────────────────────────────────

type Audience = "buyer" | "seller" | "professional" | "admin";
type ProKind  = "realtor" | "valuator" | "surveyor" | "loan_officer";

interface AudienceCard {
  id: Audience;
  emoji: string;
  label: string;
  sub: string;
  portal: string;
}

interface ProCard {
  id: ProKind;
  emoji: string;
  label: string;
  sub: string;
}

const AUDIENCES: AudienceCard[] = [
  { id: "buyer",        emoji: "🏠", label: "I'm buying",         sub: "Looking to purchase property in Jamaica",               portal: "client" },
  { id: "seller",       emoji: "📋", label: "I'm selling",        sub: "I have a property I want to list or sell",              portal: "client" },
  { id: "professional", emoji: "💼", label: "I'm a professional", sub: "Agent, Banker, Valuator or Surveyor",                    portal: "partner" },
  { id: "admin",        emoji: "🔐", label: "Admin / Staff",      sub: "Ferguson Law internal back-office",                     portal: "admin" },
];

const PRO_KINDS: ProCard[] = [
  { id: "realtor",      emoji: "🏠", label: "Real Estate Agent",   sub: "List properties and connect with qualified buyers" },
  { id: "loan_officer", emoji: "🏦", label: "Banker / Loan Officer", sub: "NHT, JN, commercial bank or credit union" },
  { id: "valuator",     emoji: "📋", label: "Valuator",            sub: "Certified property valuations for lenders" },
  { id: "surveyor",     emoji: "📐", label: "Land Surveyor",       sub: "ID reports and boundary surveys" },
];

// ─── Intent labels for the client signup form ─────────────────────────────────

const INTENT_LABELS = {
  property_purchase: "Buying a property",
  property_sale:     "Selling a property",
  general:           "Something else",
} as const;
type Intent = keyof typeof INTENT_LABELS;

// ─── Eye icon ─────────────────────────────────────────────────────────────────

function Eye({ open }: { open: boolean }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AuthPageInner() {
  const params  = useSearchParams();
  const router  = useRouter();

  const initMode = (params.get("mode") === "signup" || params.get("intent") === "signup") ? "signup" : "signin";
  const initRole = params.get("role") as Audience | null;

  // flow state
  const [mode, setMode]         = useState<"signin" | "signup">(initMode);
  // step: "pick" → (pro only) "pick-pro" → "form"
  const [step, setStep]         = useState<"pick" | "pick-pro" | "form">(
    initMode === "signup" ? (initRole ? "form" : "pick") : "form"
  );
  const [audience, setAudience] = useState<Audience | null>(initRole ?? null);
  const [proKind, setProKind]   = useState<ProKind | null>(null);

  // form fields
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [intent,   setIntent]   = useState<Intent>("property_purchase");
  const [showPw,   setShowPw]   = useState(false);
  const [agreed,   setAgreed]   = useState(false);

  // status
  const [busy,         setBusy]         = useState(false);
  const [err,          setErr]          = useState<string | null>(null);

  // passkey state
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyBusy,      setPasskeyBusy]      = useState(false);
  const [passkeyPrompt,    setPasskeyPrompt]     = useState(false); // post-login prompt

  // If role was pre-set via URL, sync intent for sellers
  useEffect(() => {
    if (initRole === "seller") setIntent("property_sale");
  }, [initRole]);

  // Check if WebAuthn is available on this device
  useEffect(() => {
    if (typeof window !== "undefined" &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setPasskeySupported(ok))
        .catch(() => setPasskeySupported(false));
    }
  }, []);

  // ─── PASSKEY SIGN IN ─────────────────────────────────────────────────────

  const signInWithPasskey = useCallback(async () => {
    if (!email.trim()) { setErr("Enter your email first, then tap 'Sign in with passkey'."); return; }
    setErr(null);
    setPasskeyBusy(true);
    try {
      // 1. Get a challenge from the server
      const challengeRes = await fetch(`/api/auth/passkey-challenge?mode=authenticate&email=${encodeURIComponent(email.trim())}`);
      const { options } = await challengeRes.json() as { options: Record<string, unknown> };
      // 2. Trigger the device biometric / security key prompt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credential = await startAuthentication({ optionsJSON: options as any });
      // 3. Verify on the server and get a magic-link token
      const verifyRes = await fetch("/api/auth/passkey-authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), credential }),
      });
      const result = await verifyRes.json() as { ok?: boolean; tokenHash?: string; email?: string; error?: string };
      if (!verifyRes.ok || result.error) { setErr(result.error ?? "Passkey sign-in failed."); setPasskeyBusy(false); return; }
      // 4. Exchange token for a Supabase session
      const { error: sessionErr } = await createClient().auth.verifyOtp({
        email: result.email ?? email.trim(),
        token: result.tokenHash ?? "",
        type:  "magiclink",
      });
      if (sessionErr) { setErr(sessionErr.message); setPasskeyBusy(false); return; }
      router.push("/directory/client");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("cancelled") || msg.includes("abort") || msg.includes("NotAllowedError")) {
        setErr("Passkey sign-in was cancelled.");
      } else {
        setErr("Passkey sign-in failed. Use your password instead.");
      }
    } finally {
      setPasskeyBusy(false);
    }
  }, [email, router]);

  // ─── PASSKEY REGISTRATION (post-login prompt) ────────────────────────────

  const registerPasskey = useCallback(async (userEmail: string) => {
    setPasskeyBusy(true);
    try {
      const challengeRes = await fetch(`/api/auth/passkey-challenge?mode=register&email=${encodeURIComponent(userEmail)}`);
      const { options } = await challengeRes.json() as { options: Record<string, unknown> };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credential = await startRegistration({ optionsJSON: options as any });
      const verifyRes = await fetch("/api/auth/passkey-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, credential }),
      });
      const result = await verifyRes.json() as { ok?: boolean; error?: string };
      if (result.ok) {
        setPasskeyPrompt(false);
        // small toast-like feedback (native alert is fine here — it's a success path)
      }
    } catch { /* user cancelled — no error shown */ } finally {
      setPasskeyBusy(false);
      setPasskeyPrompt(false);
    }
  }, []);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setStep(next === "signup" ? "pick" : "form");
    setAudience(null);
    setProKind(null);
    setErr(null);
  }

  function pickAudience(a: Audience) {
    setAudience(a);
    setErr(null);
    if (a === "admin") {
      router.push("/admin");
      return;
    }
    if (mode === "signin") {
      // Go straight to login form; professionals go to partner login
      if (a === "professional") {
        router.push("/directory/login");
        return;
      }
      setStep("form");
      return;
    }
    // signup mode
    if (a === "professional") {
      setStep("pick-pro");
      return;
    }
    setIntent(a === "seller" ? "property_sale" : "property_purchase");
    setStep("form");
  }

  function pickProKind(k: ProKind) {
    setProKind(k);
    setStep("form");
    setErr(null);
  }

  // ─── CLIENT SIGN-IN ───────────────────────────────────────────────────────

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setErr(error.message); setBusy(false); return; }
      // Offer passkey registration on devices that support it
      if (passkeySupported) {
        const already = localStorage.getItem("fl_passkey_enrolled") === email.trim();
        const dismissed = localStorage.getItem("fl_passkey_dismissed") === email.trim();
        if (!already && !dismissed) { setPasskeyPrompt(true); setBusy(false); return; }
      }
      router.push("/directory/client");
    } catch {
      setErr("Could not reach the server. Please check your connection.");
      setBusy(false);
    }
  }

  // ─── CLIENT SIGN-UP (buyer / seller) ─────────────────────────────────────

  async function signUpClient(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim())   return setErr("Please enter your full name.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (!agreed)        return setErr("Please accept the Terms and Privacy Policy to continue.");
    setBusy(true);
    try {
      const res  = await fetch("/api/auth/client-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim(), phone: phone.trim(), intent }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || json.error) { setErr(json.error ?? "Sign up failed. Please try again."); setBusy(false); return; }
      // auto sign-in
      const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setErr(error.message); setBusy(false); return; }
      router.push("/directory/client?new=true");
    } catch {
      setErr("Could not reach the server. Please check your connection.");
      setBusy(false);
    }
  }

  // ─── PROFESSIONAL SIGN-UP ─────────────────────────────────────────────────
  // Redirects to /directory/join with the kind pre-selected

  function goProJoin() {
    router.push(`/directory/join?kind=${proKind ?? "realtor"}`);
  }

  // ─── Submit routing ───────────────────────────────────────────────────────

  function onSubmit(e: React.FormEvent) {
    if (mode === "signin")                       return signIn(e);
    if (audience === "buyer" || audience === "seller") return signUpClient(e);
    // professional sign-up is handled by redirect button
    e.preventDefault();
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  const audienceLabel = audience === "buyer" ? "Buyer"
    : audience === "seller" ? "Seller"
    : proKind ? PRO_KINDS.find(p => p.id === proKind)?.label ?? "Professional"
    : null;

  const isProSignup = mode === "signup" && audience === "professional" && step === "form";

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem 1rem", background: "var(--bg, #F6F2EA)" }}>
      <style>{`
        .acard{display:flex;align-items:center;gap:1rem;padding:.9rem 1.1rem;border-radius:14px;border:1.5px solid rgba(16,42,30,.1);background:#fff;cursor:pointer;transition:border-color .15s,background .15s;text-align:left;width:100%;}
        .acard:hover,.acard.sel{border-color:#C8A65C;background:rgba(200,166,92,.06);}
        .acard-icon{width:44px;height:44px;border-radius:10px;background:rgba(16,42,30,.07);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;}
        .acard-label{font-weight:700;font-size:.9rem;color:var(--ink,#24211b);}
        .acard-sub{font-size:.72rem;color:var(--muted,#69736d);margin-top:.1rem;}
        .afield{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.85rem;}
        .afield label{font-size:.8rem;font-weight:600;color:var(--ink,#24211b);}
        .afield input,.afield select{padding:.6rem .85rem;border-radius:9px;border:1.5px solid rgba(16,42,30,.12);font-size:.88rem;background:#fff;width:100%;outline:none;transition:border-color .15s;}
        .afield input:focus,.afield select:focus{border-color:#C8A65C;}
        .aerr{background:rgba(200,40,40,.07);border:1px solid rgba(200,40,40,.25);border-radius:9px;padding:.65rem .9rem;font-size:.82rem;color:#9a2020;margin-bottom:.75rem;}
        .abtn{width:100%;padding:.75rem;border-radius:99px;border:none;font-size:.88rem;font-weight:700;cursor:pointer;transition:opacity .15s;}
        .abtn-gold{background:#C8A65C;color:#fff;}
        .abtn-gold:hover{opacity:.9;}
        .abtn-outline{background:#fff;border:1.5px solid rgba(16,42,30,.15);color:var(--ink,#24211b);}
        .abtn-outline:hover{border-color:#C8A65C;color:#8a6a2a;}
        .atoggle{background:none;border:none;font-size:.82rem;font-weight:700;color:var(--ink,#24211b);cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px;}
        .aback{background:none;border:none;font-size:.8rem;color:var(--muted,#69736d);cursor:pointer;display:flex;align-items:center;gap:.35rem;margin-bottom:1.1rem;padding:0;}
        .aback:hover{color:var(--ink,#24211b);}
        .pw-wrap{position:relative;display:flex;align-items:center;}
        .pw-wrap input{padding-right:2.4rem;}
        .pw-eye{position:absolute;right:.7rem;background:none;border:none;cursor:pointer;padding:.25rem;display:flex;color:var(--muted,#69736d);}
      `}</style>

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* ── Logo ── */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Link href="/" style={{ display: "inline-block" }}>
            <div style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontSize: "1.35rem", fontWeight: 700, color: "#102A1E", letterSpacing: "-.01em" }}>
              Ferguson Law
            </div>
            <div style={{ fontSize: ".6rem", letterSpacing: ".22em", textTransform: "uppercase", color: "#C8A65C", fontWeight: 600, marginTop: ".15rem" }}>
              Jamaica Property Law
            </div>
          </Link>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "2rem 1.75rem", boxShadow: "0 8px 40px -12px rgba(16,42,30,.14), 0 0 0 1px rgba(16,42,30,.06)" }}>

          {/* ── Mode toggle ── */}
          <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem", background: "rgba(16,42,30,.05)", borderRadius: 99, padding: ".25rem" }}>
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: ".5rem", borderRadius: 99, border: "none", fontSize: ".82rem", fontWeight: 700, cursor: "pointer",
                background: mode === m ? "#102A1E" : "transparent",
                color: mode === m ? "#C8A65C" : "var(--muted,#69736d)",
                transition: "background .15s, color .15s",
              }}>
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* ══ STEP: Pick audience ══ */}
          {step === "pick" && (
            <div>
              <div style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontSize: "1.3rem", fontWeight: 700, color: "#102A1E", marginBottom: ".4rem" }}>
                Who are you?
              </div>
              <p style={{ fontSize: ".8rem", color: "var(--muted,#69736d)", marginBottom: "1.1rem", lineHeight: 1.6 }}>
                Choose your role — we&apos;ll set up the right account and portal for you.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                {AUDIENCES.map((a) => (
                  <button key={a.id} className={`acard${audience === a.id ? " sel" : ""}`} onClick={() => pickAudience(a.id)}>
                    <div className="acard-icon">{a.emoji}</div>
                    <div>
                      <div className="acard-label">{a.label}</div>
                      <div className="acard-sub">{a.sub}</div>
                    </div>
                    <svg style={{ marginLeft: "auto", flexShrink: 0, color: "#C8A65C", opacity: .5 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
              <p style={{ marginTop: "1.1rem", textAlign: "center", fontSize: ".8rem", color: "var(--muted,#69736d)" }}>
                Already have an account?{" "}
                <button className="atoggle" onClick={() => switchMode("signin")}>Sign in</button>
              </p>
            </div>
          )}

          {/* ══ STEP: Pick pro kind ══ */}
          {step === "pick-pro" && (
            <div>
              <button className="aback" onClick={() => setStep("pick")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
              <div style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontSize: "1.3rem", fontWeight: 700, color: "#102A1E", marginBottom: ".4rem" }}>
                What&apos;s your profession?
              </div>
              <p style={{ fontSize: ".8rem", color: "var(--muted,#69736d)", marginBottom: "1.1rem", lineHeight: 1.6 }}>
                All professionals go through a quick verification before going live in the directory.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                {PRO_KINDS.map((k) => (
                  <button key={k.id} className={`acard${proKind === k.id ? " sel" : ""}`} onClick={() => pickProKind(k.id)}>
                    <div className="acard-icon">{k.emoji}</div>
                    <div>
                      <div className="acard-label">{k.label}</div>
                      <div className="acard-sub">{k.sub}</div>
                    </div>
                    <svg style={{ marginLeft: "auto", flexShrink: 0, color: "#C8A65C", opacity: .5 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ STEP: Form ══ */}
          {step === "form" && (
            <div>
              {(mode === "signup") && (
                <button className="aback" onClick={() => setStep(audience === "professional" && proKind ? "pick-pro" : "pick")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </button>
              )}

              {/* Context badge */}
              {audienceLabel && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "rgba(200,166,92,.1)", borderRadius: 99, padding: ".2rem .7rem", marginBottom: ".9rem", fontSize: ".72rem", fontWeight: 600, color: "#8a6a2a" }}>
                  {audienceLabel} account
                </div>
              )}

              <div style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontSize: "1.25rem", fontWeight: 700, color: "#102A1E", marginBottom: "1.1rem" }}>
                {mode === "signin" ? "Welcome back" : isProSignup ? "Create your profile" : "Create your account"}
              </div>

              {err && <div className="aerr">{err}</div>}

              {/* Professional signup — redirect to the wizard */}
              {isProSignup ? (
                <div>
                  <div style={{ background: "rgba(16,42,30,.04)", borderRadius: 12, padding: "1rem", marginBottom: "1.1rem", fontSize: ".82rem", color: "var(--ink,#24211b)", lineHeight: 1.65 }}>
                    <strong>Quick verification required.</strong><br/>
                    We&apos;ll collect your business details, service area and credentials. Takes 2–3 minutes. Your profile goes live within 1–2 business days.
                  </div>
                  <button className="abtn abtn-gold" onClick={goProJoin}>
                    Start my {PRO_KINDS.find(p => p.id === proKind)?.label ?? "professional"} profile →
                  </button>
                  <div style={{ marginTop: ".75rem", textAlign: "center", fontSize: ".78rem", color: "var(--muted,#69736d)" }}>
                    Already listed?{" "}
                    <Link href="/directory/login" style={{ fontWeight: 700, color: "var(--ink,#24211b)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                      Sign in to your dashboard
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  {mode === "signup" && (
                    <>
                      <div className="afield">
                        <label htmlFor="fl-name">Full name</label>
                        <input id="fl-name" required value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                      </div>
                      <div className="afield">
                        <label htmlFor="fl-phone">Cell number</label>
                        <input id="fl-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 876 000 0000" />
                      </div>
                      <div className="afield">
                        <label htmlFor="fl-intent">What can we help you with?</label>
                        <select id="fl-intent" value={intent} onChange={e => setIntent(e.target.value as Intent)}>
                          {(Object.entries(INTENT_LABELS) as [Intent, string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div className="afield">
                    <label htmlFor="fl-email">Email</label>
                    <input id="fl-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
                  </div>
                  <div className="afield">
                    <label htmlFor="fl-pw">{mode === "signin" ? "Password" : "Create a password"}</label>
                    <div className="pw-wrap">
                      <input id="fl-pw" type={showPw ? "text" : "password"} required
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        minLength={mode === "signup" ? 6 : undefined}
                        placeholder={mode === "signup" ? "At least 6 characters" : undefined}
                        value={password} onChange={e => setPassword(e.target.value)} />
                      <button type="button" className="pw-eye" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}>
                        <Eye open={showPw} />
                      </button>
                    </div>
                  </div>
                  {mode === "signup" && (
                    <label style={{ display: "flex", alignItems: "flex-start", gap: ".55rem", marginBottom: "1rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                        style={{ marginTop: 3, flexShrink: 0, accentColor: "#C8A65C", width: 15, height: 15 }} />
                      <span style={{ fontSize: ".75rem", color: "var(--muted,#69736d)", lineHeight: 1.55 }}>
                        I agree to Ferguson Law&apos;s{" "}
                        <Link href="/terms" target="_blank" style={{ color: "var(--ink,#24211b)", fontWeight: 600 }}>Terms of Service</Link>{" "}
                        and{" "}
                        <Link href="/privacy" target="_blank" style={{ color: "var(--ink,#24211b)", fontWeight: 600 }}>Privacy Policy</Link>,
                        and consent to Ferguson Law processing my information to deliver legal services.
                      </span>
                    </label>
                  )}
                  <button type="submit" className="abtn abtn-gold" disabled={busy || passkeyBusy}>
                    {busy ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "Sign in" : "Create account")}
                  </button>
                  {mode === "signin" && passkeySupported && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", margin: ".75rem 0" }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(16,42,30,.1)" }} />
                        <span style={{ fontSize: ".72rem", color: "var(--muted,#69736d)", flexShrink: 0 }}>or</span>
                        <div style={{ flex: 1, height: 1, background: "rgba(16,42,30,.1)" }} />
                      </div>
                      <button type="button" className="abtn abtn-outline" disabled={passkeyBusy || busy} onClick={signInWithPasskey}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".55rem" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2C9.243 2 7 4.243 7 7v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v2H9V7c0-1.654 1.346-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                        </svg>
                        {passkeyBusy ? "Verifying…" : "Sign in with Face ID / fingerprint"}
                      </button>
                    </>
                  )}
                  {mode === "signin" && (
                    <div style={{ marginTop: ".7rem", textAlign: "center" }}>
                      <Link href="/reset?request=client" style={{ fontSize: ".78rem", color: "var(--muted,#69736d)" }}>Forgot password?</Link>
                    </div>
                  )}
                </form>
              )}

              {/* Footer links */}
              <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(16,42,30,.08)", fontSize: ".78rem", color: "var(--muted,#69736d)", textAlign: "center", lineHeight: 2 }}>
                {mode === "signin" ? (
                  <>New here? <button className="atoggle" onClick={() => switchMode("signup")}>Create an account</button></>
                ) : (
                  <>Already have an account? <button className="atoggle" onClick={() => switchMode("signin")}>Sign in</button></>
                )}
                <br />
                <Link href="/" style={{ color: "var(--muted,#69736d)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  Skip — browse the site
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Post-login passkey enrollment prompt ── */}
        {passkeyPrompt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", zIndex: 50, padding: "1rem" }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: "2rem 1.75rem", maxWidth: 380, width: "100%", boxShadow: "0 32px 80px -20px rgba(0,0,0,.5)" }}>
              <div style={{ textAlign: "center", fontSize: "2.2rem", marginBottom: ".75rem" }}>🔐</div>
              <div style={{ fontFamily: "var(--font-fraunces, Georgia, serif)", fontSize: "1.15rem", fontWeight: 700, color: "#102A1E", textAlign: "center", marginBottom: ".5rem" }}>
                Sign in faster next time
              </div>
              <p style={{ fontSize: ".82rem", color: "var(--muted,#69736d)", lineHeight: 1.65, textAlign: "center", marginBottom: "1.25rem" }}>
                Enable Face ID, fingerprint, or your device PIN to sign in to Ferguson Law in one tap — no password needed.
              </p>
              <button className="abtn abtn-gold" disabled={passkeyBusy}
                onClick={() => registerPasskey(email.trim()).then(() => {
                  try { localStorage.setItem("fl_passkey_enrolled", email.trim()); } catch { /* noop */ }
                  router.push("/directory/client");
                })}
                style={{ marginBottom: ".6rem" }}>
                {passkeyBusy ? "Setting up…" : "Enable Face ID / fingerprint"}
              </button>
              <button className="abtn abtn-outline"
                onClick={() => {
                  try { localStorage.setItem("fl_passkey_dismissed", email.trim()); } catch { /* noop */ }
                  setPasskeyPrompt(false);
                  router.push("/directory/client");
                }}>
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Help text */}
        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: ".75rem", color: "rgba(16,42,30,.35)", lineHeight: 1.7 }}>
          Ferguson Law · Jamaica Property Law &amp; Conveyancing<br/>
          <a href="tel:6583188070" style={{ color: "rgba(16,42,30,.4)", textDecoration: "none" }}>(658) 318-8070</a>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>Loading…</div>}>
      <AuthPageInner />
    </Suspense>
  );
}
