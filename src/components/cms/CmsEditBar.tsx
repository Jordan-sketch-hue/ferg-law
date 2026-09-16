"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Check, Pencil, AlertCircle } from "lucide-react";

/**
 * CmsEditBar for Ferguson Law (Next.js).
 * Mount once in the root layout. Activates on ?edit_mode=1 when
 * localStorage["fl_admin_token"] matches a valid token.
 */

const VALID_TOKENS = ["ferguson-admin-2026", "jst-jordan-2026"];
const STORAGE_KEY  = "fl_admin_token";

interface PopoverState {
  page: string; block: string; currentValue: string; rect: DOMRect;
}

interface EditBus {
  subscribe: (cb: (state: PopoverState | null) => void) => () => void;
  open: (state: PopoverState) => void;
  close: () => void;
}

const bus: EditBus = (() => {
  const ls = new Set<(s: PopoverState | null) => void>();
  return {
    subscribe: (cb) => { ls.add(cb); return () => ls.delete(cb); },
    open:  (s) => ls.forEach(fn => fn(s)),
    close: ()  => ls.forEach(fn => fn(null)),
  };
})();

export { bus as flEditBus };

function TokenGate({ onAuth }: { onAuth: () => void }) {
  const [token, setToken] = useState("");
  const [err, setErr]     = useState(false);
  const submit = () => {
    if (VALID_TOKENS.includes(token.trim())) {
      localStorage.setItem(STORAGE_KEY, token.trim()); onAuth();
    } else { setErr(true); }
  };
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <h2 className="mb-1 text-lg font-bold" style={{ color: "#1c3d2e" }}>Admin Edit Mode</h2>
        <p className="mb-5 text-sm text-neutral-500">Enter your access token to edit content inline.</p>
        <input type="password" value={token} autoFocus
          onChange={e => { setToken(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Admin token…"
          className="mb-3 w-full rounded-xl border px-4 py-3 text-sm outline-none"
          style={{ borderColor: err ? "#dc2626" : "#d1d5db" }}
        />
        {err && <p className="mb-3 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" /> Invalid token</p>}
        <button type="button" onClick={submit} className="w-full rounded-xl py-3 text-sm font-bold text-white" style={{ background: "#1c3d2e" }}>
          Activate Edit Mode
        </button>
      </div>
    </div>
  );
}

function InlineEditPopover({ state, onClose }: { state: PopoverState; onClose: () => void }) {
  const [value,  setValue]  = useState(state.currentValue);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setValue(state.currentValue); setSaved(false); setError(""); }, [state.block]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  const save = async () => {
    setSaving(true); setError("");
    const sb = createClient();
    const { error: err } = await sb.from("fl_site_blocks").upsert({
      page_slug: state.page, block_key: state.block, value,
      updated_at: new Date().toISOString(), updated_by: "admin",
    }, { onConflict: "page_slug,block_key" });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 800);
  };
  const top  = Math.min(state.rect.bottom + 8, window.innerHeight - 260);
  const left = Math.min(Math.max(state.rect.left, 8), window.innerWidth - 350);
  return (
    <div ref={ref} className="fixed z-[9100] w-80 rounded-2xl bg-white shadow-2xl" style={{ top, left, border: "1.5px solid #e5e7eb" }}>
      <div className="flex items-center justify-between rounded-t-2xl px-4 py-3" style={{ background: "#1c3d2e", color: "#fff" }}>
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <Pencil className="h-3.5 w-3.5" /> {state.block}
        </span>
        <button type="button" onClick={onClose}><X className="h-4 w-4 opacity-70 hover:opacity-100" /></button>
      </div>
      <div className="p-4">
        <textarea value={value} onChange={e => { setValue(e.target.value); setSaved(false); }} rows={4}
          className="mb-3 w-full resize-y rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: "#e5e7eb" }} autoFocus />
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void save()} disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white"
            style={{ background: saved ? "#16a34a" : "#1c3d2e" }}>
            {saved ? <><Check className="h-4 w-4" /> Saved!</> : saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "#f3f4f6", color: "#374151" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function CmsEditBar() {
  const [active,   setActive]   = useState(false);
  const [authed,   setAuthed]   = useState(false);
  const [popover,  setPopover]  = useState<PopoverState | null>(null);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("edit_mode")) return;
    const token = localStorage.getItem(STORAGE_KEY) ?? "";
    if (VALID_TOKENS.includes(token)) { setActive(true); setAuthed(true); }
    else { setShowGate(true); }
  }, []);

  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === "Escape") bus.close(); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, []);
  useEffect(() => bus.subscribe(s => setPopover(s)), []);
  useEffect(() => { (window as Window & { __flEditMode?: boolean }).__flEditMode = active && authed; }, [active, authed]);

  const handleAuth = () => { setShowGate(false); setActive(true); setAuthed(true); };

  if (showGate) return <TokenGate onAuth={handleAuth} />;
  if (!active || !authed) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[8999] flex items-center justify-between px-5 py-2.5"
        style={{ background: "linear-gradient(90deg,#1c3d2e,#0f2a1e)", color: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div className="flex items-center gap-3">
          <Pencil className="h-4 w-4" style={{ color: "#c8a65c" }} />
          <span className="text-sm font-bold">Edit Mode — Click any text to edit it live</span>
        </div>
        <button type="button"
          onClick={() => { setActive(false); const u = new URL(window.location.href); u.searchParams.delete("edit_mode"); window.history.replaceState({}, "", u.toString()); }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(255,255,255,0.12)" }}>
          <X className="h-3.5 w-3.5" /> Exit
        </button>
      </div>
      <style>{`body { padding-top: 44px !important; }`}</style>
      {popover && <InlineEditPopover state={popover} onClose={() => { setPopover(null); bus.close(); }} />}
    </>
  );
}