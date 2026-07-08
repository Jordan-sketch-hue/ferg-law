"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setByPath } from "@/lib/content/paths";
import { applyContent } from "./ContentApply";

const PUBLISHED_ID = "ferguson-pitch";
const PREVIEW_ID = "ferguson-pitch-preview";
const TOKEN_KEY = "fl_admin_token";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * In-place content editor (admin only).
 *
 * Activates only when `?edit` (or `#edit`) is present. Flow:
 *   1. Passcode gate — verify the firm admin token via RPC fl_is_admin.
 *   2. Load the preview doc (fallback to published) and apply it to the page.
 *   3. Make [data-edit] nodes contentEditable; [data-edit-img] click-to-swap.
 *   4. Toolbar: Save draft (preview), Publish (published), Exit.
 *
 * Dependency-free; brand-styled (Ferguson dark green / gold).
 */
/** True when the URL (query or hash) requests edit mode. SSR-safe. */
function urlWantsEdit(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).has("edit") ||
    window.location.hash.replace(/^#/, "") === "edit"
  );
}

export default function EditorOverlay() {
  // Lazy initializer reads the URL on the client's first render (false on SSR).
  const [active] = useState(urlWantsEdit);
  const [authed, setAuthed] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [gateError, setGateError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const tokenRef = useRef<string>("");

  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabase.current) supabase.current = createClient();
    return supabase.current;
  }, []);

  // Verify a token against the shared admin gate.
  const verifyToken = useCallback(
    async (token: string): Promise<boolean> => {
      const { data, error } = await getClient().rpc("fl_is_admin", {
        p_token: token,
      });
      return !error && data === true;
    },
    [getClient],
  );

  // Load preview (fallback published) and paint the page so the editor shows
  // current content.
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

  // Try a stored token on activation; otherwise the modal shows.
  useEffect(() => {
    if (!active || authed) return;
    let cancelled = false;
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TOKEN_KEY)
        : null;
    if (!stored) return;
    (async () => {
      const ok = await verifyToken(stored);
      if (cancelled) return;
      if (ok) {
        tokenRef.current = stored;
        setAuthed(true);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, authed, verifyToken]);

  // Once authed: load content and wire up editable nodes.
  useEffect(() => {
    if (!active || !authed) return;

    void loadAndApply();

    // hover/focus outline styling for editable nodes
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

    const textNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-edit]"),
    );
    textNodes.forEach((el) => {
      el.setAttribute("contenteditable", "true");
      el.spellcheck = false;
    });

    const imgNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-edit-img]"),
    );
    const onImgClick = (event: Event) => {
      event.preventDefault();
      const el = event.currentTarget as HTMLImageElement | HTMLVideoElement;
      const current = el.getAttribute("src") || "";
      const next = window.prompt("Paste a new image URL:", current);
      if (next && next.trim()) {
        el.setAttribute("src", next.trim());
        if (el.tagName === "VIDEO" && typeof (el as HTMLVideoElement).load === "function") {
          (el as HTMLVideoElement).load();
        }
      }
    };
    imgNodes.forEach((el) => el.addEventListener("click", onImgClick));

    return () => {
      document.getElementById("fl-editor-style")?.remove();
      textNodes.forEach((el) => {
        el.removeAttribute("contenteditable");
      });
      imgNodes.forEach((el) => el.removeEventListener("click", onImgClick));
    };
  }, [active, authed, loadAndApply]);

  // Build a nested content object from all editable nodes on the page.
  const collectContent = useCallback((): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    document.querySelectorAll<HTMLElement>("[data-edit]").forEach((el) => {
      const path = el.getAttribute("data-edit");
      if (path) setByPath(out, path, (el.textContent || "").trim());
    });
    document
      .querySelectorAll<HTMLElement>("[data-edit-img]")
      .forEach((el) => {
        const path = el.getAttribute("data-edit-img");
        const src = el.getAttribute("src");
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
          p_id: id,
          p_content: content,
          p_token: tokenRef.current,
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
    setChecking(true);
    setGateError("");
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
          <p style={S.modalSub}>
            This unlocks in-place editing for the Ferguson Law site.
          </p>
          <input
            type="password"
            value={codeInput}
            autoFocus
            placeholder="Admin code"
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitCode();
            }}
            style={S.input}
          />
          {gateError ? <div style={S.error}>{gateError}</div> : null}
          <div style={S.modalRow}>
            <button onClick={exitEditor} style={S.btnGhost} type="button">
              Cancel
            </button>
            <button
              onClick={() => void submitCode()}
              style={S.btnGold}
              disabled={checking}
              type="button"
            >
              {checking ? "Checking…" : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Editing toolbar ----
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved ✓"
        : saveState === "error"
          ? "Error — retry"
          : null;

  return (
    <div style={S.toolbar}>
      <span style={S.toolbarLabel}>
        <span style={S.dot} /> Editing Ferguson Law
      </span>
      <span style={S.toolbarSpacer} />
      {saveLabel ? <span style={S.status}>{saveLabel}</span> : null}
      <button
        onClick={() => void persist(PREVIEW_ID)}
        style={S.btnGhostBar}
        disabled={saveState === "saving"}
        type="button"
      >
        Save draft
      </button>
      <button
        onClick={() => void persist(PUBLISHED_ID)}
        style={S.btnGoldBar}
        disabled={saveState === "saving"}
        type="button"
      >
        Publish
      </button>
      <button onClick={exitEditor} style={S.btnExit} type="button">
        Exit
      </button>
    </div>
  );
}

// ---- Inline brand styling (dependency-free) ----
const INK = "#102A1E";
const INK2 = "#17402D";
const GOLD = "#C8A65C";

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100000,
    background: "rgba(16,20,16,.6)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "system-ui,-apple-system,sans-serif",
  },
  modal: {
    width: "100%",
    maxWidth: 380,
    background: "#FBF8F1",
    borderRadius: 20,
    padding: "26px 26px 22px",
    boxShadow: "0 40px 90px -30px rgba(0,0,0,.6)",
    border: "1px solid rgba(200,166,92,.35)",
  },
  modalKicker: {
    fontSize: ".64rem",
    fontWeight: 700,
    letterSpacing: ".18em",
    textTransform: "uppercase",
    color: "#A8853E",
  },
  modalTitle: {
    margin: "8px 0 6px",
    fontSize: "1.35rem",
    color: INK,
    fontFamily: "Fraunces,Georgia,serif",
  },
  modalSub: { fontSize: ".88rem", color: "#69736D", margin: "0 0 16px" },
  input: {
    width: "100%",
    fontSize: ".95rem",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1.5px solid rgba(18,16,12,.18)",
    background: "#fff",
    color: "#24211B",
    boxSizing: "border-box",
  },
  error: { fontSize: ".8rem", color: "#c0573f", marginTop: 10 },
  modalRow: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 18,
  },
  btnGhost: {
    fontWeight: 600,
    fontSize: ".9rem",
    padding: "11px 18px",
    borderRadius: 999,
    border: "1px solid rgba(18,16,12,.18)",
    background: "transparent",
    color: INK,
    cursor: "pointer",
  },
  btnGold: {
    fontWeight: 600,
    fontSize: ".9rem",
    padding: "11px 20px",
    borderRadius: 999,
    border: "none",
    background: GOLD,
    color: INK,
    cursor: "pointer",
  },
  toolbar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100000,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 18px",
    background: `linear-gradient(150deg,${INK},${INK2})`,
    borderTop: `1px solid rgba(200,166,92,.4)`,
    boxShadow: "0 -10px 30px -18px rgba(0,0,0,.6)",
    fontFamily: "system-ui,-apple-system,sans-serif",
  },
  toolbarLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    color: "#F6F2EA",
    fontWeight: 600,
    fontSize: ".92rem",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: GOLD,
    boxShadow: `0 0 0 4px rgba(200,166,92,.22)`,
    display: "inline-block",
  },
  toolbarSpacer: { flex: 1 },
  status: { color: GOLD, fontSize: ".82rem", fontWeight: 600 },
  btnGhostBar: {
    fontWeight: 600,
    fontSize: ".86rem",
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid rgba(246,242,234,.4)",
    background: "rgba(246,242,234,.08)",
    color: "#F6F2EA",
    cursor: "pointer",
  },
  btnGoldBar: {
    fontWeight: 700,
    fontSize: ".86rem",
    padding: "9px 18px",
    borderRadius: 999,
    border: "none",
    background: GOLD,
    color: INK,
    cursor: "pointer",
  },
  btnExit: {
    fontWeight: 600,
    fontSize: ".86rem",
    padding: "9px 14px",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "rgba(246,242,234,.7)",
    cursor: "pointer",
  },
};
