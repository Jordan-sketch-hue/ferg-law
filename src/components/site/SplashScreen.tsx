"use client";
import { useEffect, useState } from "react";

/**
 * Ferguson Law splash screen — shows once per browser session.
 * Dark forest, F-mark spring animation, 2.1s auto-dismiss.
 */
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("fl_splashed")) return;
      sessionStorage.setItem("fl_splashed", "1");
    } catch { return; }

    setVisible(true);
    const t1 = setTimeout(() => setLeaving(true), 1750);
    const t2 = setTimeout(() => setVisible(false), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #0D1F15 0%, #081410 60%, #040c07 100%)",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.35s ease",
        pointerEvents: leaving ? "none" : "all",
      }}
    >
      {/* F-mark */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 18,
        background: "linear-gradient(150deg, #1B4D32, #0a2318)",
        border: "1.5px solid rgba(200,166,92,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "1.25rem",
        animation: "fl-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) both",
        animationDelay: "0.1s",
      }}>
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "2rem",
          fontWeight: 700,
          color: "#C8A65C",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}>F</span>
      </div>

      {/* Wordmark */}
      <div style={{
        textAlign: "center",
        animation: "fl-fade-up 0.5s ease both",
        animationDelay: "0.25s",
      }}>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#C8A65C",
          letterSpacing: "0.1em",
          marginBottom: "0.25rem",
        }}>
          Ferguson Law
        </div>
        <div style={{
          fontSize: "0.6rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(200,166,92,0.45)",
          fontFamily: "system-ui, sans-serif",
        }}>
          Jamaica&apos;s property law firm
        </div>
      </div>

      <style>{`
        @keyframes fl-pop {
          from { opacity: 0; transform: scale(0.7); }
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
