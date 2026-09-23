"use client";
import { useEffect, useState } from "react";

const GOLD = "#c9a86a";
const DARK = "#10211c";

// Rates in JMD per sq ft. Land = per sq ft of lot area. Built = per sq ft of built area.
// Calibrated Sep 2026 from Keez.com listing data + 2025 construction cost benchmarks.
// Range ratio ~1.5–1.8:1 (tightened from prior 2–3:1 to reduce estimate spread).
const FALLBACK_PARISHES: Record<string, { land: [number, number]; built: [number, number]; label: string }> = {
  "Kingston & St. Andrew": { land: [ 3500,  5500], built: [18000, 28000], label: "Kingston & St. Andrew" },
  "St. James":             { land: [ 2500,  4500], built: [14000, 22000], label: "St. James" },
  "St. Catherine":         { land: [ 1800,  3500], built: [11000, 18000], label: "St. Catherine" },
  "Manchester":            { land: [ 1500,  3200], built: [10000, 17000], label: "Manchester" },
  "Clarendon":             { land: [ 1200,  2800], built: [ 9000, 15000], label: "Clarendon" },
  "St. Elizabeth":         { land: [ 1000,  2200], built: [ 8000, 14000], label: "St. Elizabeth" },
  "Trelawny":              { land: [ 1800,  3500], built: [10000, 17000], label: "Trelawny" },
  "St. Ann":               { land: [ 2000,  3800], built: [11000, 19000], label: "St. Ann" },
  "St. Mary":              { land: [ 1200,  2500], built: [ 9000, 15000], label: "St. Mary" },
  "Portland":              { land: [ 1200,  2800], built: [ 9000, 15000], label: "Portland" },
  "St. Thomas":            { land: [  900,  2200], built: [ 7000, 13000], label: "St. Thomas" },
  "Westmoreland":          { land: [ 1500,  3000], built: [ 9000, 15000], label: "Westmoreland" },
  "Hanover":               { land: [ 1500,  3200], built: [ 9000, 16000], label: "Hanover" },
};

const CONDITION_MULT: Record<string, number> = { excellent: 1.15, good: 1.0, fair: 0.85, poor: 0.70 };
const FITTINGS_MULT: Record<string, number>  = { luxury: 1.12, standard: 1.0, basic: 0.88, unfinished: 0.72 };
const CONSTR_MULT:   Record<string, number>  = { concrete: 1.0, steel: 1.05, wood: 0.85 };
const AMENITY_BONUS: Record<string, number>  = { pool: 0.08, garage: 0.05, parking: 0.03, solar: 0.04, generator: 0.03 };
const JMD_PER_USD = 157;

function fmt(n: number) { return new Intl.NumberFormat("en-JM").format(Math.round(n)); }
function fmtRounded(n: number) {
  if (n >= 1_000_000) return new Intl.NumberFormat("en-JM").format(Math.round(n / 1_000_000) * 1_000_000);
  return new Intl.NumberFormat("en-JM").format(Math.round(n / 1000) * 1000);
}
function fmtInput(raw: string): string {
  const digits = raw.replace(/,/g, "");
  if (!digits || isNaN(Number(digits))) return raw;
  return new Intl.NumberFormat("en-JM").format(Number(digits));
}
function parseInput(formatted: string): string { return formatted.replace(/,/g, ""); }

interface BenchmarkRow {
  parish: string;
  prop_type: "land" | "built";
  rate_low: number;
  rate_high: number;
  scraped_at: string;
}

type ParishRates = Record<string, { land: [number, number]; built: [number, number]; label: string }>;

