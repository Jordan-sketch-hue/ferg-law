"use client";

/**
 * Minimal live-chat AGENT console.
 *
 * STOPGAP AUTH: gated by a single shared code compared to
 * NEXT_PUBLIC_AGENT_CODE (default "ferguson"), remembered in localStorage.
 * This is intentionally lightweight — real per-agent auth lands in Phase 3 when
 * this view is merged into the CRM backoffice.
 *
 * Lists conversations in ('waiting_agent','agent') newest-first; opening one
 * streams its thread over Supabase realtime. Replying inserts role='agent' and
 * flips status to 'agent'. "Return to bot" sets status back to 'bot'.
 *
 * Writes use the browser anon client (RLS permits anon insert/select; the
 * conversation uuid is the capability token). For Phase 3 these move behind an
 * authenticated server action.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";

const AGENT_CODE = process.env.NEXT_PUBLIC_AGENT_CODE || "ferguson";
const AUTH_KEY = "fl_agent_authed";

type Status = "bot" | "waiting_agent" | "agent" | "closed";
interface Conversation {
  id: string;
  last_message_at: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  status: Status;
  unread_for_agent: number;
}
interface Message {
  id: string;
  conversation_id: string;
  role: "visitor" | "bot" | "agent" | "system";
  body: string | null;
  created_at: string;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-JM", {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AgentConsole() {
  // Lazy-init from localStorage (client-only; SSR returns the gate).
  const [authed, setAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(AUTH_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [code, setCode] = useState("");
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const tryAuth = () => {
    if (code.trim() === AGENT_CODE) {
      setAuthed(true);
      try {
        localStorage.setItem(AUTH_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      alert("Incorrect code.");
    }
  };

  // --- Load conversation list + subscribe to changes ----------------------
  const loadConvos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_conversations")
      .select(
        "id, last_message_at, visitor_name, visitor_email, visitor_phone, status, unread_for_agent",
      )
      .in("status", ["waiting_agent", "agent"])
      .order("last_message_at", { ascending: false })
      .limit(100);
    setConvos((data as Conversation[] | null) ?? []);
  }, []);

  useEffect(() => {
    if (!authed) return;
    // Initial fetch runs in an async IIFE so setState happens after await.
    void (async () => {
      await loadConvos();
    })();
    const supabase = createClient();
    const channel = supabase
      .channel("agent:conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => loadConvos(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed, loadConvos]);

  // --- Load + subscribe to the active thread ------------------------------
  // (Stale thread data when activeId clears is harmless — the placeholder
  // view renders whenever there is no active conversation.)
  useEffect(() => {
    if (!authed || !activeId) return;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, role, body, created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!cancelled) setThread((data as Message[] | null) ?? []);
    })();

    const channel = supabase
      .channel(`agent:thread:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setThread((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [authed, activeId]);

  // --- Auto-scroll thread -------------------------------------------------
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread]);

  // --- Claim a conversation when opened -----------------------------------
  const openConvo = useCallback(async (id: string) => {
    setActiveId(id);
    const supabase = createClient();
    await supabase
      .from("chat_conversations")
      .update({ status: "agent", unread_for_agent: 0 })
      .eq("id", id);
  }, []);

  const sendReply = useCallback(async () => {
    const text = reply.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("chat_messages").insert({
      conversation_id: activeId,
      role: "agent",
      body: text,
    });
    await supabase
      .from("chat_conversations")
      .update({
        status: "agent",
        last_message_at: new Date().toISOString(),
        unread_for_agent: 0,
      })
      .eq("id", activeId);
    setReply("");
    setSending(false);
  }, [reply, activeId, sending]);

  const returnToBot = useCallback(async () => {
    if (!activeId) return;
    const supabase = createClient();
    await supabase.from("chat_messages").insert({
      conversation_id: activeId,
      role: "system",
      body: "Conversation handed back to the assistant.",
      meta: { kind: "return_to_bot" },
    });
    await supabase
      .from("chat_conversations")
      .update({ status: "bot" })
      .eq("id", activeId);
    setActiveId(null);
  }, [activeId]);

  const onReplyKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // --- Auth screen --------------------------------------------------------
  if (!authed) {
    return (
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={S.brandMark}>Ferguson Law</div>
          <h1 style={S.authTitle}>Live Chat Console</h1>
          <p style={S.authSub}>Enter the team access code to continue.</p>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryAuth()}
            placeholder="Access code"
            style={S.authInput}
            aria-label="Access code"
          />
          <button type="button" onClick={tryAuth} style={S.authBtn}>
            Enter
          </button>
        </div>
      </div>
    );
  }

  const active = convos.find((c) => c.id === activeId) ?? null;

  // --- Console ------------------------------------------------------------
  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.sideHead}>
          <span style={S.sideTitle}>Conversations</span>
          <span style={S.badge}>{convos.length}</span>
        </div>
        <div style={S.convList}>
          {convos.length === 0 && (
            <p style={S.empty}>No active conversations.</p>
          )}
          {convos.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openConvo(c.id)}
                style={{
                  ...S.convItem,
                  ...(isActive ? S.convItemActive : null),
                }}
              >
                <div style={S.convTop}>
                  <span style={S.convName}>
                    {c.visitor_name || "Website visitor"}
                  </span>
                  <span
                    style={{
                      ...S.pill,
                      ...(c.status === "waiting_agent" ? S.pillWaiting : null),
                    }}
                  >
                    {c.status === "waiting_agent" ? "waiting" : "live"}
                  </span>
                </div>
                <div style={S.convMeta}>
                  {c.visitor_phone || c.visitor_email || "—"} ·{" "}
                  {fmtTime(c.last_message_at)}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main style={S.main}>
        {!active ? (
          <div style={S.placeholder}>
            <div style={S.brandMark}>Ferguson Law</div>
            <p style={{ color: "#69736d" }}>
              Select a conversation to start chatting.
            </p>
          </div>
        ) : (
          <>
            <header style={S.threadHead}>
              <div>
                <div style={S.threadName}>
                  {active.visitor_name || "Website visitor"}
                </div>
                <div style={S.threadMeta}>
                  {active.visitor_phone || active.visitor_email || "no contact"}
                </div>
              </div>
              <button type="button" onClick={returnToBot} style={S.botBtn}>
                Return to bot
              </button>
            </header>

            <div style={S.thread} ref={threadRef}>
              {thread.map((m) => {
                if (m.role === "system") {
                  return (
                    <div key={m.id} style={S.sysMsg}>
                      {m.body}
                    </div>
                  );
                }
                const mine = m.role === "agent";
                return (
                  <div
                    key={m.id}
                    style={{
                      ...S.bubble,
                      ...(mine ? S.bubbleAgent : S.bubbleVisitor),
                      alignSelf: mine ? "flex-end" : "flex-start",
                    }}
                  >
                    <span style={S.bubbleWho}>
                      {m.role === "agent"
                        ? "You"
                        : m.role === "bot"
                          ? "Assistant"
                          : "Visitor"}
                    </span>
                    {m.body}
                  </div>
                );
              })}
            </div>

            <footer style={S.replyBar}>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={onReplyKey}
                placeholder="Type a reply… (Enter to send)"
                rows={2}
                style={S.replyInput}
                aria-label="Reply"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                style={{
                  ...S.sendBtn,
                  ...(sending || !reply.trim() ? S.sendBtnOff : null),
                }}
              >
                Send
              </button>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

// Inline styles keep this self-contained (no globals.css edits).
const S: Record<string, React.CSSProperties> = {
  authWrap: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    background: "#15130e",
    fontFamily: "var(--sans, system-ui, sans-serif)",
    padding: 20,
  },
  authCard: {
    background: "#fbf8f1",
    borderRadius: 18,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 360,
    textAlign: "center",
    boxShadow: "0 30px 70px -24px rgba(0,0,0,.55)",
  },
  brandMark: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontWeight: 600,
    fontSize: "1.3rem",
    color: "#15130e",
    marginBottom: 6,
  },
  authTitle: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontSize: "1.05rem",
    color: "#24211b",
    margin: "6px 0 4px",
  },
  authSub: { color: "#69736d", fontSize: ".85rem", marginBottom: 18 },
  authInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(18,16,12,.2)",
    fontSize: ".95rem",
    marginBottom: 12,
    outline: "none",
  },
  authBtn: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 999,
    border: "none",
    background: "#c8a65c",
    color: "#15130e",
    fontWeight: 700,
    cursor: "pointer",
  },
  shell: {
    display: "flex",
    height: "100dvh",
    background: "#f6f2ea",
    fontFamily: "var(--sans, system-ui, sans-serif)",
    color: "#24211b",
  },
  sidebar: {
    width: 320,
    flex: "0 0 320px",
    borderRight: "1px solid rgba(18,16,12,.1)",
    background: "#fbf8f1",
    display: "flex",
    flexDirection: "column",
  },
  sideHead: {
    padding: "16px 18px",
    borderBottom: "1px solid rgba(18,16,12,.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideTitle: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontWeight: 600,
    fontSize: "1.05rem",
    color: "#15130e",
  },
  badge: {
    background: "#15130e",
    color: "#f6f2ea",
    borderRadius: 999,
    fontSize: ".72rem",
    fontWeight: 700,
    padding: "2px 9px",
  },
  convList: { overflowY: "auto", flex: 1 },
  empty: { padding: 18, color: "#69736d", fontSize: ".85rem" },
  convItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "13px 16px",
    border: "none",
    borderBottom: "1px solid rgba(18,16,12,.07)",
    background: "transparent",
    cursor: "pointer",
  },
  convItemActive: { background: "rgba(200,166,92,.16)" },
  convTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  convName: { fontWeight: 600, fontSize: ".92rem", color: "#15130e" },
  convMeta: { fontSize: ".74rem", color: "#69736d", marginTop: 3 },
  pill: {
    fontSize: ".64rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".06em",
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(111,207,151,.2)",
    color: "#2f7a52",
  },
  pillWaiting: { background: "rgba(200,166,92,.25)", color: "#8a6a22" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  placeholder: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    gap: 8,
  },
  threadHead: {
    padding: "14px 20px",
    borderBottom: "1px solid rgba(18,16,12,.1)",
    background: "#fbf8f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  threadName: {
    fontFamily: "var(--serif, Georgia, serif)",
    fontWeight: 600,
    fontSize: "1.05rem",
    color: "#15130e",
  },
  threadMeta: { fontSize: ".78rem", color: "#69736d", marginTop: 2 },
  botBtn: {
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid rgba(18,16,12,.2)",
    background: "transparent",
    color: "#15130e",
    fontWeight: 600,
    fontSize: ".82rem",
    cursor: "pointer",
  },
  thread: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  bubble: {
    maxWidth: "70%",
    padding: "10px 13px",
    borderRadius: 14,
    fontSize: ".92rem",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
  bubbleVisitor: {
    background: "#fff",
    border: "1px solid rgba(18,16,12,.1)",
    borderBottomLeftRadius: 4,
  },
  bubbleAgent: {
    background: "#15130e",
    color: "#f6f2ea",
    borderBottomRightRadius: 4,
  },
  bubbleWho: {
    display: "block",
    fontSize: ".64rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".07em",
    opacity: 0.6,
    marginBottom: 3,
  },
  sysMsg: {
    alignSelf: "center",
    fontSize: ".74rem",
    fontStyle: "italic",
    color: "#69736d",
    textAlign: "center",
  },
  replyBar: {
    borderTop: "1px solid rgba(18,16,12,.1)",
    background: "#fbf8f1",
    padding: 12,
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
  },
  replyInput: {
    flex: 1,
    resize: "none",
    border: "1px solid rgba(18,16,12,.18)",
    borderRadius: 12,
    padding: "10px 12px",
    fontFamily: "var(--sans, system-ui, sans-serif)",
    fontSize: ".92rem",
    outline: "none",
    maxHeight: 120,
  },
  sendBtn: {
    flex: "0 0 auto",
    padding: "11px 22px",
    borderRadius: 999,
    border: "none",
    background: "#c8a65c",
    color: "#15130e",
    fontWeight: 700,
    cursor: "pointer",
  },
  sendBtnOff: { opacity: 0.5, cursor: "not-allowed" },
};
