"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ClientLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState<"property_purchase" | "property_sale" | "general">("property_purchase");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setErr(error.message); setBusy(false); return; }
    router.push("/directory/client");
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Please enter your name.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (!agreedToTerms) return setErr("Please agree to the Terms of Service and Privacy Policy to continue.");
    setBusy(true);
    let json: { ok?: boolean; error?: string };
    let resOk = false;
    try {
      const res = await fetch("/api/auth/client-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim(), phone: phone.trim(), intent }),
      });
      resOk = res.ok;
      json = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      // network failure or a non-JSON server error — always tell the user why signup stopped
      setErr("We couldn't reach the server to create your account. Please check your connection and try again.");
      setBusy(false);
      return;
    }
    if (!resOk || json.error) {
      setErr(json.error ?? "Sign up failed. Please try again.");
      setBusy(false);
      return;
    }
    // Account created — sign in immediately, no confirmation email
    const { error: signInErr } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (signInErr) {
      setErr(signInErr.message);
      setBusy(false);
      return;
    }
    router.push("/directory/client");
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <div className="dir-wrap">
      <div className="dir-form">
        {tab === "login" && (
          <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 12, background: "linear-gradient(135deg,#0e2518,#1a3828)", color: "#fff" }}>
            <div style={{ fontWeight: 700, fontSize: ".85rem", marginBottom: 4, color: "var(--gold,#c8a65c)", textTransform: "uppercase", letterSpacing: ".1em" }}>Ferguson Law Client Portal</div>
            <p style={{ margin: 0, fontSize: ".88rem", lineHeight: 1.55, color: "rgba(246,242,234,.85)" }}>
              The Ferguson Law Client Portal tracks every milestone in your matter. Log in 24/7 to view updates, communicate with your attorney, and access documents — all in one place.
            </p>
          </div>
        )}
        <h1 style={{ marginBottom: 4 }}>{tab === "login" ? "Sign in" : "Create your account"}</h1>
        <p className="lede">
          {tab === "login"
            ? "Track your property matter and connect with your professionals."
            : "Register to access your Ferguson Law client portal."}
        </p>

        {err && <div className="dform-err">{err}</div>}
        {ok  && <div className="dform-ok">{ok}</div>}

        <form onSubmit={tab === "login" ? onLogin : onSignup} noValidate>
          {tab === "signup" && (
            <>
              <div className="dform-field">
                <label htmlFor="nm">Full name</label>
                <input id="nm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="dform-field">
                <label htmlFor="ph">Cell number</label>
                <input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 800 000 0000" />
              </div>
              <div className="dform-field">
                <label htmlFor="intent">What can we help you with?</label>
                <select id="intent" value={intent} onChange={(e) => setIntent(e.target.value as typeof intent)}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, background: "#fff" }}>
                  <option value="property_purchase">Buying a property</option>
                  <option value="property_sale">Selling a property</option>
                  <option value="general">Something else</option>
                </select>
              </div>
            </>
          )}
          <div className="dform-field">
            <label htmlFor="em">Email</label>
            <input id="em" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="dform-field">
            <label htmlFor="pw">{tab === "login" ? "Password" : "Create a password"}</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input id="pw" type={showPassword ? "text" : "password"}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "signup" ? "At least 6 characters" : undefined}
                style={{ width: "100%", paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 12, background: "none", border: "none",
                  cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center" }}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {tab === "signup" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--gold)", width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                I agree to Ferguson Law&apos;s{" "}
                <a href="/terms" target="_blank" style={{ color: "var(--ink)", fontWeight: 600 }}>Terms of Service</a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" style={{ color: "var(--ink)", fontWeight: 600 }}>Privacy Policy</a>,
                and consent to Ferguson Law collecting and processing my personal information for the purpose of delivering legal services.
              </span>
            </label>
          )}

          <button className="btn btn-gold" type="submit" disabled={busy} style={{ width: "100%", marginTop: 4 }}>
            {busy ? (tab === "login" ? "Signing in…" : "Creating account…") : (tab === "login" ? "Sign in" : "Create account")}
          </button>

          {tab === "login" && (
            <div className="dform-alt"><Link href="/reset?request=client">Forgot password?</Link></div>
          )}
        </form>

        <div className="dform-alt" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          {tab === "login" ? (
            <>Don&apos;t have an account?{" "}
              <button type="button" onClick={() => { setTab("signup"); setErr(null); setOk(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 600, padding: 0, fontSize: "inherit" }}>
                Create one →
              </button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button type="button" onClick={() => { setTab("login"); setErr(null); setOk(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 600, padding: 0, fontSize: "inherit" }}>
                Sign in →
              </button>
            </>
          )}
        </div>
        <div className="dform-alt" style={{ paddingTop: 8 }}>
          Are you a real estate professional?{" "}
          <Link href="/directory/login">Partner login →</Link>
        </div>
      </div>
    </div>
  );
}
