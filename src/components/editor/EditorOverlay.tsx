"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setByPath } from "@/lib/content/paths";
import { applyContent } from "./ContentApply";

const PUBLISHED_ID = "ferguson-pitch";
const PREVIEW_ID   = "ferguson-pitch-preview";
const TOKEN_KEY    = "fl_admin_token";

type SaveState = "idle" | "saving" | "saved" | "error";

/** True when the URL hash requests legacy edit mode. SSR-safe.
 *  ?edit and ?edit_mode are now handled by CmsEditBar. */
function urlWantsEdit(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.replace(/^#/, "") === "legacy_edit";
}

// ── AXIOM-style floating pill toolbar ────────────────────────────────────────
interface HoverTarget {
  el:   HTMLElement;
  rect: DOMRect;
  type: "text" | "image";
}

function FLPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: "3px 9px", borderRadius: 100, border: "1.5px solid rgba(255,255,255,0.18)", background: "transparent", color: "#F6F2EA", fontSize: 10.5, fontWeight: 500, cursor: "pointer", lineHeight: 1.4, letterSpacing: "0.03em", transition: "background 0.12s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}

function FLColorPill({ title, char, onChange }: { title: string; char: string; onChange: (v: string) => void }) {
  return (
    <label title={title} style={{ position: "relative", display: "inline-flex", cursor: "pointer" }}>
      <span style={{ padding: "3px 9px", borderRadius: 100, border: "1.5px solid rgba(255,255,255,0.18)", color: "#F6F2EA", fontSize: 10.5, fontWeight: 500, lineHeight: 1.4 }}>
        {char}
      </span>
      <input type="color" onChange={e => onChange(e.target.value)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
    </label>
  );
}

function FloatingEditorBar({ target, onClose }: { target: HoverTarget; onClose: () => void }) {
  const { el, rect, type } = target;

  const top  = Math.max(8, rect.top - 52);
  const left = Math.max(8, Math.min(
    (typeof window !== "undefined" ? window.innerWidth : 1400) - 310,
    rect.left + rect.width / 2 - 148,
  ));

  const applyInline = (key: string, val: string) => {
    (el.style as unknown as Record<string, string>)[key] = val;
  };

  const promptNewImage = () => {
    const current = (el as HTMLImageElement).getAttribute("src") || "";
    const next = window.prompt("Paste a new image URL:", current);
    if (next?.trim()) el.setAttribute("src", next.trim());
  };

  return (
    <div data-fl-toolbar="1"
      style={{ position: "fixed", top, left, zIndex: 100001, display: "flex", alignItems: "center", gap: 4, background: "#0c2218", borderRadius: 100, padding: "5px 8px", boxShadow: "0 6px 28px rgba(0,0,0,0.55),0 0 0 1px rgba(200,166,92,0.3)", fontFamily: "system-ui,-apple-system,sans-serif", userSelect: "none" }}>

      {/* Primary action */}
      {type === "text" ? (
        <button type="button"
          onClick={() => el.focus()}
          style={{ padding: "4px 12px", borderRadius: 100, border: "none", background: "#c8a65c", color: "#0c2218", fontSize: 10.5, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em" }}>
          ✏ EDIT TEXT
        </button>
      ) : (
        <button type="button"
          onClick={promptNewImage}
          style={{ padding: "4px 12px", borderRadius: 100, border: "none", background: "#c8a65c", color: "#0c2218", fontSize: 10.5, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em" }}>
          🖼 SWAP IMAGE
        </button>
      )}

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />

      {type === "text" && (
        <>
          <FLPill label="B" onClick={() => {
            const w = parseInt(window.getComputedStyle(el).fontWeight) || 400;
            applyInline("fontWeight", w >= 600 ? "400" : "700");
          }} />
          <FLPill label="A+" onClick={() => {
            const s = parseFloat(window.getComputedStyle(el).fontSize);
            applyInline("fontSize", (s + 2) + "px");
          }} />
          <FLPill label="A−" onClick={() => {
            const s = parseFloat(window.getComputedStyle(el).fontSize);
            applyInline("fontSize", Math.max(8, s - 2) + "px");
          }} />
          <FLColorPill title="Text Color" char="T" onChange={v => applyInline("color", v)} />
        </>
      )}
      <FLColorPill title="BG Color" char="■" onChange={v => applyInline("background", v)} />

      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />

      <button type="button" onClick={onClose}
        style={{ padding: "3px 8px", borderRadius: 100, border: "none", background: "transparent", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 14 }}>
        ×
      </button>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function EditorOverlay() {
  const [active]    = useState(urlWantsEdit);
  const [authed,    setAuthed]    = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [gateError, setGateError] = useState("");
  const [checking,  setChecking]  = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
  const tokenRef = useRef<string>("");

  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabase.current) supabase.current = createClient();
    return supabase.current;
  }, []);

  const verifyToken = useCallback(
    async (token: string): Promise<boolean> => {
      const { data, error } = await getClient().rpc("fl_is_admin", { p_token: token });
      return !error && data === true;
    },
    [getClient],
  );

  const loadAndApply = useCallback(async () => {
    const client = getClient();
    for (const id of [PREVIEW_ID, PUBLISHED_ID]) {
      const { data, error } = await client
        .from("homeready_site_content")
        .select("content")
        .eq("id", id)
        .maybeSingle();
      if (!error && data?.content) {
        applyContent(data.content as Record<string, unknown>);
        return;
      }
    }
  }, [getClient]);

  useEffect(() => {
    if (!active || authed) return;
    let cancelled = false;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!stored) return;
    (async () => {
      const ok = await verifyToken(stored);
      if (cancelled) return;
      if (ok) { tokenRef.current = stored; setAuthed(true); }
      else window.localStorage.removeItem(TOKEN_KEY);
    })();
    return () => { cancelled = true; };
  }, [active, authed, verifyToken]);

  useEffect(() => {
    if (!active || !authed) return;

    void loadAndApply();

    const style = document.createElement("style");
    style.id = "fl-editor-style";
    style.textContent = `
      [data-edit],[data-edit-img]{transition:outline-color .15s,box-shadow .15s}
      [data-edit]:hover,[data-edit-img]:hover{outline:2px dashed rgba(200,166,92,.65);outline-offset:3px;cursor:text}
      [data-edit-img]:hover{cursor:pointer}
      [data-edit][contenteditable="true"]:focus{outline:2px solid #C8A65C;outline-offset:3px;box-shadow:0 0 0 4px rgba(200,166,92,.18)}
      body{padding-bottom:74px}
    `;
    document.head.appendChild(style);

    const textNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-edit]"));
    textNodes.forEach(el => { el.setAttribute("contenteditable", "true"); el.spellcheck = false; });

    // Image click-to-swap (handled inline in FloatingEditorBar for toolbar; keep native click for non-toolbar path)
    const imgNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-edit-img]"));
    const onImgClick = (event: Event) => {
      event.preventDefault();
      const el = event.currentTarget as HTMLImageElement | HTMLVideoElement;
      const current = el.getAttribute("src") || "";
      const next = window.prompt("Paste a new image URL:", current);
      if (next?.trim()) {
        el.setAttribute("src", next.trim());
        if (el.tagName === "VIDEO" && typeof (el as HTMLVideoElement).load === "function")
          (el as HTMLVideoElement).load();
      }
    };
    imgNodes.forEach(el => el.addEventListener("click", onImgClick));

    // ── Floating toolbar hover tracking ──────────────────────────────────────
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-fl-toolbar]")) return;
      const textEl = t.closest("[data-edit]") as HTMLElement | null;
      if (textEl) { setHoverTarget({ el: textEl, rect: textEl.getBoundingClientRect(), type: "text" }); return; }
      const imgEl  = t.closest("[data-edit-img]") as HTMLElement | null;
      if (imgEl)  { setHoverTarget({ el: imgEl,  rect: imgEl.getBoundingClientRect(),  type: "image" }); return; }
    };
    const onOut = (e: MouseEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      if (!to?.closest("[data-edit]") && !to?.closest("[data-edit-img]") && !to?.closest("[data-fl-toolbar]"))
        setHoverTarget(null);
    };
    const onScroll = () =>
      setHoverTarget(t => t ? { ...t, rect: t.el.getBoundingClientRect() } : null);

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout",  onOut);
    window.addEventListener("scroll",      onScroll, { passive: true });
    // ─────────────────────────────────────────────────────────────────────────

    return () => {
      document.getElementById("fl-editor-style")?.remove();
      textNodes.forEach(el => el.removeAttribute("contenteditable"));
      imgNodes.forEach(el => el.removeEventListener("click", onImgClick));
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout",  onOut);
      window.removeEventListener("scroll",      onScroll);
    };
  }, [active, authed, loadAndApply]);

  const collectContent = useCallback((): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    document.querySelectorAll<HTMLElement>("[data-edit]").forEach(el => {
      const path = el.getAttribute("data-edit");
      if (path) setByPath(out, path, (el.textContent || "").trim());
    });
    document.querySelectorAll<HTMLElement>("[data-edit-img]").forEach(el => {
      const path = el.getAttribute("data-edit-img");
      const src  = el.getAttribute("src");
      if (path && src) setByPath(out, path, src);
    });
    return out;
  }, []);

  const persist = useCallback(
    async (id: string) => {
      setSaveState("saving");
      try {
        const content = collectContent();
        const { error } = await getClient().rpc("fl_save_content", {
          p_id: id, p_content: content, p_token: tokenRef.current,
        });
        if (error) throw error;
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 2200);
      } catch {
        setSaveState("error");
        window.setTimeout(() => setSaveState("idle"), 3200);
      }
    },
    [collectContent, getClient],
  );

  const submitCode = useCallback(async () => {
    const token = codeInput.trim();
    if (!token) return;
    setChecking(true); setGateError("");
    const ok = await verifyToken(token);
    setChecking(false);
    if (ok) {
      window.localStorage.setItem(TOKEN_KEY, token);
      tokenRef.current = token;
      setAuthed(true);
    } else {
      setGateError("That code wasn't recognised. Please try again.");
    }
  }, [codeInput, verifyToken]);

  const exitEditor = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    if (url.hash.replace(/^#/, "") === "edit") url.hash = "";
    window.location.href = url.toString();
  }, []);

  if (!active) return null;

  // ---- Passcode gate ----
  if (!authed) {
    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={S.modalKicker}>Ferguson Law · Editor</div>
          <h3 style={S.modalTitle}>Enter your admin code</h3>
          <p style={S.modalSub}>This unlocks in-place editing for the Ferguson Law site.</p>
          <input
            type="password" value={codeInput} autoFocus placeholder="Admin code"
            onChange={e => setCodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void submitCode(); }}
            style={S.input}
          />
          {gateError ? <div style={S.error}>{gateError}</div> : null}
          <div style={S.modalRow}>
            <button onClick={exitEditor} style={S.btnGhost} type="button">Cancel</button>
            <button onClick={() => void submitCode()} style={S.btnGold} disabled={checking} type="button">
              {checking ? "Checking…" : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Editing toolbar ----
  const saveLabel =
    saveState === "saving" ? "Saving…"
    : saveState === "saved"  ? "Saved ✓"
    : saveState === "error"  ? "Error — retry"
    : null;

  return (
    <>
      {/* AXIOM-style floating quick-edit bar */}
      {hoverTarget && (
        <FloatingEditorBar
          target={hoverTarget}
          onClose={() => setHoverTarget(null)}
        />
      )}

      {/* Bottom fixed toolbar */}
      <div style={S.toolbar}>
        <span style={S.toolbarLabel}><span style={S.dot} /> Editing Ferguson Law</span>
        <span style={S.toolbarSpacer} />
        {saveLabel ? <span style={S.status}>{saveLabel}</span> : null}
        <button onClick={() => void persist(PREVIEW_ID)} style={S.btnGhostBar} disabled={saveState === "saving"} type="button">
          Save draft
        </button>
        <button onClick={() => void persist(PUBLISHED_ID)} style={S.btnGoldBar} disabled={saveState === "saving"} type="button">
          Publish
        </button>
        <button onClick={exitEditor} style={S.btnExit} type="button">Exit</button>
      </div>
    </>
  );
}

