"use client";

import { useState, useMemo } from "react";

const PRIMARY = "#102A1E";
const GOLD = "#C8A65C";
const DARK = "#1a1a1a";
const MUTED = "#5c6a60";
const BORDER = "#dde5dd";
const LIGHT_BG = "#f9faf7";

const PARISHES: Record<string, { land: [number, number]; built: [number, number]; label: string }> = {
  "Kingston & St. Andrew": { land: [8000, 25000], built: [15000, 30000], label: "Kingston & St. Andrew" },
  "St. James":             { land: [5000, 18000], built: [12000, 22000], label: "St. James" },
  "St. Catherine":         { land: [3000, 12000], built: [10000, 18000], label: "St. Catherine" },
  "Clarendon":             { land: [2500,  8000], built: [ 9000, 15000], label: "Clarendon" },
  "Manchester":            { land: [2500,  8000], built: [ 9000, 16000], label: "Manchester" },
  "St. Elizabeth":         { land: [2000,  6000], built: [ 8000, 14000], label: "St. Elizabeth" },
  "Trelawny":              { land: [3000, 10000], built: [ 9000, 16000], label: "Trelawny" },
  "St. Ann":               { land: [4000, 14000], built: [10000, 19000], label: "St. Ann" },
  "St. Mary":              { land: [2500,  8000], built: [ 8000, 14000], label: "St. Mary" },
  "Portland":              { land: [2000,  7000], built: [ 8000, 14000], label: "Portland" },
  "St. Thomas":            { land: [2000,  6000], built: [ 7000, 13000], label: "St. Thomas" },
  "Westmoreland":          { land: [2500,  8000], built: [ 8000, 14000], label: "Westmoreland" },
  "Hanover":               { land: [3000, 10000], built: [ 9000, 16000], label: "Hanover" },
};

const PROPERTY_TYPES = [
  { value: "house",      label: "House / Villa" },
  { value: "apartment",  label: "Apartment / Condo" },
  { value: "land",       label: "Vacant Land" },
  { value: "commercial", label: "Commercial Property" },
];

const CONDITIONS: Record<string, number> = {
  excellent: 1.15,
  good:      1.0,
  fair:      0.85,
  poor:      0.7,
};

const CONDITION_LABELS = [
  { value: "excellent", label: "Excellent / New" },
  { value: "good",      label: "Good" },
  { value: "fair",      label: "Fair" },
  { value: "poor",      label: "Poor / Needs work" },
];

function fmtJmd(n: number): string {
  return new Intl.NumberFormat("en-JM", {
    style: "currency", currency: "JMD", maximumFractionDigits: 0,
  }).format(n);
}
function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

const INPUT_STYLE = {
  display: "block", width: "100%", boxSizing: "border-box" as const,
  border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px",
  fontSize: 14, color: DARK, background: "#fff", appearance: "none" as const,
  outline: "none",
};
const LABEL_STYLE = {
  display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
  color: MUTED, marginBottom: 7, textTransform: "uppercase" as const,
};

