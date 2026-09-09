'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const STORAGE_KEY = 'fl_push_prompted';

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushPromptGlobal() {
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !VAPID_PUBLIC) return;

    const supabase = createClient();

    const tryShow = (id: string) => {
      if (Notification.permission !== 'default') return; // already granted or denied
      try { if (localStorage.getItem(STORAGE_KEY)) return; } catch { return; }
      setUserId(id);
      // Small delay so the page finishes loading first
      setTimeout(() => setShow(true), 1800);
    };

    // Check current session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) tryShow(data.session.user.id);
    });

    // Fire when auth state changes (sign-in event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) tryShow(session.user.id);
      if (event === 'SIGNED_OUT') { setShow(false); setUserId(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const enable = async () => {
    if (!userId) return;
    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); markDone(); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as ArrayBuffer,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, userRole: 'client', userRef: userId }),
      });
      setState('done');
      setTimeout(() => { setShow(false); }, 2000);
    } catch {
      setState('denied');
    }
    markDone();
  };

  const dismiss = () => { markDone(); setShow(false); };

  const markDone = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom))',
      left: 16, right: 16, zIndex: 9998,
      background: '#0D1F16', color: '#fff',
      borderRadius: 16, padding: '18px 18px 16px',
      boxShadow: '0 8px 40px rgba(0,0,0,.5)',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
      border: '1px solid rgba(200,166,92,0.25)',
    }}>
      {state === 'done' ? (
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#C8A65C', fontWeight: 600 }}>
          Notifications on — we&apos;ll keep you updated.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.95rem' }}>
                Stay updated on your matter
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                Get notified when your documents are ready, appointments confirmed, and next steps arrive.
              </p>
            </div>
            <button
              onClick={dismiss}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1, padding: '0 0 0 4px' }}
              aria-label="Dismiss"
            >×</button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={dismiss} style={{
              flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '10px 0',
              fontSize: '0.85rem', cursor: 'pointer',
            }}>
              Not now
            </button>
            <button onClick={enable} disabled={state === 'loading'} style={{
              flex: 2, background: '#C8A65C', color: '#0D1F16', border: 'none',
              borderRadius: 10, padding: '10px 0', fontWeight: 700,
              fontSize: '0.85rem', cursor: 'pointer',
            }}>
              {state === 'loading' ? 'Setting up…' : 'Enable notifications'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
