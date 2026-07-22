"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE, waLink } from "@/lib/site";
import { BookingContext } from "@/components/site/BookingProvider";
import "@/app/chat.css";

type Role = "visitor" | "bot" | "agent" | "system";
interface Msg {
  id: string;
  role: Role;
  body: string;
}

const STORAGE_KEY = "fl_chat_conversation_id";

const GREETING: Msg = {
  id: "greeting",
  role: "bot",
  body: `Hi 👋 Welcome to ${SITE.name}. I'm here to help with our services, fees, buying a home in Jamaica, or booking a consultation. What would you like to know?`,
};

const HIDE_CHAT_PATHS = ["/booking", "/directory/client", "/directory/client-login"];

function linkify(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s<>"]+)/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">${url}</a>`,
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const bookingCtx = useContext(BookingContext);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // Lazy-init from localStorage (SSR-safe: convId only drives the realtime
  // subscription, never the initial markup, so no hydration mismatch).
  const [convId, setConvId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Track ids we've already rendered so realtime never double-inserts.
  const seenIds = useRef<Set<string>>(new Set(["greeting"]));

  // --- Persist conversation id whenever it changes -------------------------
  useEffect(() => {
    if (!convId) return;
    try {
      localStorage.setItem(STORAGE_KEY, convId);
    } catch {
      /* ignore */
    }
  }, [convId]);

  // --- Load conversation history on open ------------------------------------
  const historyLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !convId || historyLoadedRef.current === convId) return;
    historyLoadedRef.current = convId;
    const supabase = createClient();
    supabase
      .from("chat_messages")
      .select("id, role, body")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (!data?.length) return;
        const loaded: Msg[] = data
          .filter((m) => m.body && (m.role === "visitor" || m.role === "bot" || m.role === "agent"))
          .map((m) => ({ id: m.id, role: m.role as Role, body: m.body! }));
        if (!loaded.length) return;
        seenIds.current = new Set(["greeting", ...loaded.map((m) => m.id)]);
        setMessages([GREETING, ...loaded]);
      });
  }, [open, convId]);

  // --- Auto-scroll to bottom on new messages / open ------------------------
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, sending]);

  // --- Realtime: agent + system replies arrive live ------------------------
  useEffect(() => {
    if (!convId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            role: Role;
            body: string | null;
          };
          if (!row.body) return;
          if (seenIds.current.has(row.id)) return;
          // Visitor + bot messages are already rendered optimistically /
          // from the POST response — only surface agent + system here.
          if (row.role !== "agent" && row.role !== "system") return;
          seenIds.current.add(row.id);
          setMessages((prev) => [
            ...prev,
            { id: row.id, role: row.role, body: row.body as string },
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId]);

  const pushMsg = useCallback((m: Msg) => {
    seenIds.current.add(m.id);
    setMessages((prev) => [...prev, m]);
  }, []);

  const send = useCallback(
    async (text: string, opts?: { silent?: boolean; system?: string }) => {
      const trimmed = text.trim();
      if ((!trimmed && !opts?.silent) || sending) return;

      if (trimmed && !opts?.silent) {
        pushMsg({ id: `v-${Date.now()}`, role: "visitor", body: trimmed });
      }
      if (opts?.system) {
        pushMsg({ id: `s-${Date.now()}`, role: "system", body: opts.system });
      }
      setInput("");
      setSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId ?? undefined,
            message: trimmed,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.conversationId && data.conversationId !== convId) {
          setConvId(data.conversationId);
        }
        if (data.handledByHuman) {
          // A human owns the thread — their reply arrives via realtime.
          pushMsg({
            id: `s-${Date.now()}-h`,
            role: "system",
            body: "A team member is with you — they'll reply here shortly.",
          });
        } else if (typeof data.reply === "string") {
          pushMsg({ id: `b-${Date.now()}`, role: "bot", body: data.reply });
        }
      } catch {
        pushMsg({
          id: `b-${Date.now()}-e`,
          role: "bot",
          body: `Sorry — I couldn't reach the server. Please message us on WhatsApp at ${SITE.whatsappDisplay}.`,
        });
      } finally {
        setSending(false);
        // Refocus input for fast back-and-forth.
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [convId, pushMsg, sending],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // ESC closes the panel.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  // Open via custom event (fired by ChatLink) — avoids Next.js router interference.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("fl:open-chat", handler);
    return () => window.removeEventListener("fl:open-chat", handler);
  }, []);

  const talkToPerson = useCallback(async () => {
    if (sending) return;
    pushMsg({
      id: `s-${Date.now()}`,
      role: "system",
      body: "Connecting you with a team member…",
    });
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId ?? undefined,
          action: "request_human",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.conversationId && data.conversationId !== convId) {
        setConvId(data.conversationId);
      }
      pushMsg({
        id: `s-${Date.now()}-h`,
        role: "system",
        body: `You're in the queue — a team member will reply here shortly. If you'd prefer, you can also message us on WhatsApp at ${SITE.whatsappDisplay}.`,
      });
    } catch {
      pushMsg({
        id: `s-${Date.now()}-e`,
        role: "system",
        body: `Couldn't reach the team just now — please message us on WhatsApp at ${SITE.whatsappDisplay}.`,
      });
    } finally {
      setSending(false);
    }
  }, [convId, pushMsg, sending]);

  const bookingOpen = bookingCtx?.open ?? false;
  if (HIDE_CHAT_PATHS.some((p) => pathname.startsWith(p)) || bookingOpen) return null;

  if (!open) {
    return (
      <button
        type="button"
        className="fl-chat-launch"
        aria-label={`Chat with ${SITE.name}`}
        onClick={() => setOpen(true)}
      >
        <span className="fl-dot" aria-hidden />
        Chat with us
      </button>
    );
  }

  return (
    <section
      className="fl-chat-panel"
      role="dialog"
      aria-label={`Chat with ${SITE.name}`}
      aria-modal="false"
    >
      <header className="fl-chat-header">
        <div className="fl-chat-header-top">
          <div>
            <div className="fl-chat-title">{SITE.name}</div>
            <div className="fl-chat-sub">
              <span className="fl-status-dot" aria-hidden />
              AI Assistant · Available 24/7
            </div>
          </div>
          <button
            type="button"
            className="fl-chat-close"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className="fl-chat-actions">
          <a
            className="fl-chat-action fl-wa"
            href={waLink("Hi Ferguson Law, I have a question")}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </header>

      <div className="fl-chat-body" ref={bodyRef}>
        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="fl-msg fl-msg-system">
                {m.body}
              </div>
            );
          }
          const cls =
            m.role === "visitor"
              ? "fl-msg fl-msg-visitor"
              : m.role === "agent"
                ? "fl-msg fl-msg-agent"
                : "fl-msg fl-msg-bot";
          return (
            <div key={m.id} className={cls}>
              {m.role === "agent" && (
                <span className="fl-msg-who">Ferguson Law team</span>
              )}
              {m.role === "bot"
                ? <span dangerouslySetInnerHTML={{ __html: linkify(m.body) }} />
                : m.body}
            </div>
          );
        })}
        {sending && (
          <div className="fl-typing" aria-label="Assistant is typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <footer className="fl-chat-foot">
        <div className="fl-chat-inputrow">
          <textarea
            ref={inputRef}
            className="fl-chat-input"
            placeholder="Type your message…"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Message"
          />
          <button
            type="button"
            className="fl-chat-send"
            aria-label="Send message"
            disabled={sending || !input.trim()}
            onClick={() => send(input)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <p className="fl-chat-fineprint">
          General information only — not legal advice.
        </p>
      </footer>
    </section>
  );
}
