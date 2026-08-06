"use client";

import { useState } from "react";

interface EbookGateProps {
  onPurchaseStart?: (ref: string, payUrl: string) => void;
}

export default function EbookPaymentGate({ onPurchaseStart }: EbookGateProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!emailRe.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ebook/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { ok?: boolean; payUrl?: string; error?: string };
      if (data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Could not reach the server. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(165deg,#1a3828 0%,#0e2518 100%)",
        padding: "2rem 1.5rem",
        borderRadius: 12,
        border: "1px solid rgba(215,175,91,.2)",
        maxWidth: 400,
        margin: "0 auto",
        color: "var(--paper)",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: "1.4rem",
          color: "#fff",
          margin: "0 0 .5rem",
        }}
      >
        Unlock the H.O.M.E.® Guide
      </h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: ".5rem", margin: "0 0 .4rem" }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: "1.8rem", color: "var(--gold)", fontWeight: 700 }}>J$3,000</span>
        <span style={{ color: "rgba(246,242,234,.55)", fontSize: ".9rem" }}>/ US$20</span>
      </div>
      <p style={{ color: "rgba(246,242,234,.7)", margin: "0 0 1.5rem", fontSize: ".9rem" }}>
        Instant access to download or read online.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="gateEmail"
            style={{
              display: "block",
              fontSize: ".85rem",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              color: "var(--gold)",
              marginBottom: ".5rem",
            }}
          >
            Email
          </label>
          <input
            id="gateEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: ".75rem",
              border: "1px solid rgba(215,175,91,.3)",
              borderRadius: 6,
              background: "rgba(255,255,255,.05)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: ".95rem",
            }}
            disabled={loading}
          />
        </div>

        {error && (
          <p style={{ color: "#faa", fontSize: ".85rem", margin: "0 0 1rem" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: ".75rem 1rem",
            background: "var(--gold)",
            border: "none",
            borderRadius: 6,
            color: "#000",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Opening checkout..." : "Get the Guide — J$3,000"}
        </button>
      </form>

      <p style={{ fontSize: ".8rem", color: "rgba(246,242,234,.5)", margin: "1rem 0 0", textAlign: "center" }}>
        Secure payment powered by WiPay
      </p>
    </div>
  );
}
