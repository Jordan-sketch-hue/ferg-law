"use client";

import { useMemo, useState } from "react";

const GREEN  = "#102A1E";
const GOLD   = "#C8A65C";
const INK    = "#1a1a1a";
const MUTED  = "#5c6a60";
const BORDER = "#dde5dd";

const BENCHMARKS: Record<string, { land: [number,number]; built: [number,number]; label: string }> = {
  "Kingston & St. Andrew": { land: [8000,25000],  built: [15000,30000], label: "Kingston & St. Andrew" },
  "St. James":             { land: [5000,18000],  built: [12000,22000], label: "St. James" },
  "St. Catherine":         { land: [3000,12000],  built: [10000,18000], label: "St. Catherine" },
  "Clarendon":             { land: [2500,8000],   built: [9000, 15000], label: "Clarendon" },
  "Manchester":            { land: [2500,8000],   built: [9000, 16000], label: "Manchester" },
  "St. Elizabeth":         { land: [2000,6000],   built: [8000, 14000], label: "St. Elizabeth" },
  "Trelawny":              { land: [3000,10000],  built: [9000, 16000], label: "Trelawny" },
  "St. Ann":               { land: [4000,14000],  built: [10000,19000], label: "St. Ann" },
  "St. Mary":              { land: [2500,8000],   built: [8000, 14000], label: "St. Mary" },
  "Portland":              { land: [2000,7000],   built: [8000, 14000], label: "Portland" },
  "St. Thomas":            { land: [2000,6000],   built: [7000, 13000], label: "St. Thomas" },
  "Westmoreland":          { land: [2500,8000],   built: [8000, 14000], label: "Westmoreland" },
  "Hanover":               { land: [3000,10000],  built: [9000, 16000], label: "Hanover" },
};

const PROPERTY_TYPES = [
  { value: "house",      label: "House / Villa" },
  { value: "apartment",  label: "Apartment / Condo" },
  { value: "land",       label: "Vacant Land" },
  { value: "commercial", label: "Commercial Property" },
];

const CONDITION_MULT: Record<string,number> = {
  excellent: 1.15, good: 1.0, fair: 0.85, poor: 0.70,
};

const CONDITIONS = [
  { value: "excellent", label: "Excellent / New" },
  { value: "good",      label: "Good" },
  { value: "fair",      label: "Fair" },
  { value: "poor",      label: "Poor / Needs work" },
];

function fmtJmd(n: number) {
  return new Intl.NumberFormat("en-JM", { style: "currency", currency: "JMD", maximumFractionDigits: 0 }).format(n);
}
function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box",
  border: `1.5px solid ${BORDER}`, borderRadius: 12,
  padding: "12px 16px", fontSize: 14, color: INK,
  background: "#fff", appearance: "none",
  transition: "border-color .15s",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: ".1em", color: MUTED, marginBottom: 7,
  textTransform: "uppercase",
};

