"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "buyer" | "seller" | "diaspora" | "professional";

const GLD = "#C8A65C";
const BG = "linear-gradient(160deg, #0D1F15 0%, #081410 60%, #040c07 100%)";

const btnStyle = (primary = true): React.CSSProperties => ({
  padding: "14px 0",
  borderRadius: 14,
  border: primary ? "none" : "1px solid rgba(200,166,92,0.35)",
  background: primary ? GLD : "transparent",
  color: primary ? "#040c07" : GLD,
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: "pointer",
  width: "100%",
  letterSpacing: "0.02em",
  transition: "opacity 0.15s",
  WebkitTapHighlightColor: "transparent",
});

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(200,166,92,0.18)",
  borderRadius: 16,
  padding: "18px 20px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  color: "#d4b896",
  fontFamily: "system-ui, sans-serif",
  fontSize: "0.9rem",
  display: "flex",
  alignItems: "center",
  gap: 14,
  transition: "border-color 0.15s, background 0.15s",
  WebkitTapHighlightColor: "transparent",
};

function FMark() {
  return (
    <div style={{ textAlign: "center", marginBottom: 36 }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: "linear-gradient(150deg, #1B4D32, #0a2318)",
        border: "1.5px solid rgba(200,166,92,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 12px",
      }}>
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "1.8rem",
          fontWeight: 700,
          color: GLD,
          lineHeight: 1,
        }}>F</span>
      </div>
      <div style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "1rem",
        fontWeight: 700,
        color: GLD,
        letterSpacing: "0.08em",
      }}>
        Ferguson Law
      </div>
      <div style={{
        fontSize: "0.58rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "rgba(200,166,92,0.45)",
        fontFamily: "system-ui, sans-serif",
        marginTop: 3,
      }}>
        Jamaica&apos;s property law firm
      </div>
    </div>
  );
}

export default function PwaOnboarding() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    try {
      if (localStorage.getItem("fl_onboarded")) return;
    } catch { return; }
    setShow(true);
  }, []);

  function finish(path: string) {
    try { localStorage.setItem("fl_onboarded", "1"); } catch { /* noop */ }
    setShow(false);
    router.push(path);
  }

  if (!show) return null;

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 99990,
    background: BG,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  };

  const inner: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "env(safe-area-inset-top,24px) 24px calc(env(safe-area-inset-bottom,24px) + 24px)",
    minHeight: "100%",
    boxSizing: "border-box",
    maxWidth: 420,
    margin: "0 auto",
    width: "100%",
  };

  const heading: React.CSSProperties = {
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "#d4b896",
    fontWeight: 700,
    fontSize: "clamp(1.3rem,5vw,1.7rem)",
    lineHeight: 1.25,
    marginBottom: 8,
    textAlign: "center",
  };

  const sub: React.CSSProperties = {
    color: "rgba(200,166,92,0.6)",
    fontFamily: "system-ui, sans-serif",
    fontSize: "0.85rem",
    marginBottom: 28,
    lineHeight: 1.5,
    textAlign: "center",
  };

  const ROLES: { emoji: string; title: string; desc: string; role: Role; path: string }[] = [
    {
      emoji: "🏠",
      title: "Buy property in Jamaica",
      desc: "Conveyancing, title search, NHT — guided start to finish",
      role: "buyer",
      path: "/booking?type=property_purchase",
    },
    {
      emoji: "🌐",
      title: "Diaspora / overseas transaction",
      desc: "Remote handling for buyers and sellers living abroad",
      role: "diaspora",
      path: "/booking?type=diaspora",
    },
    {
      emoji: "📋",
      title: "Estate, will or other matter",
      desc: "Estate planning, wills, general legal guidance",
      role: "seller",
      path: "/booking?type=estate",
    },
    {
      emoji: "👔",
      title: "I'm a professional",
      desc: "Join the Ferguson Law professional network",
      role: "professional",
      path: "/directory/join",
    },
  ];

  return (
    <div style={overlay}>
      <div style={inner}>
        <FMark />
        <h1 style={heading}>What brings you in today?</h1>
        <p style={sub}>We&apos;ll take you straight to the right place.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ROLES.map(({ emoji, title, desc, path }) => (
            <button
              key={path}
              style={cardStyle}
              onClick={() => finish(path)}
            >
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{emoji}</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2, color: "#d4b896" }}>{title}</div>
                <div style={{ fontSize: "0.73rem", color: "rgba(200,166,92,0.5)" }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button style={btnStyle(false)} onClick={() => finish("/auth")}>
            Sign in to my account
          </button>
          <button
            style={{ ...btnStyle(false), border: "none", fontSize: "0.78rem", opacity: 0.45, padding: "8px 0" }}
            onClick={() => finish("/")}
          >
            Explore the website
          </button>
        </div>
      </div>
    </div>
  );
}