// ---- Inline brand styling (dependency-free) ----
const INK  = "#102A1E";
const INK2 = "#17402D";
const GOLD = "#C8A65C";

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 100000,
    background: "rgba(16,20,16,.6)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    fontFamily: "system-ui,-apple-system,sans-serif",
  },
  modal: {
    width: "100%", maxWidth: 380, background: "#FBF8F1", borderRadius: 20, padding: "26px 26px 22px",
    boxShadow: "0 40px 90px -30px rgba(0,0,0,.6)", border: "1px solid rgba(200,166,92,.35)",
  },
  modalKicker: { fontSize: ".64rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#A8853E" },
  modalTitle:  { margin: "8px 0 6px", fontSize: "1.35rem", color: INK, fontFamily: "Fraunces,Georgia,serif" },
  modalSub:    { fontSize: ".88rem", color: "#69736D", margin: "0 0 16px" },
  input: {
    width: "100%", fontSize: ".95rem", padding: "12px 14px", borderRadius: 12,
    border: "1.5px solid rgba(18,16,12,.18)", background: "#fff", color: "#24211B", boxSizing: "border-box",
  },
  error: { fontSize: ".8rem", color: "#c0573f", marginTop: 10 },
  modalRow: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 },
  btnGhost: {
    fontWeight: 600, fontSize: ".9rem", padding: "11px 18px", borderRadius: 999,
    border: "1px solid rgba(18,16,12,.18)", background: "transparent", color: INK, cursor: "pointer",
  },
  btnGold: {
    fontWeight: 600, fontSize: ".9rem", padding: "11px 20px", borderRadius: 999,
    border: "none", background: GOLD, color: INK, cursor: "pointer",
  },
  toolbar: {
    position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 100000,
    display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
    background: `linear-gradient(150deg,${INK},${INK2})`,
    borderTop: `1px solid rgba(200,166,92,.4)`,
    boxShadow: "0 -10px 30px -18px rgba(0,0,0,.6)",
    fontFamily: "system-ui,-apple-system,sans-serif",
  },
  toolbarLabel: { display: "inline-flex", alignItems: "center", gap: 9, color: "#F6F2EA", fontWeight: 600, fontSize: ".92rem" },
  dot:          { width: 9, height: 9, borderRadius: "50%", background: GOLD, boxShadow: `0 0 0 4px rgba(200,166,92,.22)`, display: "inline-block" },
  toolbarSpacer: { flex: 1 },
  status:        { color: GOLD, fontSize: ".82rem", fontWeight: 600 },
  btnGhostBar: {
    fontWeight: 600, fontSize: ".86rem", padding: "9px 16px", borderRadius: 999,
    border: "1px solid rgba(246,242,234,.4)", background: "rgba(246,242,234,.08)", color: "#F6F2EA", cursor: "pointer",
  },
  btnGoldBar: {
    fontWeight: 700, fontSize: ".86rem", padding: "9px 18px", borderRadius: 999,
    border: "none", background: GOLD, color: INK, cursor: "pointer",
  },
  btnExit: {
    fontWeight: 600, fontSize: ".86rem", padding: "9px 14px", borderRadius: 999,
    border: "none", background: "transparent", color: "rgba(246,242,234,.7)", cursor: "pointer",
  },
};