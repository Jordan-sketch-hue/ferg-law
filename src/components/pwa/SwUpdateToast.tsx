'use client';

import { useEffect, useState } from 'react';

export default function SwUpdateToast() {
  const [show, setShow] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') setShow(true);
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check if there's already a waiting SW (page refreshed after update)
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setWaiting(reg.waiting);
        setTimeout(() => setShow(true), 0);
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(newWorker);
            setShow(true);
          }
        });
      });
    });

    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  const reload = () => {
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      waiting.addEventListener('statechange', () => {
        if (waiting.state === 'activated') window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#0D1F16', color: '#fff',
      borderRadius: 14, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
      fontSize: '0.9rem', maxWidth: 360, width: 'calc(100vw - 40px)',
    }}>
      <span style={{ flex: 1 }}>New version available — reload for the latest.</span>
      <button
        onClick={reload}
        style={{
          background: '#C8A65C', color: '#0D1F16', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontWeight: 700,
          fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Reload
      </button>
    </div>
  );
}
