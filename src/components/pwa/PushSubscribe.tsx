'use client';

import { useState } from 'react';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

type State = 'idle' | 'loading' | 'done' | 'denied' | 'error' | 'unsupported';

interface Props {
  userRole: string;
  userRef: string;
  promptText?: string;
  onDone?: () => void;
}

export default function PushSubscribe({ userRole, userRef, promptText, onDone }: Props) {
  const [state, setState] = useState<State>('idle');

  const subscribe = async () => {
    if (!VAPID_PUBLIC) { setState('unsupported'); return; }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }

    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as ArrayBuffer,
      });

      // Browser subscription created — now save to server
      try {
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, userRole, userRef }),
        });
        if (!res.ok) throw new Error('Server error');
        setState('done');
        onDone?.();
      } catch {
        // Sub created in browser but not saved — show retry
        setState('error');
      }
    } catch {
      setState('denied');
    }
  };

  const retry = () => { setState('idle'); subscribe(); };

  if (state === 'done') {
    return (
      <div style={S.card}>
        <span style={S.icon}>🔔</span>
        <span style={S.text}>You&apos;re set — we&apos;ll notify you with updates.</span>
      </div>
    );
  }

  if (state === 'denied') return null;
  if (state === 'unsupported') return null;

  if (state === 'error') {
    return (
      <div style={S.card}>
        <span style={S.text}>Couldn&apos;t save your notification preference.</span>
        <button onClick={retry} style={S.btn}>Try again</button>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <span style={S.icon}>🔔</span>
      <span style={S.text}>
        {promptText || 'Get notified about updates to your matter.'}
      </span>
      <button onClick={subscribe} disabled={state === 'loading'} style={S.btn}>
        {state === 'loading' ? 'Setting up…' : 'Enable notifications'}
      </button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(16,42,30,.06)',
    border: '1px solid rgba(16,42,30,.12)',
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  icon: { fontSize: '1.2rem' },
  text: { flex: 1, fontSize: '0.88rem', color: '#3d4f43', lineHeight: 1.5 },
  btn: {
    background: '#0D1F16',
    color: '#C8A65C',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
};
