"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginPartner } from "@/lib/partners/api";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await loginPartner(email.trim(), password);
      router.push("/directory/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="dir-wrap">
      <form className="dir-form" onSubmit={onSubmit} noValidate>
        <h1>Partner login</h1>
        <p className="lede">Sign in to manage your directory listing.</p>

        {err && <div className="dform-err">{err}</div>}

        <div className="dform-field">
          <label htmlFor="em">Email</label>
          <input
            id="em"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
          />
        </div>
        <div className="dform-field">
          <label htmlFor="pw">Password</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              id="pw"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button className="btn btn-gold" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="dform-alt">
          <Link href="/reset?request=partner">Forgot password?</Link>
        </div>
        <div className="dform-alt">
          New here? <Link href="/directory/join">List your business</Link>
        </div>
      </form>
    </div>
  );
}
