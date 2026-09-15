"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GREEN = "#102A1E";
const GOLD  = "#C8A65C";
const INK   = "#24211b";
const MUTED = "#69736d";
const BORDER = "#ede8de";

interface Block {
  id: string;
  page_slug: string;
  block_key: string;
  content_type: "text" | "richtext" | "image" | "list" | "url" | "boolean";
  value: string | null;
  label: string | null;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
}

const PAGE_LABELS: Record<string, string> = {
  home: "Home Page",
  about: "About",
  services: "Services",
  "cost-estimator": "Cost Estimator",
  booking: "Booking",
  faq: "FAQ",
  "value-estimator": "Property Estimator",
  global: "Global / Shared",
};

export default function SiteContentTab({ token }: { token: string }) {
  const [blocks, setBlocks]         = useState<Block[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [editing, setEditing]       = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState<Record<string, boolean>>({});
  const [saved, setSaved]           = useState<Record<string, boolean>>({});
  const [err, setErr]               = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/site-content?token=${encodeURIComponent(token)}`);
    if (!res.ok) { setLoading(false); return; }
    const data = (await res.json()) as Block[];
    setBlocks(data);
    const vals: Record<string, string> = {};
    data.forEach(b => { vals[`${b.page_slug}::${b.block_key}`] = b.value ?? ""; });
    setEditing(vals);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const pageBlocks = blocks
    .filter(b => b.page_slug === activePage)
    .sort((a, b) => a.sort_order - b.sort_order);

  const bkey = (b: Block) => `${b.page_slug}::${b.block_key}`;

  async function save(b: Block) {
    setSaving(p => ({ ...p, [bkey(b)]: true }));
    setErr(p => ({ ...p, [bkey(b)]: "" }));
    const res = await fetch("/api/admin/site-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token, page_slug: b.page_slug, block_key: b.block_key,
        content_type: b.content_type, value: editing[bkey(b)] ?? "", label: b.label,
      }),
    });
    setSaving(p => ({ ...p, [bkey(b)]: false }));
    if (!res.ok) {
      const { error: e } = (await res.json()) as { error: string };
      setErr(p => ({ ...p, [bkey(b)]: e ?? "Save failed" }));
      return;
    }
    setSaved(p => ({ ...p, [bkey(b)]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [bkey(b)]: false })), 2500);
    setBlocks(prev => prev.map(bl =>
      bl.page_slug === b.page_slug && bl.block_key === b.block_key
        ? { ...bl, value: editing[bkey(b)] ?? "" } : bl
    ));
  }

  async function uploadImage(b: Block, file: File) {
    setSaving(p => ({ ...p, [bkey(b)]: true }));
    const form = new FormData();
    form.append("token", token);
    form.append("file", file);
    form.append("page_slug", b.page_slug);
    form.append("block_key", b.block_key);
    const res = await fetch("/api/admin/site-content/upload", { method: "POST", body: form });
    setSaving(p => ({ ...p, [bkey(b)]: false }));
    if (!res.ok) {
      const { error: e } = (await res.json()) as { error: string };
      setErr(p => ({ ...p, [bkey(b)]: e ?? "Upload failed" })); return;
    }
    const { url } = (await res.json()) as { url: string };
    setEditing(p => ({ ...p, [bkey(b)]: url }));
    setBlocks(prev => prev.map(bl =>
      bl.page_slug === b.page_slug && bl.block_key === b.block_key ? { ...bl, value: url } : bl
    ));
    setSaved(p => ({ ...p, [bkey(b)]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [bkey(b)]: false })), 2500);
  }

  if (loading) return <div style={{ padding: 24, color: MUTED }}>Loading site content...</div>;

  return (
    <div style={{ display: "flex", gap: 0, minHeight: 520, fontFamily: "inherit" }}>
      <nav style={{
        width: 180, flexShrink: 0, borderRight: `1px solid ${BORDER}`,
        paddingTop: 8, paddingBottom: 8, background: "#fbf9f5",
      }}>
        {Object.entries(PAGE_LABELS).map(([slug, label]) => (
          <button key={slug} type="button" onClick={() => setActivePage(slug)} style={{
            display: "block", width: "100%", textAlign: "left",
            padding: "9px 16px", fontSize: 13,
            fontWeight: activePage === slug ? 700 : 400,
            color: activePage === slug ? GREEN : INK,
            background: activePage === slug ? "#f0ede6" : "transparent",
            border: "none", cursor: "pointer",
            borderLeft: activePage === slug ? `3px solid ${GOLD}` : "3px solid transparent",
          }}>
            {label}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: GREEN }}>
            {PAGE_LABELS[activePage] ?? activePage}
          </h2>
          <span style={{ fontSize: 12, color: MUTED }}>
            {pageBlocks.length} block{pageBlocks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {pageBlocks.length === 0 && (
          <div style={{ color: MUTED, fontSize: 13 }}>No content blocks for this page yet.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pageBlocks.map(b => (
            <div key={bkey(b)} style={{
              background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: "16px 20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{b.label ?? b.block_key}</span>
                  <span style={{
                    marginLeft: 8, fontSize: 11, background: "#f0ede6",
                    borderRadius: 4, padding: "2px 7px", color: MUTED,
                  }}>{b.content_type}</span>
                </div>
                {b.updated_at && (
                  <span style={{ fontSize: 11, color: MUTED }}>
                    {new Date(b.updated_at).toLocaleDateString("en-JM")}
                    {b.updated_by ? ` · ${b.updated_by}` : ""}
                  </span>
                )}
              </div>

              {(b.content_type === "text" || b.content_type === "url") && (
                <input
                  value={editing[bkey(b)] ?? ""}
                  onChange={e => setEditing(p => ({ ...p, [bkey(b)]: e.target.value }))}
                  style={{
                    display: "block", width: "100%", boxSizing: "border-box",
                    border: `1px solid ${BORDER}`, borderRadius: 8,
                    padding: "9px 12px", fontSize: 13, color: INK,
                    fontFamily: "inherit", background: "#fcfaf7",
                  }}
                />
              )}

              {b.content_type === "richtext" && (
                <textarea
                  value={editing[bkey(b)] ?? ""}
                  onChange={e => setEditing(p => ({ ...p, [bkey(b)]: e.target.value }))}
                  rows={5}
                  style={{
                    display: "block", width: "100%", boxSizing: "border-box",
                    border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px",
                    fontSize: 13, color: INK, fontFamily: "inherit",
                    background: "#fcfaf7", resize: "vertical",
                  }}
                />
              )}

              {b.content_type === "image" && (
                <div>
                  {editing[bkey(b)] && (
                    <img src={editing[bkey(b)]} alt={b.label ?? ""} style={{
                      maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: 10, objectFit: "cover",
                    }} />
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      value={editing[bkey(b)] ?? ""}
                      onChange={e => setEditing(p => ({ ...p, [bkey(b)]: e.target.value }))}
                      placeholder="Paste image URL..."
                      style={{
                        flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8,
                        padding: "9px 12px", fontSize: 13, color: INK,
                        fontFamily: "inherit", background: "#fcfaf7",
                      }}
                    />
                    <input
                      ref={el => { fileRefs.current[bkey(b)] = el; }}
                      type="file" accept="image/*" style={{ display: "none" }}
                      id={`img-${bkey(b)}`}
                      onChange={e => { const f = e.target.files?.[0]; if (f) void uploadImage(b, f); }}
                    />
                    <label htmlFor={`img-${bkey(b)}`} style={{
                      background: "#f0ede6", borderRadius: 8, padding: "9px 14px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", color: INK,
                    }}>
                      Upload
                    </label>
                  </div>
                </div>
              )}

              {err[bkey(b)] && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#c0392b" }}>{err[bkey(b)]}</div>
              )}

              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <button type="button" onClick={() => void save(b)} disabled={saving[bkey(b)]} style={{
                  background: saving[bkey(b)] ? "#ccc" : GREEN, color: "#fff",
                  border: "none", borderRadius: 8, padding: "8px 18px",
                  fontSize: 13, fontWeight: 600,
                  cursor: saving[bkey(b)] ? "not-allowed" : "pointer",
                }}>
                  {saving[bkey(b)] ? "Saving..." : "Save & Go Live"}
                </button>
                {saved[bkey(b)] && (
                  <span style={{ fontSize: 12, color: "#27ae60", fontWeight: 600 }}>Live</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
