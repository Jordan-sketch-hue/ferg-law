"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  X, Check, Pencil, Eye, EyeOff, RotateCcw, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Upload, AlertCircle
} from "lucide-react";

const VALID_TOKENS = ["ferguson-admin-2026", "jst-jordan-2026"];
const STORAGE_KEY  = "fl_admin_token";

export interface CmsStyles {
  fontSize?: string; fontWeight?: string; color?: string; fontFamily?: string;
  textAlign?: string; lineHeight?: string; letterSpacing?: string; textTransform?: string;
  background?: string; borderRadius?: string; borderWidth?: string;
  borderStyle?: string; borderColor?: string; opacity?: string;
  width?: string; maxWidth?: string; padding?: string; display?: string;
}

export interface EditorBusPayload {
  page: string; block: string; value: string;
  styles: CmsStyles; hidden: boolean;
  element: HTMLElement | null; contentType: "text" | "image"; rect: DOMRect;
}

interface EditBus {
  subscribe: (cb: (p: EditorBusPayload | null) => void) => () => void;
  open: (p: EditorBusPayload) => void; close: () => void;
}

const bus: EditBus = (() => {
  const ls = new Set<(p: EditorBusPayload | null) => void>();
  return {
    subscribe: (cb) => { ls.add(cb); return () => ls.delete(cb); },
    open: (p) => ls.forEach(fn => fn(p)), close: () => ls.forEach(fn => fn(null)),
  };
})();
export { bus as flEditBus };

