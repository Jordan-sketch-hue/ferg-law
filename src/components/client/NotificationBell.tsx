"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  matter_id: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const sb = createClient();

  async function load() {
    const { data } = await sb.rpc("fl_get_notifications");
    if (data) setNotifications(data as Notification[]);
  }

  async function markAllRead() {
    await sb.rpc("fl_mark_all_notifications_read");
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  }

  async function markRead(id: string) {
    await sb.rpc("fl_mark_notification_read", { p_notification_id: id });
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  }

  useEffect(() => { void load(); }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) void load(); }}
        style={{
          position: "relative", background: "none", border: "1.5px solid var(--line)",
          borderRadius: 10, width: 38, height: 38, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: unread > 0 ? "var(--gold-deep)" : "var(--muted)",
        }}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#c9a86a", color: "#10211c",
            fontSize: 10, fontWeight: 800, borderRadius: 999,
            minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px",
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "fixed", top: 56, left: "50%", transform: "translateX(-50%)", zIndex: 200,
          background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          border: "1px solid var(--line)",
          width: "min(340px, calc(100vw - 16px))", maxHeight: 400, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>Notifications</span>
            {unread > 0 && (
              <button onClick={() => void markAllRead()}
                style={{ background: "none", border: "none", fontSize: 12, color: "var(--gold-deep)", fontWeight: 700, cursor: "pointer" }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, padding: "20px 16px", margin: 0 }}>No notifications yet.</p>
            ) : notifications.map(n => (
              <div key={n.id}
                onClick={() => void markRead(n.id)}
                style={{
                  padding: "12px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer",
                  background: n.read ? "#fff" : "#fffbf0",
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}
              >
                {!n.read && (
                  <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: "#c9a86a", marginTop: 5 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString("en-JM", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", background: "#fafaf8" }}>
            <Link href="/directory/settings" onClick={() => setOpen(false)}
              style={{ fontSize: 12, color: "var(--gold-deep)", fontWeight: 600, textDecoration: "none" }}>
              ⚙ Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