async function fetchLiveRates(): Promise<{ rates: ParishRates; lastUpdated: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { rates: FALLBACK_PARISHES, lastUpdated: null };
  try {
    const res = await fetch(
      `${url}/rest/v1/valuation_benchmarks?select=parish,prop_type,rate_low,rate_high,scraped_at&order=scraped_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!res.ok) return { rates: FALLBACK_PARISHES, lastUpdated: null };
    const rows: BenchmarkRow[] = await res.json();
    if (!rows.length) return { rates: FALLBACK_PARISHES, lastUpdated: null };
    const merged: Record<string, Partial<{ land: [number, number]; built: [number, number]; scraped_at: string }>> = {};
    for (const row of rows) {
      if (!merged[row.parish]) merged[row.parish] = { scraped_at: row.scraped_at };
      merged[row.parish][row.prop_type] = [row.rate_low, row.rate_high];
    }
    const rates: ParishRates = {};
    for (const [parish, data] of Object.entries(merged)) {
      const land  = data.land  ?? FALLBACK_PARISHES[parish]?.land  ?? [2000, 8000];
      const built = data.built ?? FALLBACK_PARISHES[parish]?.built ?? [8000, 16000];
      rates[parish] = { land, built, label: parish };
    }
    for (const [parish, fb] of Object.entries(FALLBACK_PARISHES)) {
      if (!rates[parish]) rates[parish] = fb;
    }
    return { rates, lastUpdated: rows[0]?.scraped_at ?? null };
  } catch {
    return { rates: FALLBACK_PARISHES, lastUpdated: null };
  }
}

export default function ValuationEstimatorClient() {
  const [parish, setParish]             = useState("Kingston & St. Andrew");
  const [propType, setPropType]         = useState<"house" | "land" | "apartment" | "commercial">("house");
  const [community, setCommunity]       = useState("");
  const [landDisplay, setLandDisplay]   = useState("");
  const [builtDisplay, setBuiltDisplay] = useState("");
  const [bedrooms, setBedrooms]         = useState("3");
  const [bathrooms, setBathrooms]       = useState("2");
  const [construction, setConstr]       = useState("concrete");
  const [yearBuilt, setYearBuilt]       = useState("");
  const [fittings, setFittings]         = useState("standard");
  const [condition, setCondition]       = useState("good");
  const [amenities, setAmenities]       = useState<string[]>([]);
  const [nlaRef, setNlaRef]             = useState("");
  const [result, setResult]             = useState<{ low: number; high: number; midJmd: number; midUsd: number } | null>(null);
  const [parishes, setParishes]         = useState<ParishRates>(FALLBACK_PARISHES);
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [dataSource, setDataSource]     = useState<"live" | "fallback">("fallback");

  const isLandOnly = propType === "land";

  useEffect(() => {
    fetchLiveRates().then(({ rates, lastUpdated: lu }) => {
      setParishes(rates);
      setLastUpdated(lu);
      setDataSource(lu ? "live" : "fallback");
    });
  }, []);

  function handleNumInput(val: string, setter: (v: string) => void) {
    const raw = parseInput(val);
    if (raw === "" || /^\d*$/.test(raw)) {
      setter(raw ? fmtInput(raw) : "");
      setResult(null);
    }
  }

  function toggleAmenity(key: string) {
    setAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
    setResult(null);
  }

  function calculate() {
    const pData = parishes[parish];
    if (!pData) return;
    const l = parseFloat(parseInput(landDisplay));
    const b = isLandOnly ? 0 : (parseFloat(parseInput(builtDisplay)) || 0);
    if (!l || isNaN(l)) return;

    const condMult     = CONDITION_MULT[condition]      ?? 1;
    const fittingsMult = isLandOnly ? 1 : (FITTINGS_MULT[fittings]      ?? 1);
    const constrMult   = isLandOnly ? 1 : (CONSTR_MULT[construction]     ?? 1);
    const typeMult     = propType === "apartment" ? 0.82 : propType === "commercial" ? 1.25 : 1;

    const beds  = isLandOnly ? 3 : (parseInt(bedrooms)  || 3);
    const baths = isLandOnly ? 2 : (parseInt(bathrooms) || 2);
    const bedroomMult  = 1 + Math.max(0, beds  - 3) * 0.03;
    const bathroomMult = 1 + Math.max(0, baths - 2) * 0.02;

    const amenityMult = 1 + (isLandOnly ? 0 : amenities.reduce((sum, a) => sum + (AMENITY_BONUS[a] ?? 0), 0));

    let ageMult = 1.0;
    const yr = parseInt(yearBuilt);
    if (!isLandOnly && yr > 1900) {
      const age = new Date().getFullYear() - yr;
      if (age >= 60) ageMult = 0.80;
      else if (age >= 40) ageMult = 0.88;
      else if (age >= 20) ageMult = 0.95;
    }

    const extraMult = bedroomMult * bathroomMult * amenityMult * constrMult * fittingsMult * ageMult;

    const low  = (pData.land[0] * l + (b > 0 ? pData.built[0] * b : 0)) * typeMult * condMult * extraMult;
    const high = (pData.land[1] * l + (b > 0 ? pData.built[1] * b : 0)) * typeMult * condMult * extraMult;
    const midJmd = (low + high) / 2;
    setResult({ low, high, midJmd, midUsd: midJmd / JMD_PER_USD });
  }

  function downloadCSV() {
    if (!result) return;
    const yr  = parseInt(yearBuilt);
    const age = yr > 1900 ? `${new Date().getFullYear() - yr} years` : "N/A";
    const rows = [
      ["Field", "Value"],
      ["Parish", parish],
      ["Community / Scheme", community || "N/A"],
      ["Property Type", propType],
      ["Overall Condition", condition],
      ["Condition of Fittings", isLandOnly ? "N/A" : fittings],
      ["Construction", isLandOnly ? "N/A" : construction],
      ["Land Area (sq ft)", parseInput(landDisplay)],
      ["Built Area (sq ft)", isLandOnly ? "N/A" : (parseInput(builtDisplay) || "N/A")],
      ["Bedrooms", isLandOnly ? "N/A" : bedrooms],
      ["Bathrooms", isLandOnly ? "N/A" : bathrooms],
      ["Year Built", yearBuilt || "N/A"],
      ["Approx Age", age],
      ["Amenities", isLandOnly ? "N/A" : (amenities.join(", ") || "None")],
      ["NLA / Reference", nlaRef || "N/A"],
      ["Estimate Low (JMD)", Math.round(result.low)],
      ["Estimate High (JMD)", Math.round(result.high)],
      ["Midpoint (JMD)", Math.round(result.midJmd)],
      ["Midpoint (USD)", Math.round(result.midUsd)],
      ["Data Source", dataSource === "live" ? `Market listings (${formattedDate})` : "Market estimates"],
      ["Generated", new Date().toLocaleDateString("en-JM", { year: "numeric", month: "short", day: "numeric" })],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `valuation-estimate-${parish.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;
    a.click();
  }

  const parishList   = Object.keys(parishes).sort();
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-JM", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .val-print-block { display: block !important; }
          .val-print-block * { display: revert !important; }
        }
        .amenity-chip { cursor: pointer; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: .78rem; font-weight: 600; transition: background .15s, color .15s; }
        .amenity-chip.on  { background: #c9a86a; color: #fff; border: 1px solid #c9a86a; }
        .amenity-chip.off { background: #fff; color: #6b7a6e; border: 1px solid #d5cfc4; }
      `}</style>

      <div className="val-print-block" style={{ maxWidth: 700, margin: "0 auto", padding: "0 1rem 4rem" }}>
        <div style={{ background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "1.75rem", boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: ".9rem", color: DARK }}>Property Details</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            {/* Parish */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Parish <span style={{ color: "#e05" }}>*</span></label>
              <select value={parish} onChange={e => { setParish(e.target.value); setResult(null); }} style={selectStyle}>
                {parishList.map(p => <option key={p} value={p}>{parishes[p].label}</option>)}
              </select>
            </div>

            {/* Community */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Community / Scheme <span style={{ color: "#9aaa9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input type="text" placeholder="e.g. Portmore Pines, Cherry Gardens" value={community} onChange={e => setCommunity(e.target.value)} style={inputStyle} />
            </div>

            {/* Property Type */}
            <div>
              <label style={labelStyle}>Property Type <span style={{ color: "#e05" }}>*</span></label>
              <select value={propType} onChange={e => { setPropType(e.target.value as typeof propType); setResult(null); }} style={selectStyle}>
                <option value="house">House / Villa</option>
                <option value="land">Land / Lot</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            {/* Overall Condition */}
            <div>
              <label style={labelStyle}>Overall Condition</label>
              <select value={condition} onChange={e => { setCondition(e.target.value); setResult(null); }} style={selectStyle}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            {/* Land area */}
            <div>
              <label style={labelStyle}>Land Area (sq ft) <span style={{ color: "#e05" }}>*</span></label>
              <input type="text" inputMode="numeric" placeholder="e.g. 6,000" value={landDisplay}
                onChange={e => handleNumInput(e.target.value, setLandDisplay)} style={inputStyle} />
            </div>

            {/* Built area */}
            {!isLandOnly && (
              <div>
                <label style={labelStyle}>Built / Floor Area (sq ft)</label>
                <input type="text" inputMode="numeric" placeholder="e.g. 1,800" value={builtDisplay}
                  onChange={e => handleNumInput(e.target.value, setBuiltDisplay)} style={inputStyle} />
              </div>
            )}

            {/* Bedrooms & Bathrooms */}
            {!isLandOnly && (
              <>
                <div>
                  <label style={labelStyle}>Bedrooms</label>
                  <select value={bedrooms} onChange={e => { setBedrooms(e.target.value); setResult(null); }} style={selectStyle}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6+</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bathrooms</label>
                  <select value={bathrooms} onChange={e => { setBathrooms(e.target.value); setResult(null); }} style={selectStyle}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                </div>
              </>
            )}

            {/* Construction & Fittings */}
            {!isLandOnly && (
              <>
                <div>
                  <label style={labelStyle}>Construction</label>
                  <select value={construction} onChange={e => { setConstr(e.target.value); setResult(null); }} style={selectStyle}>
                    <option value="concrete">Concrete / Block</option>
                    <option value="steel">Steel Frame</option>
                    <option value="wood">Wood Frame</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Condition of Fittings</label>
                  <select value={fittings} onChange={e => { setFittings(e.target.value); setResult(null); }} style={selectStyle}>
                    <option value="luxury">Luxury</option>
                    <option value="standard">Standard</option>
                    <option value="basic">Basic</option>
                    <option value="unfinished">Unfinished</option>
                  </select>
                </div>
              </>
            )}

            {/* Year built */}
            {!isLandOnly && (
              <div>
                <label style={labelStyle}>Year Built <span style={{ color: "#9aaa9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <input type="text" inputMode="numeric" placeholder="e.g. 2005" value={yearBuilt}
                  onChange={e => { setYearBuilt(e.target.value.replace(/\D/g, "").slice(0, 4)); setResult(null); }}
                  style={inputStyle} maxLength={4} />
              </div>
            )}

            {/* NLA Reference */}
            <div style={{ gridColumn: isLandOnly ? "1/-1" : undefined }}>
              <label style={labelStyle}>NLA / Property Reference <span style={{ color: "#9aaa9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input type="text" placeholder="e.g. 1234/567/89" value={nlaRef} onChange={e => setNlaRef(e.target.value)} style={inputStyle} />
            </div>

          </div>

          {/* Amenities */}
          {!isLandOnly && (
            <div style={{ marginTop: "1rem" }}>
              <label style={{ ...labelStyle, marginBottom: 10 }}>Amenities</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {(["pool", "garage", "parking", "solar", "generator"] as const).map(key => (
                  <button key={key} type="button" onClick={() => toggleAmenity(key)}
                    className={`amenity-chip ${amenities.includes(key) ? "on" : "off"}`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {amenities.includes(key) && ` +${(AMENITY_BONUS[key] * 100).toFixed(0)}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={calculate}
            style={{ marginTop: "1.5rem", width: "100%", padding: "0.85rem", background: GOLD, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "1rem", cursor: "pointer", letterSpacing: ".03em" }}>
            Estimate Value
          </button>

          {/* Result */}
          {result && (
            <div id="val-result" style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#f5f0e8", borderRadius: 10, borderLeft: `4px solid ${GOLD}` }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: ".75rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GOLD }}>Estimated Market Value</p>
              <p style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: DARK }}>
                J${fmtRounded(result.low)} &ndash; J${fmtRounded(result.high)}
              </p>
              <p style={{ margin: 0, fontSize: ".85rem", color: "#6b7a6e" }}>
                Midpoint: approx. J${fmtRounded(result.midJmd)} &nbsp;&middot;&nbsp; US${fmt(result.midUsd)}
              </p>

              <p style={{ margin: "0.5rem 0 0", fontSize: ".72rem" }}>
                <span style={{ padding: "0.2rem 0.55rem", borderRadius: 20, background: dataSource === "live" ? "#e8f4ec" : "#f0ede7", color: dataSource === "live" ? "#2d7a4a" : "#7a6535", fontWeight: 700, fontSize: ".7rem", letterSpacing: ".04em" }}>
                  {dataSource === "live" ? `LIVE DATA \xB7 ${formattedDate}` : "MARKET ESTIMATES"}
                </span>
              </p>

              <p style={{ margin: "0.75rem 0 0", fontSize: ".75rem", color: "#9aaa9e", lineHeight: 1.5 }}>
                Indicative estimate based on {dataSource === "live" ? "current market listings" : "market benchmarks"} — not a formal valuation. Ferguson Law is not a valuation firm. For a certified appraisal, engage a chartered valuator.
              </p>

              {/* Export + CTA buttons */}
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button onClick={downloadCSV} style={exportBtnStyle}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Save as CSV
                </button>
                <button onClick={() => window.print()} style={exportBtnStyle}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Save as PDF
                </button>
                <a href="/booking" style={{ ...exportBtnStyle, textDecoration: "none", cursor: "pointer" }}>
                  Book Consultation
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: ".78rem", fontWeight: 600, letterSpacing: ".06em",
  textTransform: "uppercase", color: "#6b7a6e", marginBottom: 6,
};
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #d5cfc4",
  borderRadius: 6, fontSize: ".9rem", background: "#fff", color: "#10211c",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #d5cfc4",
  borderRadius: 6, fontSize: ".9rem", background: "#fff", color: "#10211c", boxSizing: "border-box",
};
const exportBtnStyle: React.CSSProperties = {
  padding: "0.5rem 1rem", background: "#fff", border: "1px solid #c9a86a",
  borderRadius: 6, color: "#10211c", fontSize: ".8rem", fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: "0.4rem",
};