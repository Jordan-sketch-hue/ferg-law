"use client";

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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setErr(error.message); setBusy(false); return; }
    router.push("/directory/client");
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Please enter your name.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), role: "client" } },
    });
    if (error) { setErr(error.message); setBusy(false); return; }
    if (data.session) {
      router.push("/directory/client");
    } else {
      setOk("Check your email to confirm your account, then sign in.");
      setBusy(false);
      setTab("login");
    }
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
        <div style={{ display: "flex", gap: 0, marginBottom: 22, borderBottom: "1px solid var(--line)" }}>
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setErr(null); setOk(null); }}
              style={{
                flex: 1, background: "none", border: "none", cursor: "pointer",
                padding: "10px 0", fontFamily: "var(--serif)", fontSize: 17,
                fontWeight: 600, color: tab === t ? "var(--ink)" : "var(--muted)",
                borderBottom: tab === t ? "2px solid var(--ink)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <h1 style={{ marginBottom: 4 }}>{tab === "login" ? "Client portal" : "Create your account"}</h1>
        <p className="lede">
          {tab === "login"
            ? "Track your property matter and connect with your professionals."
            : "Register to access your Ferguson Law client portal."}
        </p>

        {err && <div className="dform-err">{err}</div>}
        {ok  && <div className="dform-ok">{ok}</div>}

        <form onSubmit={tab === "login" ? onLogin : onSignup} noValidate>
          {tab === "signup" && (
            <div className="dform-field">
              <label htmlFor="nm">Full name</label>
              <input id="nm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </div>
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

          <button className="btn btn-gold" type="submit" disabled={busy} style={{ width: "100%", marginTop: 4 }}>
            {busy ? (tab === "login" ? "Signing in…" : "Creating account…") : (tab === "login" ? "Sign in" : "Create account")}
          </button>

          {tab === "login" && (
            <div className="dform-alt"><Link href="/reset?request=client">Forgot password?</Link></div>
          )}
        </form>

        <div className="dform-alt" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          Are you a professional?{" "}
          <Link href="/directory/login">Partner login →</Link>
        </div>
      </div>
    </div>
  );
}
