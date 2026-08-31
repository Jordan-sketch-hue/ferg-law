"use client";

import { useEffect, useState } from "react";

interface EbookLead {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  purchase_timeframe: string | null;
  purchase_location: string | null;
  financing_type: string | null;
  first_time_buyer: boolean | null;
  budget_band: string | null;
  source: string | null;
  consent: boolean | null;
}

const GREEN = "#102A1E";
const GOLD  = "#C8A65C";
const CREAM = "#fbf8f1";
const MUTED = "#5c645e";
const LINE  = "rgba(16,42,30,.1)";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" });
}

export default function EbookLeadsTab({ token }: { token: string }) {
  const [leads, setLeads]   = useState<EbookLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/ebook-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setLeads(d.leads ?? []);
      })
      .catch(() => setError("Failed to load."))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.country?.toLowerCase().includes(q) ||
      l.budget_band?.toLowerCase().includes(q)
    );
  });

  function exportCsv() {
    const cols = ["Date", "Name", "Email", "Phone", "Country", "Location", "Timeframe", "Financing", "First-time buyer", "Budget", "Source"];
    const rows = filtered.map((l) => [
      fmt(l.created_at),
      l.name ?? "",
      l.email ?? "",
      l.phone ?? "",
      l.country ?? "",
      l.purchase_location ?? "",
      l.purchase_timeframe ?? "",
      l.financing_type ?? "",
      l.first_time_buyer ? "Yes" : "No",
      l.budget_band ?? "",
      l.source ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ebook-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div style={{ padding: "1.5rem 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.25rem", color: GREEN, margin: 0 }}>
            H.O.M.E.® Buyer&apos;s Guide Leads
          </h2>
          <p style={{ fontSize: ".8rem", color: MUTED, margin: "4px 0 0" }}>
            {loading ? "Loading…" : `${filtered.length} lead${filtered.length !== 1 ? "s" : ""}${search ? " matching search" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Search name, email, country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 12px", fontSize: ".82rem", border: `1px solid ${LINE}`, borderRadius: 8, outline: "none", minWidth: 220, background: CREAM }}
          />
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            style={{ padding: "8px 16px", borderRadius: 8, background: GREEN, color: CREAM, fontSize: ".82rem", fontWeight: 700, border: "none", cursor: "pointer" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && <p style={{ color: "#b3261e", fontSize: ".85rem" }}>{error}</p>}

      {!loading && filtered.length === 0 && !error && (
        <p style={{ color: MUTED, fontSize: ".9rem", textAlign: "center", padding: "3rem 0" }}>
          {search ? "No leads match that search." : "No ebook leads yet."}
        </p>
      )}

      {filtered.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
            <thead>
              <tr style={{ background: GREEN, color: CREAM }}>
                {["Date", "Name", "Email", "Phone", "Country", "Location", "Timeframe", "Financing", "FTB", "Budget"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap", fontSize: ".72rem", letterSpacing: ".05em", textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 === 0 ? "#fff" : CREAM, borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: MUTED }}>{fmt(l.created_at)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: GREEN, whiteSpace: "nowrap" }}>{l.name || "—"}</td>
                  <td style={{ padding: "10px 12px", color: MUTED }}>{l.email || "—"}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: MUTED }}>{l.phone || "—"}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{l.country || "—"}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{l.purchase_location || "—"}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{l.purchase_timeframe || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{l.financing_type || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: ".7rem", fontWeight: 700,
                      background: l.first_time_buyer ? "#f0fdf4" : "#fff7ed",
                      color: l.first_time_buyer ? "#166534" : "#9a3412",
                    }}>
                      {l.first_time_buyer ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: ".7rem", fontWeight: 700, background: `${GOLD}22`, color: "#7a5c1a" }}>
                      {l.budget_band || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
