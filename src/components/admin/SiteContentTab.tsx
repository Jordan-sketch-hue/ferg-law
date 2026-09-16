"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const G   = "#102A1E";
const GOLD = "#C8A65C";
const INK  = "#24211b";
const MUT  = "#69736d";
const BOR  = "#ede8de";
const BG   = "#fbf9f5";

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  about: "About",
  services: "Services",
  "cost-estimator": "Cost Estimator",
  booking: "Booking",
  faq: "FAQ",
  "value-estimator": "Property Estimator",
  global: "Global / Shared",
};

const PAGE_PATHS: Record<string, string> = {
  home: "/",
  about: "/about",
  services: "/services",
  "cost-estimator": "/cost-estimator",
  booking: "/booking",
  faq: "/faq",
  "value-estimator": "/value-estimator",
  global: "",
};

interface Block {
  id: string; page_slug: string; block_key: string;
  content_type: "text" | "richtext" | "image" | "list" | "url" | "boolean";
  value: string | null; label: string | null; sort_order: number;
  updated_at: string; updated_by: string | null;
}

export default function SiteContentTab({ token }: { token: string }) {
  const [blocks, setBlocks]         = useState<Block[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [editing, setEditing]       = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState<Record<string, boolean>>({});
  const [saved, setSaved]           = useState<Record<string, boolean>>({});
  const [err, setErr]               = useState<Record<string, string>>({});
  const [dragging, setDragging]     = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const bkey = (b: Block) => `${b.page_slug}::${b.block_key}`;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/site-content?token=${encodeURIComponent(token)}`);
    if (!res.ok) { setLoading(false); return; }
    const data = (await res.json()) as Block[];
    setBlocks(data);
    const vals: Record<string, string> = {};
    data.forEach(b => { vals[bkey(b)] = b.value ?? ""; });
    setEditing(vals);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // Cmd/Ctrl+S saves all dirty blocks on active page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void saveAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const isDirty = (b: Block) => (editing[bkey(b)] ?? "") !== (b.value ?? "");

  const pageBlocks = blocks
    .filter(b => b.page_slug === activePage)
    .sort((a, b) => a.sort_order - b.sort_order);

  const dirtyCount = pageBlocks.filter(isDirty).length;
  const anyPageDirty = (slug: string) =>
    blocks.filter(b => b.page_slug === slug).some(isDirty);

  async function saveBlock(b: Block) {
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
      return false;
    }
    setSaved(p => ({ ...p, [bkey(b)]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [bkey(b)]: false })), 2500);
    setBlocks(prev => prev.map(bl =>
      bl.page_slug === b.page_slug && bl.block_key === b.block_key
        ? { ...bl, value: editing[bkey(b)] ?? "" } : bl
    ));
    return true;
  }

  async function saveAll() {
    const dirty = pageBlocks.filter(isDirty);
    await Promise.all(dirty.map(saveBlock));
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

  if (loading) return (
    <div style={{ padding: 32, color: MUT, fontSize: 13 }}>Loading site content...</div>
  );

  const viewPath = PAGE_PATHS[activePage];

  return (
    <div style={{ display: "flex", minHeight: 560, fontFamily: "inherit", background: BG }}>

      {/* Sidebar nav */}
      <nav style={{
        width: 188, flexShrink: 0, borderRight: `1px solid ${BOR}`,
        paddingTop: 12, background: BG,
      }}>
        <div style={{ padding: "4px 16px 12px", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.06em", color: MUT, textTransform: "uppercase" }}>
          Pages
        </div>
        {Object.entries(PAGE_LABELS).map(([slug, label]) => {
          const active  = activePage === slug;
          const hasDirt = anyPageDirty(slug);
          return (
            <button key={slug} type="button" onClick={() => setActivePage(slug)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", textAlign: "left", padding: "9px 16px", fontSize: 13,
              fontWeight: active ? 700 : 400,
              color: active ? G : INK,
              background: active ? "#f0ede6" : "transparent",
              border: "none", cursor: "pointer",
              borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
            }}>
              <span>{label}</span>
              {hasDirt && (
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: GOLD, flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Main editor */}
      <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto" }}>

        {/* Editing Mode Toggle — two options side-by-side */}
        <div style={{ marginBottom: 20, borderRadius: 12, border: `1.5px solid ${BOR}`, background: "#fff", overflow: "hidden" }}>
          <div style={{ display: "flex" }}>
            {/* Option A: Backend Forms */}
            <div style={{ flex: 1, padding: "16px 20px", background: G, display: "flex", flexDirection: "column", gap: 4, borderRight: `1px solid rgba(200,166,92,.3)` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: ".05em", textTransform: "uppercase" }}>Backend Forms<span style={{ marginLeft: 8, fontSize: 10, padding: "1px 7px", borderRadius: 99, background: GOLD, color: G, fontWeight: 700 }}>You are here</span></span>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(200,166,92,.75)" }}>Edit text &amp; images from this dashboard. Good for bulk changes.</p>
            </div>
            {/* Option B: Live Site Editor */}
            <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: G, letterSpacing: ".05em", textTransform: "uppercase" }}>Live Site Editor</span>
              <p style={{ margin: 0, fontSize: 11, color: MUT }}>Click text and images directly on the live page to edit in place.</p>
              {viewPath ? (
                <a href={`https://fergusonlawja.com${viewPath}?edit`} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, background: G, color: GOLD, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>Open Live Editor ↗</a>
              ) : (
                <span style={{ fontSize: 11, color: MUT }}>Select a page with a URL to open the live editor.</span>
              )}
            </div>
          </div>
          {/* Sub-header: page + save */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderTop: `1px solid ${BOR}` }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: G }}>{PAGE_LABELS[activePage] ?? activePage}<span style={{ fontWeight: 400, color: MUT, fontSize: 12, marginLeft: 8 }}>· backend form view</span></h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {dirtyCount > 0 && <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>{dirtyCount} unsaved</span>}
              <button type="button" onClick={() => void saveAll()} disabled={dirtyCount === 0} style={{ background: dirtyCount > 0 ? G : "#ccc", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: dirtyCount > 0 ? "pointer" : "not-allowed" }} title="Save all (⌘S)">Save All{dirtyCount > 0 ? ` (${dirtyCount})` : ""}</button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: MUT, marginBottom: 16 }}>
          Tip: ⌘S / Ctrl+S saves all unsaved blocks on this page
        </div>

        {pageBlocks.length === 0 && (
          <div style={{ color: MUT, fontSize: 13 }}>No content blocks for this page yet.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {pageBlocks.map(b => {
            const dirty = isDirty(b);
            return (
              <div key={bkey(b)} style={{
                background: "#fff", borderRadius: 12,
                border: `1px solid ${dirty ? GOLD : BOR}`,
                padding: "16px 20px",
                transition: "border-color 0.15s",
              }}>
                {/* Block header */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {dirty && (
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: GOLD, display: "inline-block", flexShrink: 0,
                      }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>
                      {b.label ?? b.block_key}
                    </span>
                    <span style={{
                      fontSize: 11, background: "#f0ede6", borderRadius: 4,
                      padding: "2px 7px", color: MUT,
                    }}>{b.content_type}</span>
                  </div>
                  {b.updated_at && (
                    <span style={{ fontSize: 11, color: MUT, whiteSpace: "nowrap" }}>
                      {new Date(b.updated_at).toLocaleDateString("en-JM")}
                      {b.updated_by ? ` · ${b.updated_by}` : ""}
                    </span>
                  )}
                </div>

                {/* Text input */}
                {(b.content_type === "text" || b.content_type === "url") && (
                  <div>
                    <input
                      value={editing[bkey(b)] ?? ""}
                      onChange={e => setEditing(p => ({ ...p, [bkey(b)]: e.target.value }))}
                      style={{
                        display: "block", width: "100%", boxSizing: "border-box",
                        border: `1px solid ${dirty ? GOLD : BOR}`, borderRadius: 8,
                        padding: "9px 12px", fontSize: 13, color: INK,
                        fontFamily: "inherit", background: "#fcfaf7",
                        outline: "none",
                      }}
                    />
                    <div style={{ fontSize: 11, color: MUT, textAlign: "right", marginTop: 3 }}>
                      {(editing[bkey(b)] ?? "").length} chars
                    </div>
                  </div>
                )}

                {/* Rich text */}
                {b.content_type === "richtext" && (
                  <div>
                    <textarea
                      value={editing[bkey(b)] ?? ""}
                      onChange={e => setEditing(p => ({ ...p, [bkey(b)]: e.target.value }))}
                      rows={5}
                      style={{
                        display: "block", width: "100%", boxSizing: "border-box",
                        border: `1px solid ${dirty ? GOLD : BOR}`, borderRadius: 8,
                        padding: "9px 12px", fontSize: 13, color: INK,
                        fontFamily: "inherit", background: "#fcfaf7",
                        resize: "vertical", outline: "none", lineHeight: 1.6,
                      }}
                    />
                    <div style={{ fontSize: 11, color: MUT, textAlign: "right", marginTop: 3 }}>
                      {(editing[bkey(b)] ?? "").length} chars
                    </div>
                  </div>
                )}

                {/* Image */}
                {b.content_type === "image" && (
                  <div>
                    {editing[bkey(b)] && (
                      <img src={editing[bkey(b)]} alt={b.label ?? ""} style={{
                        maxWidth: "100%", maxHeight: 180, borderRadius: 8,
                        marginBottom: 10, objectFit: "cover", display: "block",
                      }} />
                    )}
                    {/* Drag-drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(bkey(b)); }}
                      onDragLeave={() => setDragging(null)}
                      onDrop={e => {
                        e.preventDefault(); setDragging(null);
                        const f = e.dataTransfer.files[0];
                        if (f) void uploadImage(b, f);
                      }}
                      style={{
                        border: `2px dashed ${dragging === bkey(b) ? GOLD : BOR}`,
                        borderRadius: 8, padding: "12px",
                        background: dragging === bkey(b) ? "#fdf7eb" : "#fcfaf7",
                        marginBottom: 8, textAlign: "center", fontSize: 12, color: MUT,
                        transition: "all 0.15s",
                      }}
                    >
                      {saving[bkey(b)] ? "Uploading..." : "Drop image here or use fields below"}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        value={editing[bkey(b)] ?? ""}
                        onChange={e => setEditing(p => ({ ...p, [bkey(b)]: e.target.value }))}
                        placeholder="Paste image URL..."
                        style={{
                          flex: 1, border: `1px solid ${BOR}`, borderRadius: 8,
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
                        whiteSpace: "nowrap",
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
                  <button
                    type="button"
                    onClick={() => void saveBlock(b)}
                    disabled={saving[bkey(b)] || !dirty}
                    style={{
                      background: saving[bkey(b)] ? "#ccc" : dirty ? G : "#aab3a8",
                      color: "#fff", border: "none", borderRadius: 8,
                      padding: "7px 16px", fontSize: 12, fontWeight: 600,
                      cursor: (saving[bkey(b)] || !dirty) ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving[bkey(b)] ? "Saving..." : "Save"}
                  </button>
                  {saved[bkey(b)] && (
                    <span style={{ fontSize: 12, color: "#27ae60", fontWeight: 600 }}>✓ Live</span>
                  )}
                  {dirty && !saving[bkey(b)] && !saved[bkey(b)] && (
                    <span style={{ fontSize: 11, color: GOLD }}>Unsaved</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
