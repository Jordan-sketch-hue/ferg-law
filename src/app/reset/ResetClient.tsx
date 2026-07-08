"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Scope = "partner" | "admin";

export default function ResetClient({
  token,
  request,
}: {
  token: string | null;
  request: Scope | null;
}) {
  if (token) return <ConsumeForm token={token} />;
  if (request) return <RequestForm scope={request} />;
  return <Chooser />;
}

/* ---------- choose which account when no mode is given ---------- */
function Chooser() {
  return (
    <div className="dir-wrap">
      <div className="dir-form">
        <h1>Reset your password</h1>
        <p className="lede">Which account do you need to reset?</p>
        <Link className="btn btn-gold" href="/reset?request=partner" style={{ width: "100%", marginBottom: 10 }}>
          Partner / directory account
        </Link>
        <Link className="btn btn-ghost" href="/reset?request=admin" style={{ width: "100%" }}>
          Ferguson Law back-office (admin)
        </Link>
      </div>
    </div>
  );
}

/* ---------- request a reset link by email ---------- */
function RequestForm({ scope }: { scope: Scope }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, email: email.trim() }),
      });
    } catch {
      /* generic response either way */
    }
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="dir-wrap">
        <div className="dir-form">
          <h1>Check your email</h1>
          <p className="lede">
            If an account exists for <strong>{email.trim() || "that address"}</strong>, we&apos;ve sent a link to set a
            new password. It expires in one hour.
          </p>
          <Link className="btn btn-ghost" href={scope === "admin" ? "/admin" : "/directory/login"} style={{ width: "100%" }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dir-wrap">
      <form className="dir-form" onSubmit={onSubmit} noValidate>
        <h1>Forgot your password?</h1>
        <p className="lede">
          Enter your {scope === "admin" ? "back-office" : "partner"} email and we&apos;ll send you a secure link to set a
          new one.
        </p>
        <div className="dform-field">
          <label htmlFor="em">Email</label>
          <input
            id="em"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoFocus
          />
        </div>
        <button className="btn btn-gold" type="submit" disabled={busy || !email.trim()} style={{ width: "100%" }}>
          {busy ? "Sending…" : "Email me a link"}
        </button>
        <div className="dform-alt">
          <Link href={scope === "admin" ? "/admin" : "/directory/login"}>Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}

/* ---------- set a new password from a one-time link ---------- */
function ConsumeForm({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<{ scope: Scope; email: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Scope | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const sb = createClient();
      const { data } = await sb.rpc("fl_reset_info", { p_token: token });
      if (!active) return;
      const row = Array.isArray(data) && data.length ? (data[0] as { scope: Scope; email: string }) : null;
      setInfo(row);
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setBusy(true);
    const sb = createClient();
    const { data, error } = await sb.rpc("fl_consume_reset", { p_token: token, p_new_password: pw });
    setBusy(false);
    if (error) return setErr("This link is invalid or has expired. Please request a new one.");
    setDone((data as Scope) ?? info?.scope ?? "partner");
  }

  if (checking) {
    return (
      <div className="dir-wrap">
        <div className="dir-form">
          <p className="lede">Checking your link…</p>
        </div>
      </div>
    );
  }

  if (done) {
    const toLogin = done === "admin" ? "/admin" : "/directory/login";
    return (
      <div className="dir-wrap">
        <div className="dir-form">
          <h1>Password set</h1>
          <p className="lede">You can now sign in with your new password.</p>
          <button className="btn btn-gold" onClick={() => router.push(toLogin)} style={{ width: "100%" }}>
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="dir-wrap">
        <div className="dir-form">
          <h1>Link expired</h1>
          <p className="lede">This link is invalid or has already been used. Please request a new one.</p>
          <Link className="btn btn-gold" href="/reset" style={{ width: "100%" }}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dir-wrap">
      <form className="dir-form" onSubmit={onSubmit} noValidate>
        <h1>Set your password</h1>
        <p className="lede">
          Choose a new password for <strong>{info.email}</strong>.
        </p>
        {err && <div className="dform-err">{err}</div>}
        <div className="dform-field">
          <label htmlFor="pw">New password</label>
          <input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </div>
        <div className="dform-field">
          <label htmlFor="pw2">Confirm password</label>
          <input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <button className="btn btn-gold" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Saving…" : "Set password"}
        </button>
        <p className="lede" style={{ fontSize: 13, marginTop: 10 }}>At least 8 characters. Keep it private.</p>
      </form>
    </div>
  );
}
