'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const VISIT_KEY = 'fl-pwa-visits';
const LAST_SHOWN_KEY = 'fl-pwa-last-shown';
const DISMISSED_KEY = 'fl-install-dismissed';
// Show on visit 1, then every 4 visits after
const SHOW_INTERVAL = 4;

function shouldShow(): boolean {
  try {
    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return false;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === 'permanent') return false;
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    const lastShown = parseInt(localStorage.getItem(LAST_SHOWN_KEY) || '0', 10);
    if (visits === 1 || visits - lastShown >= SHOW_INTERVAL) {
      localStorage.setItem(LAST_SHOWN_KEY, String(visits));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // Only on mobile
    if (window.innerWidth > 768) return;
    const isIos = isIOS();
    setIos(isIos);

    if (isIos) {
      // iOS: no beforeinstallprompt — show manual instructions
      if (shouldShow()) setTimeout(() => setShow(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (shouldShow()) setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') {
      try { localStorage.setItem(DISMISSED_KEY, 'session'); } catch { /* */ }
    } else {
      try { localStorage.setItem(DISMISSED_KEY, 'permanent'); } catch { /* */ }
    }
    setDeferredPrompt(null);
    setShow(false);
  }

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, 'session'); } catch { /* */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={S.wrap} role="dialog" aria-modal="true" aria-label="Install Ferguson Law app">
      <div style={S.bar}>
        <div style={S.icon}>⚖️</div>
        <div style={S.text}>
          <strong style={{ color: '#EDE8DF', fontSize: '.9rem' }}>
            {ios ? 'Install App — Free' : 'Install the Ferguson Law App'}
          </strong>
          <span style={{ color: '#9A8F7A', fontSize: '.78rem', display: 'block', marginTop: 2 }}>
            {ios
              ? 'Tap the share icon ↗ below, then "Add to Home Screen" for one-tap access to consultations & legal services.'
              : 'One-tap access to book consultations & legal services — free, no download needed.'}
          </span>
        </div>
        {!ios && (
          <button style={S.btn} onClick={install}>Install</button>
        )}
        <button style={S.close} onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9990,
    padding: '0 0 env(safe-area-inset-bottom)',
  },
  bar: {
    background: '#0D1F16', borderTop: '1px solid #1E3828',
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
    boxShadow: '0 -4px 24px rgba(0,0,0,.4)',
  },
  icon: { fontSize: '1.6rem', flexShrink: 0 },
  text: { flex: 1, minWidth: 0 },
  btn: {
    background: '#C9A84C', color: '#0D1F16', border: 'none',
    borderRadius: 8, padding: '8px 16px', fontWeight: 700,
    fontSize: '.85rem', cursor: 'pointer', flexShrink: 0,
  },
  close: {
    background: 'transparent', border: 'none', color: '#7A9080',
    fontSize: '.9rem', cursor: 'pointer', padding: '4px 6px', flexShrink: 0,
  },
};
