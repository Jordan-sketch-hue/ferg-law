"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { registerPartner, PARTNER_KINDS, type PartnerKind } from "@/lib/partners/api";

const VALID_KINDS = PARTNER_KINDS.map((k) => k.value) as PartnerKind[];

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const kindParam = params.get("kind") as PartnerKind | null;
  const [kind, setKind] = useState<PartnerKind>(
    kindParam && VALID_KINDS.includes(kindParam) ? kindParam : "realtor"
  );

  useEffect(() => {
    if (kindParam && VALID_KINDS.includes(kindParam)) setKind(kindParam);
  }, [kindParam]);
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!business.trim()) return setErr("Add your business name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("Enter a valid email.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      await registerPartner(email.trim(), password, kind, business.trim());
      router.push("/directory/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="dir-wrap">
      <form className="dir-form" onSubmit={onSubmit} noValidate>
        <h1>List your business</h1>
        <p className="lede">
          Join the Ferguson Law directory. Create your account, then manage your own
          listing anytime.
        </p>

        {err && <div className="dform-err">{err}</div>}

        <div className="dform-field">
          <label>I am a…</label>
          <div className="kind-choose">
            {PARTNER_KINDS.map((k) => (
              <button
                type="button"
                key={k.value}
                data-on={kind === k.value}
                onClick={() => setKind(k.value)}
              >
                <b>{k.label}</b>
                <span>{k.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dform-field">
          <label htmlFor="biz">Business / agency name</label>
          <input
            id="biz"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="e.g. Blue Mahoe Realty"
          />
        </div>
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
          <label htmlFor="pw">Create a password</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              id="pw"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
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
          {busy ? "Creating your account…" : "Create account"}
        </button>

        <div className="dform-alt">
          Already listed? <Link href="/directory/login">Partner login</Link>
        </div>
      </form>
    </div>
  );
}
