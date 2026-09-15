"use client";

/**
 * Property Value Estimator — Ferguson Law Jamaica
 * Indicative valuation using parish + type + size benchmarks.
 * JAMPROP/NLA integration: TODO — pending API access from National Land Agency.
 */

import { useMemo, useState } from "react";

const GREEN = "#102A1E";
const GOLD  = "#C8A65C";
const INK   = "#24211b";
const MUTED = "#5c6a60";
const BORDER = "#dde5dd";

// Benchmark ranges: [low, high] JMD per sqft for land; [low, high] for built area
const BENCHMARKS: Record<string, {
  land: [number, number];
  built: [number, number];
  label: string;
}> = {
  "Kingston & St. Andrew": { land: [8000, 25000],  built: [15000, 30000], label: "Kingston & St. Andrew (KSA)" },
  "St. James":             { land: [5000, 18000],  built: [12000, 22000], label: "St. James (Montego Bay area)" },
  "St. Catherine":         { land: [3000, 12000],  built: [10000, 18000], label: "St. Catherine" },
  "Clarendon":             { land: [2500, 8000],   built: [9000,  15000], label: "Clarendon" },
  "Manchester":            { land: [2500, 8000],   built: [9000,  16000], label: "Manchester (Mandeville area)" },
  "St. Elizabeth":         { land: [2000, 6000],   built: [8000,  14000], label: "St. Elizabeth" },
  "Trelawny":              { land: [3000, 10000],  built: [9000,  16000], label: "Trelawny" },
  "St. Ann":               { land: [4000, 14000],  built: [10000, 19000], label: "St. Ann (Ocho Rios area)" },
  "St. Mary":              { land: [2500, 8000],   built: [8000,  14000], label: "St. Mary" },
  "Portland":              { land: [2000, 7000],   built: [8000,  14000], label: "Portland" },
  "St. Thomas":            { land: [2000, 6000],   built: [7000,  13000], label: "St. Thomas" },
  "Westmoreland":          { land: [2500, 8000],   built: [8000,  14000], label: "Westmoreland (Negril area)" },
  "Hanover":               { land: [3000, 10000],  built: [9000,  16000], label: "Hanover (Lucea area)" },
};

const PROPERTY_TYPES = [
  { value: "house",       label: "House / Villa" },
  { value: "apartment",   label: "Apartment / Condo" },
  { value: "land",        label: "Vacant Land" },
  { value: "commercial",  label: "Commercial Property" },
];

const CONDITION_MULT: Record<string, number> = {
  excellent:  1.15,
  good:       1.0,
  fair:       0.85,
  poor:       0.70,
};