export default function ValuationEstimatorClient() {
  const [parish,    setParish]    = useState("");
  const [propType,  setPropType]  = useState("house");
  const [landSqft,  setLandSqft]  = useState("");
  const [builtSqft, setBuiltSqft] = useState("");
  const [condition, setCondition] = useState("good");
  const [propRef,   setPropRef]   = useState("");
  const [shown,     setShown]     = useState(false);

  const result = useMemo(() => {
    if (!parish || !landSqft) return null;
    const bench = BENCHMARKS[parish];
    if (!bench) return null;
    const landArea  = parseFloat(landSqft);
    const builtArea = propType !== "land" ? parseFloat(builtSqft) || 0 : 0;
    if (!landArea || landArea <= 0) return null;
    const mult      = CONDITION_MULT[condition] ?? 1;
    const typeMult  = propType === "apartment" ? 0.82 : propType === "commercial" ? 1.25 : 1.0;
    const totalLow  = (bench.land[0]*landArea*mult + (builtArea>0 ? bench.built[0]*builtArea*mult : 0)) * typeMult;
    const totalHigh = (bench.land[1]*landArea*mult + (builtArea>0 ? bench.built[1]*builtArea*mult : 0)) * typeMult;
    const midJmd    = (totalLow + totalHigh) / 2;
    return { totalLow, totalHigh, midJmd, midUsd: midJmd / 157, parish: bench.label };
  }, [parish, propType, landSqft, builtSqft, condition]);

  const canEstimate = parish && landSqft;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", transform: "translateY(-28px)" }}>

      {/* Card */}
      <div style={{
        background: "#fff", borderRadius: 20,
        boxShadow: "0 8px 48px rgba(16,42,30,0.13)",
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
      }}>
        {/* Card header */}
        <div style={{
          padding: "20px 28px",
          borderBottom: `1px solid ${BORDER}`,
          background: "#f9faf7",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: GREEN, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 16 }}>🏡</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: GREEN }}>Valuation Estimator</p>
            <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Free indicative estimate — not a formal valuation</p>
          </div>
        </div>

        {/* Form body */}
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>

            {/* Property Reference */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>NLA / Property Reference <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
              <input value={propRef} onChange={e => setPropRef(e.target.value)} placeholder="e.g. 1/89/7245" style={inputStyle} />
            </div>

            {/* Parish */}
            <div>
              <label style={labelStyle}>Parish <span style={{ color: GOLD }}>*</span></label>
              <select value={parish} onChange={e => setParish(e.target.value)} style={inputStyle}>
                <option value="">Select parish…</option>
                {Object.keys(BENCHMARKS).map(p => (
                  <option key={p} value={p}>{BENCHMARKS[p].label}</option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label style={labelStyle}>Property Type <span style={{ color: GOLD }}>*</span></label>
              <select value={propType} onChange={e => setPropType(e.target.value)} style={inputStyle}>
                {PROPERTY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Land Size */}
            <div>
              <label style={labelStyle}>Land Area (sq ft) <span style={{ color: GOLD }}>*</span></label>
              <input type="number" min="0" value={landSqft} onChange={e => setLandSqft(e.target.value)} placeholder="e.g. 6000" style={inputStyle} />
            </div>

            {/* Built Area */}
            {propType !== "land" && (
              <div>
                <label style={labelStyle}>Built / Floor Area (sq ft)</label>
                <input type="number" min="0" value={builtSqft} onChange={e => setBuiltSqft(e.target.value)} placeholder="e.g. 1800" style={inputStyle} />
              </div>
            )}

            {/* Condition pills */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Condition</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CONDITIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setCondition(c.value)} style={{
                    padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", transition: "all .15s", border: "1.5px solid",
                    borderColor: condition === c.value ? GREEN : BORDER,
                    background: condition === c.value ? GREEN : "#fff",
                    color: condition === c.value ? "#fff" : INK,
                  }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="button" onClick={() => setShown(true)} disabled={!canEstimate} style={{
            marginTop: 24, width: "100%",
            background: canEstimate ? GREEN : "#d0d8d0",
            color: canEstimate ? "#fff" : "#9aada0",
            border: "none", borderRadius: 12,
            padding: "15px 0", fontSize: 15, fontWeight: 700,
            cursor: canEstimate ? "pointer" : "not-allowed",
            letterSpacing: ".03em",
            transition: "background .15s",
          }}>
            Get Estimate
          </button>
        </div>
      </div>

      {/* Results */}
      {shown && result && (
        <div style={{
          marginTop: 20, borderRadius: 20, overflow: "hidden",
          boxShadow: "0 8px 48px rgba(16,42,30,0.18)",
        }}>
          {/* Result header */}
          <div style={{ background: GREEN, padding: "28px 32px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: ".15em", textTransform: "uppercase" }}>
              Indicative Valuation
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{result.parish}</p>
            <div style={{ fontSize: "clamp(1.5rem,4vw,2.2rem)", fontWeight: 700, fontFamily: "Georgia, serif", color: "#fff", lineHeight: 1.2 }}>
              {fmtJmd(result.totalLow)}<br />— {fmtJmd(result.totalHigh)}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
              ≈ {fmtUsd(result.totalLow / 157)} – {fmtUsd(result.totalHigh / 157)} USD
            </div>
          </div>

          {/* Stat tiles */}
          <div style={{
            background: "#f9faf7", padding: "20px 32px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
            borderBottom: `1px solid ${BORDER}`,
          }}>
            {[
              { label: "Mid-point (JMD)", value: fmtJmd(result.midJmd) },
              { label: "Mid-point (USD)", value: fmtUsd(result.midUsd) },
            ].map(s => (
              <div key={s.label} style={{
                background: "#fff", border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: "14px 18px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: GREEN }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ background: "#fff", padding: "20px 32px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: MUTED, flex: 1, lineHeight: 1.5 }}>
              Need a certified valuation for a bank or NHT application?
            </p>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <a href="/booking" style={{
                display: "inline-block", padding: "10px 20px",
                background: GREEN, color: "#fff", borderRadius: 10,
                fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Book a consultation
              </a>
              <a href="https://www.nla.gov.jm" target="_blank" rel="noreferrer" style={{
                display: "inline-block", padding: "10px 20px",
                border: `1.5px solid ${BORDER}`, color: INK, borderRadius: 10,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                Find a valuator
              </a>
            </div>
          </div>
        </div>
      )}

      {shown && !result && (
        <div style={{ marginTop: 16, background: "#fff5f5", borderRadius: 12, padding: "16px 20px", color: "#c0392b", fontSize: 14, border: "1px solid #fde8e8" }}>
          Please select a parish and enter the land area to generate an estimate.
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 11, color: "#9aada0", lineHeight: 1.7, textAlign: "center" }}>
        Benchmarks based on Jamaica real estate market data (mid-2026). Actual values vary by location,
        title status, NHT approval, and local demand. Ferguson Law is not a valuation firm.
      </p>
    </div>
  );
}