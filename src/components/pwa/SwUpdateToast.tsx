'use client';

import { useEffect, useState } from 'react';

export default function SwUpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    // SwRegister dispatches this when controllerchange fires while user is in a form.
    const onCustom = () => setShow(true);
    window.addEventListener('fl:sw-updated', onCustom);

    return () => window.removeEventListener('fl:sw-updated', onCustom);
  }, []);

  const reload = () => {
    setShow(false);
    setTimeout(() => window.location.reload(), 100);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom) + 12px)', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#0D1F16', color: '#fff',
      borderRadius: 14, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      fontFamily: 'var(--font-inter, system-ui, sans-serif)',
      fontSize: '0.9rem', maxWidth: 360, width: 'calc(100vw - 40px)',
    }}>
      <span style={{ flex: 1 }}>New version available — reload to apply.</span>
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
      <button
        onClick={() => setShow(false)}
        style={{
          background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none',
          padding: '4px 6px', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        x
      </button>
    </div>
  );
}