export default function ValuationEstimatorClient() {
  const [parish,    setParish]    = useState("");
  const [propType,  setPropType]  = useState("house");
  const [landArea,  setLandArea]  = useState("");
  const [builtArea, setBuiltArea] = useState("");
  const [condition, setCondition] = useState("good");
  const [nlaRef,    setNlaRef]    = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!parish || !landArea) return null;
    const pData = PARISHES[parish];
    if (!pData) return null;
    const land = parseFloat(landArea);
    if (!land || land <= 0) return null;
    const built = (propType !== "land" && parseFloat(builtArea)) || 0;
    const condMult = CONDITIONS[condition] ?? 1;
    const typeMult = propType === "apartment" ? 0.82 : propType === "commercial" ? 1.25 : 1;
    const totalLow  = (pData.land[0] * land * condMult + (built > 0 ? pData.built[0] * built * condMult : 0)) * typeMult;
    const totalHigh = (pData.land[1] * land * condMult + (built > 0 ? pData.built[1] * built * condMult : 0)) * typeMult;
    const midJmd = (totalLow + totalHigh) / 2;
    return { totalLow, totalHigh, midJmd, midUsd: midJmd / 157, parishLabel: pData.label };
  }, [parish, propType, landArea, builtArea, condition]);

  const canSubmit = Boolean(parish && landArea);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", transform: "translateY(-28px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 8px 48px rgba(16,42,30,0.13)", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
        {/* Card header */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${BORDER}`, background: LIGHT_BG, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: PRIMARY }}>Valuation Estimator</p>
            <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Free indicative estimate — not a formal valuation</p>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>

            {/* NLA Reference */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={LABEL_STYLE}>
                NLA / Property Reference
                <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 4, color: "#aab5aa" }}>(optional)</span>
              </label>
              <input
                value={nlaRef}
                onChange={e => setNlaRef(e.target.value)}
                placeholder="e.g. 1/89/7245"
                style={INPUT_STYLE}
              />
            </div>

            {/* Parish */}
            <div>
              <label style={LABEL_STYLE}>
                Parish <span style={{ color: GOLD }}>*</span>
              </label>
              <select value={parish} onChange={e => { setParish(e.target.value); setSubmitted(false); }} style={INPUT_STYLE}>
                <option value="">Select parish…</option>
                {Object.keys(PARISHES).map(p => (
                  <option key={p} value={p}>{PARISHES[p].label}</option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label style={LABEL_STYLE}>
                Property Type <span style={{ color: GOLD }}>*</span>
              </label>
              <select value={propType} onChange={e => { setPropType(e.target.value); setSubmitted(false); }} style={INPUT_STYLE}>
                {PROPERTY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Land Area */}
            <div>
              <label style={LABEL_STYLE}>
                Land Area (sq ft) <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={landArea}
                onChange={e => { setLandArea(e.target.value); setSubmitted(false); }}
                placeholder="e.g. 6000"
                style={INPUT_STYLE}
              />
            </div>

            {/* Built Area — hidden for vacant land */}
            {propType !== "land" && (
              <div>
                <label style={LABEL_STYLE}>Built / Floor Area (sq ft)</label>
                <input
                  type="number"
                  min="0"
                  value={builtArea}
                  onChange={e => { setBuiltArea(e.target.value); setSubmitted(false); }}
                  placeholder="e.g. 1800"
                  style={INPUT_STYLE}
                />
              </div>
            )}

            {/* Condition */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={LABEL_STYLE}>Condition</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CONDITION_LABELS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { setCondition(c.value); setSubmitted(false); }}
                    style={{
                      padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", transition: "all .15s", border: "1.5px solid",
                      borderColor: condition === c.value ? PRIMARY : BORDER,
                      background:  condition === c.value ? PRIMARY : "#fff",
                      color:       condition === c.value ? "#fff"  : DARK,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!canSubmit}
            style={{
              marginTop: 24, width: "100%",
              background: canSubmit ? PRIMARY : "#d0d8d0",
              color:      canSubmit ? "#fff"  : "#9aada0",
              border: "none", borderRadius: 12, padding: "15px 0",
              fontSize: 15, fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              letterSpacing: ".03em",
            }}
          >
            Get Estimate
          </button>
        </div>
      </div>

      {/* Result panel */}
      {submitted && result && (
        <div style={{ marginTop: 20, borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 48px rgba(16,42,30,0.18)" }}>
          <div style={{ background: PRIMARY, padding: "28px 32px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: ".15em", textTransform: "uppercase" }}>
              Indicative Valuation
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              {result.parishLabel}
            </p>
            <div style={{ fontSize: "clamp(1.4rem,4vw,2rem)", fontWeight: 700, fontFamily: "Georgia, serif", color: "#fff", lineHeight: 1.3 }}>
              {fmtJmd(result.totalLow)}<br />— {fmtJmd(result.totalHigh)}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
              {`\u2248 ${fmtUsd(result.totalLow / 157)} \u2013 ${fmtUsd(result.totalHigh / 157)} USD`}
            </div>
          </div>

          <div style={{ background: LIGHT_BG, padding: "20px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderBottom: `1px solid ${BORDER}` }}>
            {[
              { label: "Mid-point (JMD)", value: fmtJmd(result.midJmd) },
              { label: "Mid-point (USD)", value: fmtUsd(result.midUsd) },
            ].map(item => (
              <div key={item.label} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: PRIMARY }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", padding: "20px 32px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", borderRadius: "0 0 20px 20px" }}>
            <p style={{ margin: 0, fontSize: 13, color: MUTED, flex: 1, minWidth: 180, lineHeight: 1.55 }}>
              Need a certified valuation for a bank or NHT application?
            </p>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <a
                href="/booking"
                style={{ display: "inline-block", padding: "10px 20px", background: PRIMARY, color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
              >
                Book a consultation
              </a>
              <a
                href="https://www.nla.gov.jm"
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", padding: "10px 20px", border: `1.5px solid ${BORDER}`, color: DARK, borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                Find a valuator
              </a>
            </div>
          </div>
        </div>
      )}

      {submitted && !result && (
        <div style={{ marginTop: 16, background: "#fff5f5", borderRadius: 12, padding: "16px 20px", color: "#c0392b", fontSize: 14, border: "1px solid #fde8e8" }}>
          Please select a parish and enter the land area to generate an estimate.
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 11, color: "#9aada0", lineHeight: 1.7, textAlign: "center", padding: "0 1rem" }}>
        Benchmarks based on Jamaica real estate market data (mid-2026). Actual values vary by location, title status, NHT approval, and local demand. Ferguson Law is not a valuation firm.
      </p>
    </div>
  );
}