function TokenGate({ onAuth }: { onAuth: () => void }) {
  const [token, setToken] = useState(""); const [err, setErr] = useState(false);
  const submit = () => { if (VALID_TOKENS.includes(token.trim())) { localStorage.setItem(STORAGE_KEY, token.trim()); onAuth(); } else setErr(true); };
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#1c3d2e" }}><Pencil className="h-5 w-5 text-white" /></div>
          <div><h2 className="font-bold" style={{ color: "#1c3d2e" }}>Visual Edit Mode</h2><p className="text-xs text-neutral-500">Ferguson Law</p></div>
        </div>
        <input type="password" value={token} autoFocus onChange={e => { setToken(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Admin token…" className="mb-3 w-full rounded-xl border px-4 py-3 text-sm outline-none" style={{ borderColor: err ? "#dc2626" : "#d1d5db" }} />
        {err && <p className="mb-3 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />Invalid token</p>}
        <button type="button" onClick={submit} className="w-full rounded-xl py-3 text-sm font-bold text-white" style={{ background: "#1c3d2e" }}>Activate Visual Editor</button>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, unit = "px", onChange }: { label: string; value?: string; min: number; max: number; step?: number; unit?: string; onChange: (v: string) => void }) {
  const num = parseFloat(value?.replace(unit, "") ?? "0") || 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</label>
        <span className="font-mono text-xs text-neutral-700">{num}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={num} onChange={e => onChange(e.target.value + unit)} className="h-1.5 w-full accent-emerald-900" />
    </div>
  );
}
function ColorPicker({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</label>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-neutral-700">{value || "—"}</span>
        <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)} className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
      </div>
    </div>
  );
}
function Pills({ label, options, value, onChange }: { label: string; options: { label: string; value: string; icon?: React.ReactNode }[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition"
            style={{ background: value === o.value ? "#1c3d2e" : "#f3f4f6", color: value === o.value ? "#fff" : "#374151" }}>
            {o.icon}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
function TextInput({ label, value, placeholder, onChange }: { label: string; value?: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{label}</label>
      <input value={value || ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-xs outline-none" style={{ borderColor: "#e5e7eb" }} />
    </div>
  );
}

const TABS = ["Content", "Type", "Layout", "Style"] as const;
type Tab = typeof TABS[number];

function VisualPanel({ payload, onClose }: { payload: EditorBusPayload; onClose: () => void }) {
  const [tab,     setTab]     = useState<Tab>("Content");
  const [value,   setValue]   = useState(payload.value);
  const [styles,  setStyles]  = useState<CmsStyles>(payload.styles ?? {});
  const [hidden,  setHidden]  = useState(payload.hidden);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);

  useEffect(() => { setValue(payload.value); setStyles(payload.styles ?? {}); setHidden(payload.hidden); setSaved(false); setError(""); setTab("Content"); }, [payload.block, payload.page]);

  const applyStyle = useCallback((key: keyof CmsStyles, val: string) => {
    setStyles(p => ({ ...p, [key]: val }));
    if (payload.element) (payload.element.style as unknown as Record<string, string>)[key] = val;
  }, [payload.element]);

  useEffect(() => { if (payload.element) payload.element.style.opacity = hidden ? "0.3" : ""; }, [hidden, payload.element]);

  const save = async () => {
    setSaving(true); setError("");
    let finalValue = value;
    const sb = createClient();
    try {
      if (imgFile) {
        const ext = imgFile.name.split(".").pop() ?? "jpg";
        const path = `cms/${payload.page}/${payload.block}-${Date.now()}.${ext}`;
        const bytes = await imgFile.arrayBuffer();
        const { error: upErr } = await sb.storage.from("site-media").upload(path, bytes, { contentType: imgFile.type, upsert: true });
        if (upErr) throw new Error(upErr.message);
        const { data: { publicUrl } } = sb.storage.from("site-media").getPublicUrl(path);
        finalValue = publicUrl;
      }
      const { error: err } = await sb.from("fl_site_blocks").upsert({
        page_slug: payload.page, block_key: payload.block, value: finalValue,
        styles: Object.keys(styles).length > 0 ? styles : null, hidden,
        updated_at: new Date().toISOString(), updated_by: "admin",
      }, { onConflict: "page_slug,block_key" });
      if (err) {
        const { error: err2 } = await sb.from("fl_site_blocks").upsert({
          page_slug: payload.page, block_key: payload.block, value: finalValue,
          updated_at: new Date().toISOString(), updated_by: "admin",
        }, { onConflict: "page_slug,block_key" });
        if (err2) throw new Error(err2.message);
      }
      setSaved(true); setImgFile(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const isImage = payload.contentType === "image";

  return (
    <div className="fixed bottom-0 right-0 top-11 z-[9999] flex flex-col bg-white" style={{ width: 310, borderLeft: "1.5px solid #e5e7eb", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" }}>
      <div className="flex shrink-0 items-center justify-between px-4 py-3" style={{ background: "#1c3d2e", color: "#fff" }}>
        <div className="flex min-w-0 items-center gap-2">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
          <span className="truncate text-xs font-bold">{payload.page} · {payload.block}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setHidden(h => !h)} className="rounded p-1 hover:bg-white/10">
            {hidden ? <EyeOff className="h-3.5 w-3.5 text-yellow-300" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => { setStyles({}); if (payload.element) payload.element.removeAttribute("style"); }} className="rounded p-1 hover:bg-white/10">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex shrink-0 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className="flex-1 py-2.5 text-[11px] font-semibold"
            style={{ color: tab === t ? "#1c3d2e" : "#9ca3af", borderBottom: tab === t ? "2px solid #1c3d2e" : "2px solid transparent" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "Content" && (
          <>
            {!isImage && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Text Content</label>
                <textarea value={value} onChange={e => { setValue(e.target.value); if (payload.element) payload.element.textContent = e.target.value; }}
                  rows={6} className="mb-1 w-full resize-y rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#e5e7eb" }} autoFocus />
                <p className="text-right text-[10px] text-neutral-400">{value.length} chars</p>
              </div>
            )}
            {isImage && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Image</label>
                {value && <img src={value} alt="" className="mb-3 max-h-40 w-full rounded-xl object-cover" />}
                <div className="mb-2 rounded-xl border-2 border-dashed p-4 text-center text-xs text-neutral-400"
                  style={{ borderColor: imgFile ? "#1c3d2e" : "#e5e7eb" }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setImgFile(f); setValue(URL.createObjectURL(f)); } }}>
                  {imgFile ? `Ready: ${imgFile.name}` : "Drop image here or upload"}
                </div>
                <label className="mb-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold" style={{ background: "#f3f4f6", color: "#1c3d2e" }}>
                  <Upload className="h-3.5 w-3.5" /> Upload image
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setImgFile(f); setValue(URL.createObjectURL(f)); } }} />
                </label>
                <TextInput label="Or paste URL" value={value} placeholder="https://..." onChange={v => { setValue(v); if (payload.element && payload.element.tagName === "IMG") (payload.element as HTMLImageElement).src = v; }} />
              </div>
            )}
          </>
        )}

        {tab === "Type" && (
          <>
            <Slider label="Font size" value={styles.fontSize} min={10} max={96} unit="px" onChange={v => applyStyle("fontSize", v)} />
            <Pills label="Weight" options={[{label:"300",value:"300"},{label:"400",value:"400"},{label:"500",value:"500"},{label:"600",value:"600"},{label:"700",value:"700"},{label:"800",value:"800"}]} value={styles.fontWeight} onChange={v => applyStyle("fontWeight", v)} />
            <ColorPicker label="Color" value={styles.color} onChange={v => applyStyle("color", v)} />
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Font family</label>
              <select value={styles.fontFamily || ""} onChange={e => applyStyle("fontFamily", e.target.value)} className="w-full rounded-xl border px-3 py-2 text-xs outline-none" style={{ borderColor: "#e5e7eb" }}>
                <option value="">Default</option>
                <option value="'Inter', sans-serif">Inter (Body)</option>
                <option value="'Fraunces', serif">Fraunces (Heading)</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
            <Pills label="Align" options={[{label:"",value:"left",icon:<AlignLeft className="h-3.5 w-3.5" />},{label:"",value:"center",icon:<AlignCenter className="h-3.5 w-3.5" />},{label:"",value:"right",icon:<AlignRight className="h-3.5 w-3.5" />},{label:"",value:"justify",icon:<AlignJustify className="h-3.5 w-3.5" />}]} value={styles.textAlign} onChange={v => applyStyle("textAlign", v)} />
            <Slider label="Line height" value={styles.lineHeight} min={0.8} max={3} step={0.05} unit="" onChange={v => applyStyle("lineHeight", v)} />
            <Slider label="Letter spacing" value={styles.letterSpacing} min={-2} max={12} step={0.5} unit="px" onChange={v => applyStyle("letterSpacing", v)} />
            <Pills label="Transform" options={[{label:"None",value:"none"},{label:"UPPER",value:"uppercase"},{label:"Title",value:"capitalize"},{label:"lower",value:"lowercase"}]} value={styles.textTransform} onChange={v => applyStyle("textTransform", v)} />
          </>
        )}

        {tab === "Layout" && (
          <>
            <TextInput label="Width" value={styles.width} placeholder="auto / 100% / 320px" onChange={v => applyStyle("width", v)} />
            <TextInput label="Max width" value={styles.maxWidth} placeholder="800px" onChange={v => applyStyle("maxWidth", v)} />
            <TextInput label="Padding" value={styles.padding} placeholder="16px / 8px 16px" onChange={v => applyStyle("padding", v)} />
            <Pills label="Display" options={[{label:"inline",value:"inline"},{label:"block",value:"block"},{label:"flex",value:"flex"}]} value={styles.display} onChange={v => applyStyle("display", v)} />
            <div className="mb-3">
              <label className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                <span>Opacity</span><span className="font-mono text-neutral-700">{Math.round(parseFloat(styles.opacity || "1") * 100)}%</span>
              </label>
              <input type="range" min={0} max={100} step={1} value={Math.round(parseFloat(styles.opacity || "1") * 100)} onChange={e => applyStyle("opacity", (parseInt(e.target.value)/100).toString())} className="h-1.5 w-full accent-emerald-900" />
            </div>
          </>
        )}

        {tab === "Style" && (
          <>
            <ColorPicker label="Background" value={styles.background} onChange={v => applyStyle("background", v)} />
            <Slider label="Border radius" value={styles.borderRadius} min={0} max={48} unit="px" onChange={v => applyStyle("borderRadius", v)} />
            <div className="mb-4 rounded-xl border p-3" style={{ borderColor: "#e5e7eb" }}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-400">Border</p>
              <Slider label="Width" value={styles.borderWidth} min={0} max={8} unit="px" onChange={v => applyStyle("borderWidth", v)} />
              <Pills label="Style" options={[{label:"None",value:"none"},{label:"Solid",value:"solid"},{label:"Dashed",value:"dashed"},{label:"Dotted",value:"dotted"}]} value={styles.borderStyle} onChange={v => applyStyle("borderStyle", v)} />
              <ColorPicker label="Color" value={styles.borderColor} onChange={v => applyStyle("borderColor", v)} />
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        {hidden && <p className="mb-2 rounded-lg px-3 py-1.5 text-xs font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>Block hidden from visitors</p>}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
          style={{ background: saved ? "#16a34a" : "#1c3d2e" }}>
          {saved ? <><Check className="h-4 w-4" /> Saved & live!</> : saving ? "Saving…" : "Save to site"}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-neutral-400">⌘S to save · changes go live instantly</p>
      </div>
    </div>
  );
}

export function CmsEditBar() {
  const [active,   setActive]   = useState(false);
  const [authed,   setAuthed]   = useState(false);
  const [payload,  setPayload]  = useState<EditorBusPayload | null>(null);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("edit_mode") && !params.has("edit")) return;
    const token = localStorage.getItem(STORAGE_KEY) ?? "";
    if (VALID_TOKENS.includes(token)) { setActive(true); setAuthed(true); } else setShowGate(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") bus.close(); };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => bus.subscribe(p => setPayload(p)), []);
  useEffect(() => { (window as Window & { __flEditMode?: boolean }).__flEditMode = active && authed; }, [active, authed]);

  const handleAuth = () => { setShowGate(false); setActive(true); setAuthed(true); };
  if (showGate) return <TokenGate onAuth={handleAuth} />;
  if (!active || !authed) return null;

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[9999] flex items-center justify-between px-5 py-2"
        style={{ background: "linear-gradient(90deg,#1c3d2e,#0f2a1e)", color: "#fff", boxShadow: "0 2px 20px rgba(0,0,0,0.35)" }}>
        <div className="flex items-center gap-3">
          <Pencil className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-bold">Visual Edit Mode</span>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(250,204,21,0.15)", color: "#fcd34d" }}>
            Click any text to edit · ⌘S to save
          </span>
        </div>
        <div className="flex items-center gap-2">
          {payload && <span className="text-xs text-white/50">Editing: <strong className="text-yellow-300">{payload.block}</strong></span>}
          <button type="button"
            onClick={() => { setActive(false); setPayload(null); bus.close(); const u = new URL(window.location.href); u.searchParams.delete("edit_mode"); window.history.replaceState({}, "", u.toString()); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(255,255,255,0.1)" }}>
            <X className="h-3.5 w-3.5" /> Exit editor
          </button>
        </div>
      </div>
      <style>{`
        header.nav{top:44px!important;} body { padding-top: 44px !important; padding-right: ${payload ? "310px" : "0"} !important; transition: padding-right 0.2s; }
        [data-cms-editable]:hover { outline: 1.5px dashed #c8a65c !important; outline-offset: 2px; cursor: pointer; }
        [data-cms-selected] { outline: 2px solid #c8a65c !important; outline-offset: 2px; }
      `}</style>
      {payload && <VisualPanel payload={payload} onClose={() => { setPayload(null); bus.close(); }} />}
    </>
  );
}