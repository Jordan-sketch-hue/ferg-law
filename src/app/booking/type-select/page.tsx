"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

const MATTER_TYPES = [
  {
    id: "property_purchase",
    label: "Buy property in Jamaica",
    desc: "Conveyancing, title search, NHT, closing",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" style={{ width: 36, height: 36 }}>
        <rect width="40" height="40" rx="10" fill="#1B4D32" fillOpacity=".1" />
        <path d="M8 22 L20 10 L32 22 V34 H24V26H16V34H8V22Z" fill="#1B4D32" />
      </svg>
    ),
  },
  {
    id: "diaspora",
    label: "Diaspora land transaction",
    desc: "For overseas buyers — we handle everything remotely",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" style={{ width: 36, height: 36 }}>
        <rect width="40" height="40" rx="10" fill="#C8A65C" fillOpacity=".12" />
        <circle cx="20" cy="20" r="11" stroke="#C8A65C" strokeWidth="2" />
        <path d="M20 9 Q25 15 25 20 Q25 25 20 31 Q15 25 15 20 Q15 15 20 9Z" stroke="#C8A65C" strokeWidth="1.5" fill="none" />
        <line x1="9" y1="20" x2="31" y2="20" stroke="#C8A65C" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "estate_will",
    label: "Estate / Will",
    desc: "Estate administration, probate, wills & trusts",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" style={{ width: 36, height: 36 }}>
        <rect width="40" height="40" rx="10" fill="#1B4D32" fillOpacity=".08" />
        <rect x="11" y="8" width="18" height="24" rx="3" stroke="#1B4D32" strokeWidth="2" />
        <line x1="15" y1="15" x2="25" y2="15" stroke="#1B4D32" strokeWidth="1.5" />
        <line x1="15" y1="19" x2="25" y2="19" stroke="#1B4D32" strokeWidth="1.5" />
        <line x1="15" y1="23" x2="21" y2="23" stroke="#1B4D32" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "general",
    label: "Other / General",
    desc: "Corporate, family law, IP, or a question first",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" style={{ width: 36, height: 36 }}>
        <rect width="40" height="40" rx="10" fill="#1B4D32" fillOpacity=".08" />
        <circle cx="20" cy="16" r="5" stroke="#1B4D32" strokeWidth="2" />
        <path d="M20 21 C14 21 11 25 11 28" stroke="#1B4D32" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 21 C26 21 29 25 29 28" stroke="#1B4D32" strokeWidth="2" strokeLinecap="round" />
        <circle cx="29" cy="29" r="4" fill="#C8A65C" />
        <text x="29" y="32" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">?</text>
      </svg>
    ),
  },
] as const;

const MATTER_LABELS: Record<string, string> = {
  property_purchase: "Property Purchase",
  diaspora: "Diaspora Transaction",
  estate_will: "Estate / Will",
  general: "General",
};

// ── Splash ────────────────────────────────────────────────────────────────────

