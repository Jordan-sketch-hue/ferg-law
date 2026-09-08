'use client';

import { useEffect, useState, useCallback } from 'react';

interface Notification {
  id: string;
  title: string;
  body?: string;
  deep_link?: string;
  event_type?: string;
  icon?: string;
  read_at?: string | null;
  created_at: string;
}

interface Props {
  userRef: string;
  userRole?: string;
  site?: string;
}

export default function NotificationCenter({ userRef, userRole = 'client', site = 'ferguson-law' }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unread = notifications.filter((n) => !n.read_at).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userRef=${encodeURIComponent(userRef)}&userRole=${userRole}&site=${site}`);
      const data = await res.json();
      if (data.ok) setNotifications(data.notifications ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [userRef, userRole, site]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, userRef }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await Promise.all(unreadIds.map((id) => fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, userRef }),
    })));
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const eventIcon = (type?: string) => {
    const map: Record<string, string> = {
      matter_update: '⚖️', document_ready: '📄', message: '💬',
      reminder: '⏰', payment: '💳', booking: '📅', welcome: '🎉',
    };
    return map[type ?? ''] ?? '🔔';
  };

  return (
    <>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(true)}
        style={{ ...S.bell, position: 'relative' }}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={S.badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div onClick={() => setOpen(false)} style={S.overlay} />
      )}

      {/* Panel */}
      {open && (
        <div style={S.panel}>
          <div style={S.header}>
            <span style={S.headerTitle}>Notifications</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={S.markAllBtn}>Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} style={S.closeBtn}>✕</button>
            </div>
          </div>

          {loading && (
            <div style={S.empty}>Loading…</div>
          )}

          {!loading && notifications.length === 0 && (
            <div style={S.empty}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>🔔</span>
              No notifications yet
            </div>
          )}

          <div style={S.list}>
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); if (n.deep_link) window.location.href = n.deep_link; }}
                style={{ ...S.item, background: n.read_at ? 'transparent' : 'rgba(200,166,92,.08)' }}
              >
                <span style={S.itemIcon}>{n.icon || eventIcon(n.event_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...S.itemTitle, fontWeight: n.read_at ? 400 : 700 }}>{n.title}</div>
                  {n.body && <div style={S.itemBody}>{n.body}</div>}
                  <div style={S.itemTime}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read_at && <span style={S.dot} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  bell: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'inherit', padding: 8, borderRadius: 8,
  },
  badge: {
    position: 'absolute', top: 2, right: 2,
    background: '#C8A65C', color: '#0D1F16',
    borderRadius: '50%', width: 16, height: 16,
    fontSize: '0.62rem', fontWeight: 800,
    display: 'grid', placeItems: 'center',
    lineHeight: 1,
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9990,
    background: 'rgba(0,0,0,.3)',
  },
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: 360, maxWidth: '100vw',
    background: '#fff', zIndex: 9991,
    boxShadow: '-4px 0 32px rgba(0,0,0,.18)',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'var(--font-inter, system-ui, sans-serif)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 16px 14px',
    borderBottom: '1px solid rgba(0,0,0,.08)',
    background: '#0D1F16',
  },
  headerTitle: { fontWeight: 700, fontSize: '1rem', color: '#C8A65C' },
  markAllBtn: {
    background: 'transparent', border: 'none', color: 'rgba(200,166,92,.7)',
    fontSize: '0.76rem', cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
  },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#888',
    fontSize: '1rem', cursor: 'pointer', padding: 4,
  },
  list: { flex: 1, overflowY: 'auto' },
  empty: {
    flex: 1, display: 'grid', placeItems: 'center',
    color: '#999', fontSize: '0.88rem', textAlign: 'center',
    padding: 40,
  },
  item: {
    display: 'flex', gap: 12, padding: '14px 16px',
    borderBottom: '1px solid rgba(0,0,0,.05)',
    cursor: 'pointer', transition: 'background .15s',
  },
  itemIcon: { fontSize: '1.3rem', flexShrink: 0, marginTop: 2 },
  itemTitle: { fontSize: '0.88rem', color: '#1a1a1a', lineHeight: 1.4, marginBottom: 2 },
  itemBody: { fontSize: '0.8rem', color: '#666', lineHeight: 1.5, marginBottom: 4 },
  itemTime: { fontSize: '0.72rem', color: '#aaa' },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#C8A65C', flexShrink: 0, marginTop: 6,
  },
};
