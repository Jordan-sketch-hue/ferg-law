"use client";
import { useLayoutEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useLayoutEffect(() => {
    // Inline script already set data-splashing synchronously before first paint.
    // If it's present, the CSS already hid other body children — just show the splash.
    if (!document.documentElement.hasAttribute("data-splashing")) return;
    setVisible(true);
    const t1 = setTimeout(() => setLeaving(true), 1750);
    const t2 = setTimeout(() => {
      document.documentElement.removeAttribute("data-splashing");
      setVisible(false);
    }, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      data-splash-overlay
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.35s ease",
        pointerEvents: leaving ? "none" : "all",
      }}
    >
      {/* Real brand logo — minimum 180px to keep circle + script legible */}
      <img
        src="/ferguson-law-logo.jpg"
        alt="Ferguson Law"
        style={{
          width: "min(50vw, 200px)",
          height: "min(50vw, 200px)",
          objectFit: "contain",
          animation: "fl-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) both",
          animationDelay: "0.1s",
        }}
      />

      {/* Tagline beneath logo */}
      <div style={{
        marginTop: "1.5rem",
        fontSize: "0.6rem",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(200,166,92,0.55)",
        fontFamily: "system-ui, sans-serif",
        animation: "fl-fade-up 0.5s ease both",
        animationDelay: "0.3s",
      }}>
        Counsel · Care · Competence
      </div>

      <style>{`
        @keyframes fl-pop {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fl-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
