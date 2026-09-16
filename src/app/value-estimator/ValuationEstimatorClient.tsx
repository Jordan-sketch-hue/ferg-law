"use client";
import { useEffect, useState } from "react";

const GOLD = "#c9a86a";
const DARK = "#10211c";

const FALLBACK_PARISHES: Record<string, { land: [number, number]; built: [number, number]; label: string }> = {
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

const CONDITIONS: Record<string, number> = { excellent: 1.18, good: 1, fair: 0.82, poor: 0.65 };
const JMD_PER_USD = 157;

function fmt(n: number) { return new Intl.NumberFormat("en-JM").format(Math.round(n)); }

// Thousands-separator formatting for text inputs
function fmtInput(raw: string): string {
  const digits = raw.replace(/,/g, "");
  if (!digits || isNaN(Number(digits))) return raw;
  return new Intl.NumberFormat("en-JM").format(Number(digits));
}
function parseInput(formatted: string): string {
  return formatted.replace(/,/g, "");
}

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
      const land = data.land ?? FALLBACK_PARISHES[parish]?.land ?? [2000, 8000];
      const built = data.built ?? FALLBACK_PARISHES[parish]?.built ?? [8000, 16000];
      rates[parish] = { land, built, label: parish };
    }

    for (const [parish, fb] of Object.entries(FALLBACK_PARISHES)) {
      if (!rates[parish]) rates[parish] = fb;
    }

    const latestScrapedAt = rows[0]?.scraped_at ?? null;
    return { rates, lastUpdated: latestScrapedAt };
  } catch {
    return { rates: FALLBACK_PARISHES, lastUpdated: null };
  }
}

export default function ValuationEstimatorClient() {
  const [parish, setParish] = useState("Kingston & St. Andrew");
  const [propType, setPropType] = useState<"house" | "land" | "apartment" | "commercial">("house");
  const [landDisplay, setLandDisplay] = useState("");
  const [builtDisplay, setBuiltDisplay] = useState("");
  const [condition, setCondition] = useState("good");
  const [result, setResult] = useState<{ low: number; high: number; midUsd: number } | null>(null);
  const [parishes, setParishes] = useState<ParishRates>(FALLBACK_PARISHES);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "fallback">("fallback");

  useEffect(() => {
    fetchLiveRates().then(({ rates, lastUpdated: lu }) => {
      setParishes(rates);
      setLastUpdated(lu);
      setDataSource(lu ? "live" : "fallback");
    });
  }, []);

  function handleLandChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInput(e.target.value);
    if (raw === "" || /^\d*$/.test(raw)) {
      setLandDisplay(raw ? fmtInput(raw) : "");
      setResult(null);
    }
  }

  function handleBuiltChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInput(e.target.value);
    if (raw === "" || /^\d*$/.test(raw)) {
      setBuiltDisplay(raw ? fmtInput(raw) : "");
      setResult(null);
    }
  }

  function calculate() {
    const pData = parishes[parish];
    if (!pData) return;
    const l = parseFloat(parseInput(landDisplay));
    const b = parseFloat(parseInput(builtDisplay)) || 0;
    if (!l || isNaN(l)) return;
    const condMult = CONDITIONS[condition] ?? 1;
    const typeMult = propType === "apartment" ? 0.82 : propType === "commercial" ? 1.25 : 1;
    const totalLow  = (pData.land[0] * l * condMult + (b > 0 ? pData.built[0] * b * condMult : 0)) * typeMult;
    const totalHigh = (pData.land[1] * l * condMult + (b > 0 ? pData.built[1] * b * condMult : 0)) * typeMult;
    const midJmd = (totalLow + totalHigh) / 2;
    setResult({ low: totalLow, high: totalHigh, midUsd: midJmd / JMD_PER_USD });
  }

  function downloadCSV() {
    if (!result) return;
    const rows = [
      ["Field", "Value"],
      ["Parish", parish],
      ["Property Type", propType],
      ["Condition", condition],
      ["Land Area (sq ft)", parseInput(landDisplay)],
      ["Built Area (sq ft)", parseInput(builtDisplay) || "N/A"],
      ["Estimate Low (JMD)", Math.round(result.low)],
      ["Estimate High (JMD)", Math.round(result.high)],
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

  function printPDF() {
    window.print();
  }

  const parishList = Object.keys(parishes).sort();
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
        .val-print-block { }
      `}</style>

      <div className="val-print-block" style={{ maxWidth: 700, margin: "0 auto", padding: "0 1rem 4rem" }}>
        {/* Card */}
        <div style={{ background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "1.75rem", boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>
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
              <label style={labelStyle}>Parish</label>
              <select value={parish} onChange={e => { setParish(e.target.value); setResult(null); }} style={selectStyle}>
                {parishList.map(p => <option key={p} value={p}>{parishes[p].label}</option>)}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label style={labelStyle}>Property Type</label>
              <select value={propType} onChange={e => { setPropType(e.target.value as typeof propType); setResult(null); }} style={selectStyle}>
                <option value="house">House / Villa</option>
                <option value="land">Land / Lot</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            {/* Condition */}
            <div>
              <label style={labelStyle}>Condition</label>
              <select value={condition} onChange={e => { setCondition(e.target.value); setResult(null); }} style={selectStyle}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            {/* Land area */}
            <div>
              <label style={labelStyle}>Land Area (sq ft)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 6,000"
                value={landDisplay}
                onChange={handleLandChange}
                style={inputStyle}
              />
            </div>

            {/* Built area */}
            {propType !== "land" && (
              <div>
                <label style={labelStyle}>Built Area (sq ft)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1,800"
                  value={builtDisplay}
                  onChange={handleBuiltChange}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <button onClick={calculate} style={{ marginTop: "1.5rem", width: "100%", padding: "0.85rem", background: GOLD, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "1rem", cursor: "pointer", letterSpacing: ".03em" }}>
            Estimate Value
          </button>

          {/* Result */}
          {result && (
            <div id="val-result" style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#f5f0e8", borderRadius: 10, borderLeft: `4px solid ${GOLD}` }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: ".75rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GOLD }}>Estimated Market Value</p>
              <p style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: DARK }}>
                J${fmt(result.low)} &ndash; J${fmt(result.high)}
              </p>
              <p style={{ margin: 0, fontSize: ".85rem", color: "#6b7a6e" }}>
                Midpoint: approx. US${fmt(result.midUsd)}
              </p>
              <p style={{ margin: "0.75rem 0 0", fontSize: ".75rem", color: "#9aaa9e", lineHeight: 1.5 }}>
                Indicative estimate based on {dataSource === "live" ? "current market listings" : "market benchmarks"} — not a formal valuation. Ferguson Law is not a valuation firm. For a certified appraisal, engage a chartered valuator.
              </p>

              {/* Export buttons */}
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  onClick={downloadCSV}
                  style={{ padding: "0.5rem 1rem", background: "#fff", border: `1px solid ${GOLD}`, borderRadius: 6, color: DARK, fontSize: ".8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Save as CSV
                </button>
                <button
                  onClick={printPDF}
                  style={{ padding: "0.5rem 1rem", background: "#fff", border: `1px solid ${GOLD}`, borderRadius: 6, color: DARK, fontSize: ".8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Save as PDF
                </button>
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
