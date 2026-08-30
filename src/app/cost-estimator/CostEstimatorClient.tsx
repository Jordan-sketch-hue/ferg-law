"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import ExcelJS from "exceljs";
import Link from "next/link";
import { BookButton } from "@/components/site/BookingProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Party = "buyer" | "seller";
type Mode = "rough" | "actual";

interface FeeRow {
  key: string;
  label: string;
  who: "buyer" | "seller" | "both";
  // rough-mode default (% of price, or fixed JMD)
  roughPctLow?: number;   // e.g. 0.025
  roughPctHigh?: number;  // e.g. 0.03
  roughFixed?: number;    // e.g. 2500 (fixed JMD, not %)
  roughNote?: string;     // e.g. "half of J$5,000"
  roughLabel?: string;
  splitNote?: string;     // overrides "each party pays their share" for "both" fees
  // fees set by attorney — no rough estimate, always J$ in actual mode
  noRoughEstimate?: boolean;
  defaultFixed?: boolean; // default actual-mode to J$ input
  noOverride?: boolean;   // fixed statutory fee — no user input controls
}

const FEES: FeeRow[] = [
  {
    key: "transfer_tax",
    label: "Transfer Tax",
    who: "seller",
    roughPctLow: 0.02,
    roughPctHigh: 0.02,
    roughNote: "2% of selling price",
    noOverride: true,
  },
  {
    key: "stamp_duty",
    label: "Stamp Duty",
    who: "both",
    roughFixed: 2500,
    roughNote: "half of J$5,000 (fixed statutory fee)",
    noOverride: true,
  },
  {
    key: "registration",
    label: "Registration Fee",
    who: "both",
    roughPctLow: 0.0025,
    roughPctHigh: 0.0025,
    roughNote: "0.25% each (0.5% split equally)",
    noOverride: true,
  },
  {
    key: "attorney",
    label: "Attorney's Fees",
    who: "both",
    roughPctLow: 0.025,
    roughPctHigh: 0.03,
    roughNote: "~2.5–3% of selling price",
    splitNote: "each party pays their own Attorney's fees",
  },
  {
    key: "surveyor",
    label: "Surveyor's Fee",
    who: "buyer",
    roughPctLow: 0.002,
    roughPctHigh: 0.003,
    roughNote: "~0.2–0.3% of selling price",
  },
  {
    key: "valuator",
    label: "Valuator's Fee",
    who: "buyer",
    roughPctLow: 0.002,
    roughPctHigh: 0.003,
    roughNote: "~0.2–0.3% of selling price",
  },
  {
    key: "agreement_drafting",
    label: "Agreement for Sale (Drafting)",
    who: "both",
    roughNote: "Set by Seller's Attorney · split equally",
    noRoughEstimate: true,
    defaultFixed: true,
  },
  {
    key: "possession_letters",
    label: "Letter of Possession & Letters of Introduction",
    who: "both",
    roughNote: "Set by Seller's Attorney · split equally",
    noRoughEstimate: true,
    defaultFixed: true,
  },
  {
    key: "sundries",
    label: "Sundries (correspondence, bearer etc.)",
    who: "both",
    roughNote: "Set by Seller's Attorney · split equally",
    noRoughEstimate: true,
    defaultFixed: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n: number) {
  return "J$" + Math.round(n).toLocaleString("en-JM");
}
function fmtRange(lo: number, hi: number) {
  if (Math.round(lo) === Math.round(hi)) return fmt(lo);
  return fmt(lo) + " – " + fmt(hi);
}
function parseNum(s: string) {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}
function formatWithCommas(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("en-JM");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CostEstimatorClient() {
  const [party, setParty] = useState<Party>("buyer");
  const [mode, setMode] = useState<Mode>("rough");
  const [priceStr, setPriceStr] = useState("");

  // Actual-mode overrides: key → { useFixed: boolean, value: string }
  const [overrides, setOverrides] = useState<Record<string, { useFixed: boolean; value: string }>>({});

  const price = parseNum(priceStr);

  const trackedRef = useRef(false);
  useEffect(() => {
    if (price > 0 && !trackedRef.current) {
      trackedRef.current = true;
      track("cost_estimator_use", { party });
    }
  }, [price, party]);

  // Which fees apply to this party
  const applicable = FEES.filter((f) => f.who === party || f.who === "both");

  // Compute rough amounts
  const roughAmounts = useMemo(() => {
    const out: Record<string, { lo: number; hi: number }> = {};
    for (const f of applicable) {
      if (f.roughFixed !== undefined) {
        out[f.key] = { lo: f.roughFixed, hi: f.roughFixed };
      } else {
        out[f.key] = {
          lo: price * (f.roughPctLow ?? 0),
          hi: price * (f.roughPctHigh ?? f.roughPctLow ?? 0),
        };
      }
    }
    return out;
  }, [applicable, price]);

  // Compute actual amounts
  const actualAmounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of applicable) {
      const ov = overrides[f.key];
      if (ov?.useFixed) {
        out[f.key] = parseNum(ov.value);
      } else if (ov?.value && !ov.useFixed) {
        // % override
        const pct = parseNum(ov.value) / 100;
        out[f.key] = price * pct;
      } else {
        // default mid-point
        const lo = f.roughFixed !== undefined ? f.roughFixed : price * (f.roughPctLow ?? 0);
        const hi = f.roughFixed !== undefined ? f.roughFixed : price * (f.roughPctHigh ?? f.roughPctLow ?? 0);
        out[f.key] = (lo + hi) / 2;
      }
    }
    return out;
  }, [applicable, overrides, price]);

  const roughTotal = { lo: 0, hi: 0 };
  for (const v of Object.values(roughAmounts)) {
    roughTotal.lo += v.lo;
    roughTotal.hi += v.hi;
  }
  const actualTotal = Object.values(actualAmounts).reduce((a, b) => a + b, 0);

  function setOverride(key: string, field: "useFixed" | "value", val: string | boolean) {
    setOverrides((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { useFixed: false, value: "" }), [field]: val },
    }));
  }

  const hasPrice = price > 0;

  async function downloadCSV() {
    const partyLabel = party === "buyer" ? "Buyer" : "Seller";
    const modeLabel = mode === "rough" ? "Rough Estimate" : "Actual Numbers";
    const priceLabel = hasPrice ? fmt(price) : "—";
    const cols = mode === "actual" ? 5 : 4;

    const GREEN  = "FF10211C";
    const GOLD   = "FFC9A86A";
    const WHITE  = "FFFFFFFF";
    const STRIPE = "FFF2F6F4";
    const MUTED  = "FF6B7280";

    const wb = new ExcelJS.Workbook();
    wb.creator = "Ferguson Law";
    wb.created = new Date();
    const ws = wb.addWorksheet("Cost Estimate", { properties: { tabColor: { argb: GREEN } } });

    const colWidths = [38, 18, 22, 22, 22].slice(0, cols);
    ws.columns = colWidths.map((width) => ({ width }));

    // ── Row 1: Brand header ──────────────────────────────────────────────────
    ws.mergeCells(1, 1, 1, cols);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = "Ferguson Law — Cost Estimator";
    titleCell.font   = { bold: true, size: 14, color: { argb: GOLD }, name: "Calibri" };
    titleCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 30;

    // ── Row 2: Summary bar ───────────────────────────────────────────────────
    ws.mergeCells(2, 1, 2, cols);
    const summaryCell = ws.getCell(2, 1);
    summaryCell.value = `Party: ${partyLabel}   |   Mode: ${modeLabel}   |   Selling Price: ${priceLabel}`;
    summaryCell.font  = { size: 10, color: { argb: "FFD4C49A" }, name: "Calibri" };
    summaryCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    summaryCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(2).height = 20;

    // ── Row 3: Gold divider ──────────────────────────────────────────────────
    ws.mergeCells(3, 1, 3, cols);
    const divCell = ws.getCell(3, 1);
    divCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
    ws.getRow(3).height = 3;

    // ── Row 4: blank gap ─────────────────────────────────────────────────────
    ws.getRow(4).height = 6;

    // ── Row 5: Column headers ─────────────────────────────────────────────────
    const headers = (mode === "actual"
      ? ["Fee", "Paid By", "Rough Low (JMD)", "Rough High (JMD)", "Actual (JMD)"]
      : ["Fee", "Paid By", "Rough Low (JMD)", "Rough High (JMD)"]).slice(0, cols);
    const hRow = ws.getRow(5);
    hRow.height = 22;
    headers.forEach((h, i) => {
      const cell = hRow.getCell(i + 1);
      cell.value = h;
      cell.font  = { bold: true, size: 10, color: { argb: WHITE }, name: "Calibri" };
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C3A30" } };
      cell.alignment = { vertical: "middle", horizontal: i >= 2 ? "right" : "left", indent: i === 0 ? 1 : 0 };
      cell.border = { bottom: { style: "thin", color: { argb: GOLD } } };
    });

    // ── Data rows ─────────────────────────────────────────────────────────────
    let rowIdx = 6;
    applicable.forEach((f, fi) => {
      const rough  = roughAmounts[f.key] ?? { lo: 0, hi: 0 };
      const paidBy = f.who === "both" ? "Buyer & Seller" : f.who.charAt(0).toUpperCase() + f.who.slice(1);
      const loVal  = f.noRoughEstimate ? "—" : rough.lo > 0 ? rough.lo : "—";
      const hiVal  = f.noRoughEstimate ? "—" : rough.hi > 0 ? rough.hi : "—";
      const vals: (string | number)[] = [f.label, paidBy, loVal, hiVal];
      if (mode === "actual") vals.push(actualAmounts[f.key] > 0 ? actualAmounts[f.key] : "—");

      const dRow = ws.getRow(rowIdx);
      dRow.height = 18;
      const bgColor = fi % 2 === 0 ? WHITE : STRIPE;
      vals.slice(0, cols).forEach((v, ci) => {
        const cell = dRow.getCell(ci + 1);
        cell.value = v;
        cell.font  = { size: 10, color: { argb: "FF1A1A1A" }, name: "Calibri" };
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.alignment = { vertical: "middle", horizontal: ci >= 2 ? "right" : "left", indent: ci === 0 ? 1 : 0 };
        cell.border = { bottom: { style: "hair", color: { argb: "FFE0DDD5" } } };
        if (typeof v === "number") cell.numFmt = "#,##0";
      });
      rowIdx++;
    });

    // ── Total row ────────────────────────────────────────────────────────────
    rowIdx++;
    const tRow = ws.getRow(rowIdx);
    tRow.height = 22;
    const totalVals: (string | number)[] = [
      "ESTIMATED TOTAL", "",
      hasPrice ? roughTotal.lo : "—",
      hasPrice ? roughTotal.hi : "—",
    ];
    if (mode === "actual") totalVals.push(hasPrice ? actualTotal : "—");
    totalVals.slice(0, cols).forEach((v, ci) => {
      const cell = tRow.getCell(ci + 1);
      cell.value = v;
      cell.font  = { bold: true, size: 10, color: { argb: GOLD }, name: "Calibri" };
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      cell.alignment = { vertical: "middle", horizontal: ci >= 2 ? "right" : "left", indent: ci === 0 ? 1 : 0 };
      if (typeof v === "number") cell.numFmt = "#,##0";
    });

    // ── Footer ───────────────────────────────────────────────────────────────
    rowIdx += 2;
    ws.mergeCells(rowIdx, 1, rowIdx, cols);
    const footerCell = ws.getCell(rowIdx, 1);
    footerCell.value = "These are estimates only. Actual fees depend on your specific transaction. Ferguson Law will provide exact figures.   |   fergusonlawja.com";
    footerCell.font  = { italic: true, size: 8, color: { argb: MUTED }, name: "Calibri" };
    footerCell.alignment = { wrapText: true, vertical: "top" };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "Ferguson-Law-Cost-Estimate.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #cost-print-area, #cost-print-area * { visibility: visible !important; }
        #cost-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; box-sizing: border-box; }
        .no-print { display: none !important; }
      }
    `}</style>
    <div id="cost-print-area" style={{ fontFamily: "var(--sans, system-ui, sans-serif)", color: "var(--ink, #24211b)", maxWidth: 780, margin: "0 auto", padding: "0 1rem 4rem" }}>

      {/* Party toggle */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.4rem" }}>
        {(["buyer", "seller"] as Party[]).map((p) => (
          <button key={p} onClick={() => setParty(p)} style={{
            flex: 1, padding: "12px 0", border: `2px solid ${party === p ? "#10211c" : "#ddd8cc"}`,
            borderRadius: 10, background: party === p ? "#10211c" : "#fff",
            color: party === p ? "#fff" : "#666", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
            textTransform: "capitalize", transition: "all .15s",
          }}>
            {p === "buyer" ? "I am Buying" : "I am Selling"}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.6rem" }}>
        {([["rough", "Rough Estimate", "I haven't confirmed any numbers yet"], ["actual", "Actual Numbers", "I have quotes from my professionals"]] as [Mode, string, string][]).map(([m, lbl, sub]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "10px 14px", border: `2px solid ${mode === m ? "#c9a86a" : "#ddd8cc"}`,
            borderRadius: 10, background: mode === m ? "rgba(201,168,106,.08)" : "#fff",
            cursor: "pointer", textAlign: "left", transition: "all .15s",
          }}>
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: mode === m ? "#8a6420" : "#444", marginBottom: 2 }}>{lbl}</div>
            <div style={{ fontSize: ".75rem", color: "#888", lineHeight: 1.4 }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Selling price */}
      <div style={{ marginBottom: "1.6rem" }}>
        <label style={{ display: "block", fontSize: ".78rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#69736d", marginBottom: 6 }}>
          Agreed Selling Price (JMD)
        </label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#888", fontSize: "1rem" }}>J$</span>
          <input
            type="text" inputMode="numeric" placeholder="e.g. 18,000,000"
            value={priceStr} onChange={(e) => setPriceStr(formatWithCommas(e.target.value))}
            style={{ width: "100%", padding: "13px 14px 13px 36px", fontSize: "1.1rem", fontWeight: 600, border: "2px solid #e2ddd4", borderRadius: 10, outline: "none", background: "#faf9f7", boxSizing: "border-box" }}
            onFocus={(e) => (e.target.style.borderColor = "#c9a86a")}
            onBlur={(e) => (e.target.style.borderColor = "#e2ddd4")}
          />
        </div>
      </div>

      {/* Fee rows — always visible; shows dashes until price is entered */}
      <div style={{ borderRadius: 14, border: "1px solid #e7e1d6", overflow: "hidden", marginBottom: "1.6rem" }}>
        {/* Header */}
        <div style={{ background: "#10211c", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#c9a86a" }}>Fee Breakdown — {party === "buyer" ? "Buyer" : "Seller"}</span>
          <span style={{ fontSize: ".72rem", color: "#9fb3ab", letterSpacing: ".05em" }}>{mode === "rough" ? "Estimated ranges" : "Enter your actual quotes"}</span>
        </div>

        {applicable.map((f, i) => {
          const rough = roughAmounts[f.key] ?? { lo: 0, hi: 0 };
          const actual = actualAmounts[f.key] ?? 0;
          const ov = overrides[f.key] ?? (f.defaultFixed ? { useFixed: true, value: "" } : undefined);
          const isLast = i === applicable.length - 1;

          // Determine display value
          const isFixed = f.roughFixed !== undefined;
          const actualVal = actualAmounts[f.key] ?? 0;
          const showDash = mode === "rough"
            ? (f.noRoughEstimate || (!hasPrice && !isFixed))
            : (f.noRoughEstimate ? actualVal === 0 : !hasPrice);

          return (
            <div key={f.key} style={{ padding: "16px 20px", borderBottom: isLast ? "none" : "1px solid #f0ede6", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: ".95rem", marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: ".78rem", color: "#9a8f7a" }}>
                  {f.roughNote}
                  {f.who === "both" && (" · " + (f.splitNote ?? "each party pays their share"))}
                </div>
                {!f.noOverride && mode === "actual" && (hasPrice || f.noRoughEstimate) && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={() => setOverride(f.key, "useFixed", false)} style={{
                      fontSize: ".72rem", padding: "4px 10px", borderRadius: 6,
                      border: `1px solid ${!ov?.useFixed ? "#c9a86a" : "#ddd"}`,
                      background: !ov?.useFixed ? "rgba(201,168,106,.1)" : "#fff",
                      color: !ov?.useFixed ? "#8a6420" : "#888", cursor: "pointer", fontWeight: 600,
                    }}>% of price</button>
                    <button onClick={() => setOverride(f.key, "useFixed", true)} style={{
                      fontSize: ".72rem", padding: "4px 10px", borderRadius: 6,
                      border: `1px solid ${ov?.useFixed ? "#c9a86a" : "#ddd"}`,
                      background: ov?.useFixed ? "rgba(201,168,106,.1)" : "#fff",
                      color: ov?.useFixed ? "#8a6420" : "#888", cursor: "pointer", fontWeight: 600,
                    }}>J$ amount</button>
                    {ov?.useFixed ? (
                      <input type="text" inputMode="numeric" placeholder="e.g. 150,000"
                        value={ov?.value ?? ""} onChange={(e) => setOverride(f.key, "value", formatWithCommas(e.target.value))}
                        style={{ width: 130, padding: "5px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: ".85rem" }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="text" inputMode="decimal" placeholder={f.roughFixed !== undefined ? "fixed" : `${((f.roughPctLow ?? 0) * 100).toFixed(1)}`}
                          value={ov?.useFixed === false ? (ov.value ?? "") : ""}
                          onChange={(e) => setOverride(f.key, "value", e.target.value)}
                          disabled={f.roughFixed !== undefined}
                          style={{ width: 70, padding: "5px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: ".85rem", background: f.roughFixed !== undefined ? "#f5f5f5" : "#fff" }}
                        />
                        <span style={{ fontSize: ".78rem", color: "#888" }}>%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", minWidth: 140 }}>
                {showDash ? (
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "#ccc" }}>—</span>
                ) : mode === "rough" ? (
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "#10211c", fontVariantNumeric: "tabular-nums" }}>
                    {fmtRange(rough.lo, rough.hi)}
                  </span>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "#10211c", fontVariantNumeric: "tabular-nums" }}>
                    {(hasPrice || f.noRoughEstimate) ? fmt(actual) : "—"}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div style={{ background: "#10211c", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#c9a86a" }}>
              Estimated Total Additional Cost
            </div>
            <div style={{ fontSize: ".72rem", color: "#9fb3ab", marginTop: 3 }}>
              {hasPrice
                ? party === "seller"
                  ? `Deducted from your ${fmt(price)} selling proceeds`
                  : `On top of the ${fmt(price)} purchase price`
                : "Enter a selling price above"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: "1.35rem", color: "#c9a86a", fontVariantNumeric: "tabular-nums" }}>
              {hasPrice
                ? (mode === "rough" ? fmtRange(roughTotal.lo, roughTotal.hi) : fmt(actualTotal))
                : "—"}
            </div>
            {hasPrice && mode === "rough" && price >= 100000 && (
              <div style={{ fontSize: ".72rem", color: "#9fb3ab", marginTop: 2 }}>
                {((roughTotal.lo / price) * 100).toFixed(1)}–{((roughTotal.hi / price) * 100).toFixed(1)}% of price
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: "rgba(201,168,106,.07)", border: "1px solid rgba(201,168,106,.25)", borderRadius: 10, padding: "14px 18px", marginBottom: "1.6rem", fontSize: ".82rem", color: "#7a6d52", lineHeight: 1.65 }}>
        <strong style={{ color: "#8a6420" }}>These are estimates only.</strong> Actual fees depend on your specific transaction, the professionals you engage, and any lender requirements. Ferguson Law will provide exact figures once we review your matter.
      </div>

      {/* Export actions */}
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: "1.4rem", flexWrap: "wrap" }}>
        <button onClick={() => window.print()} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
          border: "1.5px solid #c9a86a", borderRadius: 8, background: "#fff",
          color: "#8a6420", fontWeight: 700, fontSize: ".85rem", cursor: "pointer",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Save as PDF
        </button>
        <button onClick={downloadCSV} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
          border: "1.5px solid #e2ddd4", borderRadius: 8, background: "#fff",
          color: "#555", fontWeight: 700, fontSize: ".85rem", cursor: "pointer",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download XLSX
        </button>
      </div>

      {/* CTA */}
      <div className="no-print" style={{ background: "linear-gradient(135deg,#0e2518,#1a3828)", borderRadius: 14, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <div style={{ fontSize: ".75rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#c9a86a" }}>Know your numbers exactly</div>
        <p style={{ margin: 0, color: "rgba(246,242,234,.85)", fontSize: ".95rem", lineHeight: 1.65, maxWidth: 440 }}>
          Book a 20-minute consultation with Ferguson Law. We&apos;ll walk you through the exact costs for your transaction — before you sign anything.
        </p>
        <BookButton className="btn btn-gold">
          Book a Consultation
        </BookButton>
      </div>

      <p className="no-print" style={{ marginTop: "1.6rem", fontSize: ".8rem", color: "#aaa", textAlign: "center" }}>
        <Link href="/explainers/costs" style={{ color: "#9a8f7a" }}>View all cost explanations →</Link>
      </p>
    </div>
    </>
  );
}