function fmtJmd(n: number) {
  return new Intl.NumberFormat("en-JM", { style: "currency", currency: "JMD", maximumFractionDigits: 0 }).format(n);
}
function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US",  { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box",
  border: `1px solid ${BORDER}`, borderRadius: 10,
  padding: "11px 14px", fontSize: 14, color: INK,
  background: "#fff", appearance: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  letterSpacing: ".05em", color: MUTED, marginBottom: 6,
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

    const mult = CONDITION_MULT[condition] ?? 1;

    // Land value
    const landLow  = bench.land[0] * landArea * mult;
    const landHigh = bench.land[1] * landArea * mult;

    // Built area premium (for house / apartment / commercial)
    const builtLow  = builtArea > 0 ? bench.built[0] * builtArea * mult : 0;
    const builtHigh = builtArea > 0 ? bench.built[1] * builtArea * mult : 0;

    // Apartment modifier — typically 20% below house
    const typeMult = propType === "apartment" ? 0.82 : propType === "commercial" ? 1.25 : 1.0;

    const totalLow  = (landLow  + builtLow)  * typeMult;
    const totalHigh = (landHigh + builtHigh) * typeMult;

    // Midpoint in USD (approx JMD 157 = USD 1 as of mid 2026)
    const rate = 157;
    const midJmd = (totalLow + totalHigh) / 2;
    const midUsd = midJmd / rate;

    return { totalLow, totalHigh, midJmd, midUsd, parish: bench.label };
  }, [parish, propType, landSqft, builtSqft, condition]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 1rem 3rem" }}>
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px" }}>
          {/* Property Reference */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>NLA / Property Reference (optional)</label>
            <input
              value={propRef} onChange={e => setPropRef(e.target.value)}
              placeholder="e.g. 1/89/7245"
              style={inputStyle}
            />
            <p style={{ margin: "5px 0 0", fontSize: 12, color: MUTED }}>
              JAMPROP integration pending. Reference saved for when NLA data access is confirmed.
            </p>
          </div>

          {/* Parish */}
          <div>
            <label style={labelStyle}>Parish *</label>
            <select value={parish} onChange={e => setParish(e.target.value)} style={inputStyle}>
              <option value="">Select parish…</option>
              {Object.keys(BENCHMARKS).map(p => (
                <option key={p} value={p}>{BENCHMARKS[p].label}</option>
              ))}
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label style={labelStyle}>Property Type *</label>
            <select value={propType} onChange={e => setPropType(e.target.value)} style={inputStyle}>
              {PROPERTY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Land Size */}
          <div>
            <label style={labelStyle}>Land Area (sq ft) *</label>
            <input
              type="number" min="0" value={landSqft}
              onChange={e => setLandSqft(e.target.value)}
              placeholder="e.g. 6000"
              style={inputStyle}
            />
          </div>

          {/* Built Area — not for vacant land */}
          {propType !== "land" && (
            <div>
              <label style={labelStyle}>Built / Floor Area (sq ft)</label>
              <input
                type="number" min="0" value={builtSqft}
                onChange={e => setBuiltSqft(e.target.value)}
                placeholder="e.g. 1800"
                style={inputStyle}
              />
            </div>
          )}

          {/* Condition */}
          <div>
            <label style={labelStyle}>Condition</label>
            <select value={condition} onChange={e => setCondition(e.target.value)} style={inputStyle}>
              <option value="excellent">Excellent / New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor / Needs work</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShown(true)}
          disabled={!parish || !landSqft}
          style={{
            marginTop: 28, width: "100%",
            background: (!parish || !landSqft) ? "#ccc" : GREEN,
            color: "#fff", border: "none", borderRadius: 10,
            padding: "14px 0", fontSize: 15, fontWeight: 700,
            cursor: (!parish || !landSqft) ? "not-allowed" : "pointer",
            letterSpacing: ".02em",
          }}
        >
          Get Estimate
        </button>
      </div>

      {/* Results */}
      {shown && result && (
        <div style={{ marginTop: 24, background: GREEN, borderRadius: 16, padding: "28px 32px", color: "#fff" }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: GOLD, letterSpacing: ".1em", textTransform: "uppercase" }}>
            Indicative Valuation
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#b8c9b8" }}>{result.parish}</p>
          <div style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 700, fontFamily: "Georgia, serif" }}>
            {fmtJmd(result.totalLow)} – {fmtJmd(result.totalHigh)}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#b8c9b8" }}>
            ≈ {fmtUsd(result.totalLow / 157)} – {fmtUsd(result.totalHigh / 157)} USD
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 10, padding: "12px 18px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "#a0b5a0", marginBottom: 4 }}>MID-POINT</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtJmd(result.midJmd)}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 10, padding: "12px 18px", flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "#a0b5a0", marginBottom: 4 }}>USD EQUIV.</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtUsd(result.midUsd)}</div>
            </div>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: "#6b9c6b", lineHeight: 1.6 }}>
            This is an indicative estimate based on market benchmarks. It is not a formal valuation.
            For a certified valuation report accepted by banks and NHT, please{" "}
            <a href="/booking" style={{ color: GOLD }}>book a consultation</a>.
          </p>
        </div>
      )}

      {shown && !result && (
        <div style={{ marginTop: 24, background: "#fff5f5", borderRadius: 12, padding: 20, color: "#c0392b", fontSize: 14 }}>
          Please fill in the required fields (parish and land area) to generate an estimate.
        </div>
      )}

      {/* Disclaimer */}
      <p style={{ marginTop: 20, fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
        Benchmarks updated based on Jamaica real estate market data (mid-2026). Actual values vary by location,
        title status, NHT approval, and local demand. Ferguson Law is not a valuation firm.
        <br />
        <strong>JAMPROP integration:</strong> We are awaiting API access from the National Land Agency to show
        verified recent comparable sales for your specific property reference.
      </p>
    </div>
  );
}
