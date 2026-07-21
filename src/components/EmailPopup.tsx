"use client";

import { useEffect, useState } from "react";

type Step = "idle" | "open" | "sending" | "done" | "error";

export default function EmailPopup() {
  const [step, setStep] = useState<Step>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("consultation");

  useEffect(() => {
    if (sessionStorage.getItem("fl_popup_seen")) return;
    // Show only on exit-intent (cursor leaves toward the top of the viewport)
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 8) {
        setStep((s) => (s === "idle" ? "open" : s));
      }
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  function dismiss() {
    sessionStorage.setItem("fl_popup_seen", "1");
    setStep("idle");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStep("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, interest }),
      });
      if (!res.ok) throw new Error("send failed");
      sessionStorage.setItem("fl_popup_seen", "1");
      setStep("done");
    } catch {
      setStep("error");
    }
  }

  if (step === "idle") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Get in touch with Ferguson Law"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(10,24,16,.72)",
        backdropFilter: "blur(4px)",
        animation: "fl_fadein .3s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <style>{`
        @keyframes fl_fadein{from{opacity:0}to{opacity:1}}
        @keyframes fl_slidein{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        .fl-popup{animation:fl_slidein .35s ease}
        .fl-popup input,
        .fl-popup select{outline:none;width:100%;border:1.5px solid #d8d0c3;border-radius:8px;padding:10px 13px;font-size:14px;background:#faf8f4;color:#1a1a1a;transition:border-color .2s,box-shadow .2s;font-family:inherit;}
        .fl-popup input:focus,
        .fl-popup select:focus{border-color:#c4922a;box-shadow:0 0 0 3px rgba(196,146,42,.14);}
        .fl-popup .fl-btn{width:100%;background:#c4922a;color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;transition:background .2s;}
        .fl-popup .fl-btn:hover{background:#d4a94a;}
        .fl-popup .fl-btn:disabled{opacity:.6;cursor:default;}
      `}</style>

      <div
        className="fl-popup"
        style={{
          background: "#fff",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "420px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,.22)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ background: "#1C3A28", padding: "28px 28px 22px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "#c4922a", marginBottom: "8px" }}>
            Ferguson Law
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "20px", color: "#fff", lineHeight: 1.25, marginBottom: "6px" }}>
            {step === "done" ? "We'll be in touch." : "Speak with an attorney."}
          </div>
          <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,.55)" }}>
            {step === "done"
              ? "Check your inbox — a confirmation is on its way."
              : "Free first response. No obligation."}
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "rgba(255,255,255,.45)", fontSize: "20px", cursor: "pointer", lineHeight: 1, padding: "4px 8px" }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px" }}>
          {step === "done" ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>✓</div>
              <div style={{ fontSize: "14px", color: "#6b6560", lineHeight: 1.6 }}>
                We've sent a confirmation to <strong style={{ color: "#1a1a1a" }}>{email}</strong>.<br />
                Expect a reply from <strong>contact@fergusonlawja.com</strong> within one business day.
              </div>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: ".06em", color: "#1a1a1a", marginBottom: "5px", textTransform: "uppercase" }}>
                  Your name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Campbell"
                  autoComplete="name"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: ".06em", color: "#1a1a1a", marginBottom: "5px", textTransform: "uppercase" }}>
                  Email address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: ".06em", color: "#1a1a1a", marginBottom: "5px", textTransform: "uppercase" }}>
                  How can we help?
                </label>
                <select value={interest} onChange={(e) => setInterest(e.target.value)}>
                  <option value="consultation">Book a consultation</option>
                  <option value="conveyancing">Property conveyancing / title transfer</option>
                  <option value="home-listing">Join the H.O.M.E.™ professional directory</option>
                  <option value="corporate">Corporate & commercial law</option>
                  <option value="family">Family law</option>
                  <option value="other">Other enquiry</option>
                </select>
              </div>
              {step === "error" && (
                <div style={{ fontSize: "12.5px", color: "#c0282a", background: "#fff0f0", borderRadius: "7px", padding: "9px 12px" }}>
                  Something went wrong. Please try again or call us directly.
                </div>
              )}
              <button className="fl-btn" type="submit" disabled={step === "sending"}>
                {step === "sending" ? "Sending…" : "Send my enquiry →"}
              </button>
              <p style={{ fontSize: "11px", color: "#9a9a9a", textAlign: "center", margin: 0 }}>
                We reply within one business day. No spam.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
