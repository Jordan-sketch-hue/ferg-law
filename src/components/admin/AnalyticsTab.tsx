"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#102A1E";
const GOLD  = "#C8A65C";
const CREAM = "#F6F2EA";
const MUTED = "#69736d";

interface Summary {
  ebook_submits:       number;
  pdf_downloads:       number;
  booking_clicks:      number;
  get_started_clicks:  number;
  cost_estimator_uses: number;
  page_views:          number;
  total_events:        number;
}

interface Event {
  id: string;
  event_name: string;
  page_path: string;
  referrer: string;
  country: string;
  city: string;
  device_type: string;
  properties: Record<string, unknown>;
  created_at: string;
}

interface Ref { referrer: string; cnt: number }
interface Country { country: string; cnt: number }

const EMPTY: Summary = {
  ebook_submits: 0, pdf_downloads: 0, booking_clicks: 0,
  get_started_clicks: 0, cost_estimator_uses: 0, page_views: 0, total_events: 0,
};

const DAYS_OPTIONS = [7, 30, 90];

function fmt(d: string) {
  return new Date(d).toLocaleString("en-JM", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function shortRef(r: string) {
  try { return new URL(r).hostname.replace(/^www\./, ""); } catch { return r || "Direct"; }
}
function eventLabel(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function AnalyticsTab({ token }: { token: string }) {
  const [days, setDays]         = useState(30);
  const [summary, setSummary]   = useState<Summary>(EMPTY);
  const [events, setEvents]     = useState<Event[]>([]);
  const [refs, setRefs]         = useState<Ref[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const [sumRes, evRes, refRes, cntRes] = await Promise.all([
      sb.rpc("fl_get_analytics_summary",  { p_token: token, p_days: days }),
      sb.rpc("fl_get_analytics_events",   { p_token: token, p_limit: 40 }),
      sb.rpc("fl_get_analytics_referrers",{ p_token: token, p_days: days }),
      sb.rpc("fl_get_analytics_countries",{ p_token: token, p_days: days }),
    ]);
    if (sumRes.data) setSummary(sumRes.data as Summary);
    if (evRes.data)  setEvents(evRes.data as Event[]);
    if (refRes.data) setRefs(refRes.data as Ref[]);
    if (cntRes.data) setCountries(cntRes.data as Country[]);
    setLoading(false);
  }, [token, days]);

  useEffect(() => { void load(); }, [load]);

  const S = {
    wrap:   { padding: "1.5rem" } as React.CSSProperties,
    row:    { display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" as const },
    card:   { background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, padding: "1.25rem 1rem", flex: 1, minWidth: 130 } as React.CSSProperties,
    label:  { fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: MUTED, marginBottom: 4 },
    num:    { fontSize: "1.9rem", fontWeight: 700, color: GREEN, lineHeight: 1 },
    h2:     { fontFamily: "var(--font-fraunces,Georgia,serif)", fontSize: "1.05rem", color: GREEN, marginBottom: ".75rem" },
    table:  { width: "100%", borderCollapse: "collapse" as const, fontSize: ".82rem" },
    th:     { textAlign: "left" as const, fontSize: ".67rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: MUTED, borderBottom: "1px solid rgba(18,16,12,.08)", padding: "6px 8px" },
    td:     { padding: "7px 8px", borderBottom: "1px solid rgba(18,16,12,.05)", color: "#24211b", verticalAlign: "top" as const },
    badge:  (name: string): React.CSSProperties => ({
      display: "inline-block", fontSize: ".65rem", fontWeight: 700, padding: "2px 7px",
      borderRadius: 6, background: name === "ebook_form_submit" ? "#f0fdf4"
        : name === "pdf_download" ? "#fffbeb" : name === "booking_click" ? "#eff6ff"
        : name === "page_view" ? "#f5f3ff" : CREAM,
      color: name === "ebook_form_submit" ? "#166534" : name === "pdf_download" ? "#92400e"
        : name === "booking_click" ? "#1d4ed8" : name === "page_view" ? "#6d28d9" : MUTED,
    }),
  };

  const StatCard = ({ label, value, gold }: { label: string; value: number; gold?: boolean }) => (
    <div style={S.card}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.num, color: gold ? GOLD : GREEN }}>{value.toLocaleString()}</div>
    </div>
  );

  return (
    <div style={S.wrap}>
      {/* Controls */}
      <div style={S.row}>
        <h2 style={{ ...S.h2, margin: 0 }}>Site Analytics</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: ".5rem" }}>
          {DAYS_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid", fontSize: ".78rem", fontWeight: 600, cursor: "pointer",
                background: days === d ? GREEN : "#fff", color: days === d ? "#fff" : GREEN, borderColor: days === d ? GREEN : "rgba(18,16,12,.2)" }}>
              {d}d
            </button>
          ))}
          <button onClick={() => void load()} disabled={loading}
            style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid rgba(18,16,12,.2)", fontSize: ".78rem", cursor: "pointer", background: "#fff", color: MUTED }}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
        <StatCard label="Ebook Submits"        value={summary.ebook_submits} gold />
        <StatCard label="PDF Downloads"        value={summary.pdf_downloads} />
        <StatCard label="Booking Clicks"       value={summary.booking_clicks} />
        <StatCard label="Get Started Clicks"   value={summary.get_started_clicks} />
        <StatCard label="Cost Estimator Uses"  value={summary.cost_estimator_uses} />
        <StatCard label="Page Views"           value={summary.page_views} />
      </div>

      {/* Two-column: referrers + countries */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.75rem" }}>
        <div style={{ background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, padding: "1rem 1.25rem" }}>
          <div style={S.h2}>Traffic Sources</div>
          {refs.length === 0 && !loading && <p style={{ color: MUTED, fontSize: ".82rem" }}>No data yet.</p>}
          <table style={S.table}>
            <tbody>
              {refs.map((r, i) => (
                <tr key={i}>
                  <td style={S.td}>{shortRef(r.referrer)}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: GREEN }}>{r.cnt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, padding: "1rem 1.25rem" }}>
          <div style={S.h2}>Visitor Countries</div>
          {countries.length === 0 && !loading && <p style={{ color: MUTED, fontSize: ".82rem" }}>No data yet.</p>}
          <table style={S.table}>
            <tbody>
              {countries.map((c, i) => (
                <tr key={i}>
                  <td style={S.td}>{c.country}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: GREEN }}>{c.cnt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent events */}
      <div style={{ background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, padding: "1rem 1.25rem" }}>
        <div style={S.h2}>Recent Activity</div>
        {events.length === 0 && !loading && (
          <p style={{ color: MUTED, fontSize: ".85rem" }}>No events recorded yet. Events will appear here once visitors interact with the site.</p>
        )}
        {events.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Event</th>
                  <th style={S.th}>Page</th>
                  <th style={S.th}>Referrer</th>
                  <th style={S.th}>Country</th>
                  <th style={S.th}>Device</th>
                  <th style={S.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td style={S.td}><span style={S.badge(ev.event_name)}>{eventLabel(ev.event_name)}</span></td>
                    <td style={{ ...S.td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: MUTED, fontSize: ".78rem" }}>{ev.page_path || "/"}</td>
                    <td style={{ ...S.td, fontSize: ".78rem", color: MUTED }}>{shortRef(ev.referrer)}</td>
                    <td style={{ ...S.td, fontSize: ".78rem" }}>{ev.country || "—"}</td>
                    <td style={{ ...S.td, fontSize: ".78rem", textTransform: "capitalize" }}>{ev.device_type || "—"}</td>
                    <td style={{ ...S.td, fontSize: ".75rem", color: MUTED, whiteSpace: "nowrap" }}>{fmt(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