function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 1600);
    const t3 = setTimeout(onDone, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0D1F15",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "1.25rem",
      opacity: phase === "out" ? 0 : 1,
      transition: phase === "out" ? "opacity 0.5s ease" : phase === "in" ? "opacity 0.4s ease" : "none",
    }}>
      {/* Animated F mark */}
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: "linear-gradient(150deg,#1B4D32,#0a2318)",
        border: "1.5px solid rgba(200,166,92,.5)",
        display: "grid", placeItems: "center",
        boxShadow: "0 0 40px rgba(200,166,92,.15)",
        transform: phase === "in" ? "scale(0.8)" : "scale(1)",
        opacity: phase === "in" ? 0 : 1,
        transition: "transform 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.4s ease",
      }}>
        <span style={{ fontFamily: "var(--font-fraunces,serif)", fontWeight: 700, fontSize: "1.8rem", color: "#C8A65C" }}>F</span>
      </div>
      <div style={{ textAlign: "center", opacity: phase === "in" ? 0 : 1, transition: "opacity 0.5s ease 0.2s" }}>
        <p style={{ fontFamily: "var(--font-fraunces,serif)", fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#C8A65C", margin: "0 0 0.4rem" }}>
          Ferguson Law
        </p>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.45)", margin: 0 }}>
          Jamaica&apos;s trusted property law firm
        </p>
      </div>
      {/* Pulse ring */}
      <div style={{
        position: "absolute", width: 120, height: 120, borderRadius: "50%",
        border: "1px solid rgba(200,166,92,.18)",
        animation: "fl-pulse 2s ease-in-out infinite",
      }} />
      <style>{`@keyframes fl-pulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.3);opacity:0}}`}</style>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TypeSelectPage() {
  const router = useRouter();
  const [splash, setSplash] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!splash) setTimeout(() => setVisible(true), 50);
  }, [splash]);

  function select(id: string) {
    try { localStorage.setItem("fl_matter_type", id); } catch { /* noop */ }
    router.push("/booking");
  }

  return (
    <>
      {splash && <Splash onDone={() => setSplash(false)} />}
    <div style={{
      minHeight: "100dvh",
      background: "#F7F2E8",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.4s ease",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1.25rem",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "linear-gradient(150deg,#1B4D32,#0D3324)",
          color: "#C8A65C", display: "grid", placeItems: "center",
          fontFamily: "var(--serif)", fontWeight: 700, fontSize: "1.3rem",
          margin: "0 auto 1rem",
          border: "1px solid rgba(200,166,92,.35)",
        }}>F</div>
        <p style={{ fontFamily: "var(--serif)", fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#C8A65C", margin: 0 }}>Ferguson Law</p>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.6rem,3.5vw,2.2rem)", color: "#0D1F15", margin: "0.5rem 0 0.5rem", lineHeight: 1.1 }}>
          What brings you in today?
        </h1>
        <p style={{ color: "#5c645e", fontSize: "0.95rem", maxWidth: 440, margin: "0 auto" }}>
          We&apos;ll tailor your consultation to your specific needs.
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: "1rem",
        maxWidth: 720,
        width: "100%",
      }}>
        {MATTER_TYPES.map(m => (
          <button
            key={m.id}
            onClick={() => select(m.id)}
            style={{
              background: "#fff",
              border: "1.5px solid rgba(18,16,12,.1)",
              borderRadius: 14,
              padding: "1.5rem",
              textAlign: "left",
              cursor: "pointer",
              transition: "transform .18s, border-color .18s, box-shadow .18s",
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#C8A65C";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 32px -10px rgba(200,166,92,.25)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(18,16,12,.1)";
              (e.currentTarget as HTMLButtonElement).style.transform = "";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
            }}
          >
            {m.icon}
            <div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "1.05rem", fontWeight: 600, color: "#0D1F15", marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#69736d", lineHeight: 1.5 }}>
                {m.desc}
              </div>
            </div>
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color: "#C8A65C", fontSize: "0.82rem", fontWeight: 600 }}>
              Book consultation
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M3 8h10M8 4l5 4-5 4" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Skip / live site links */}
      <div style={{ marginTop: "2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: "center" }}>
        <Link href="/booking" style={{ color: "#69736d", fontSize: "0.85rem", textDecoration: "underline", textUnderlineOffset: 3 }}>
          Skip — go straight to booking
        </Link>
        <a
          href="https://fergusonlawja.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#C8A65C", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}
        >
          View full website
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 11, height: 11 }}>
            <path d="M2 10L10 2M10 2H5M10 2v5" />
          </svg>
        </a>
      </div>

      <p style={{ marginTop: "2rem", fontSize: "0.72rem", color: "#9a937f", letterSpacing: "0.06em" }}>
        20-min consultation · No obligation · Online or in-person
      </p>
    </div>
    </>
  );
}

export { MATTER_LABELS };
