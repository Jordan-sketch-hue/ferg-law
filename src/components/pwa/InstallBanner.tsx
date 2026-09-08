'use client';

import { useEffect, useState } from 'react';

type Platform = 'ios' | 'android' | 'desktop-chrome' | 'desktop-other' | 'installed';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge|opr\//i.test(ua);
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true;

  if (standalone) return 'installed';
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  if (isChrome) return 'desktop-chrome';
  return 'desktop-other';
}

const DISMISSED_KEY = 'fl-install-dismissed-v2';

interface Props {
  siteName?: string;
  themeColor?: string;
  goldColor?: string;
}

export default function InstallBanner({
  siteName = 'Ferguson Law',
  themeColor = '#0D1F16',
  goldColor = '#C8A65C',
}: Props) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<'banner' | 'ios-guide' | 'desktop-guide'>('banner');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    const p = detectPlatform();
    setPlatform(p);
    if (p === 'installed') return;

    // Capture Android/Chrome install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show after 2s delay (not immediate — feels less pushy)
    const t = setTimeout(() => setVisible(true), 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const install = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setInstalling(false);
      if (result.outcome === 'accepted') dismiss();
    } else if (platform === 'ios') {
      setStep('ios-guide');
    } else {
      setStep('desktop-guide');
    }
  };

  if (!visible || !platform || platform === 'installed') return null;

  const canDirectInstall = !!deferredPrompt;

  return (
    <>
      {/* Backdrop for guide steps */}
      {(step === 'ios-guide' || step === 'desktop-guide') && (
        <div
          onClick={() => setStep('banner')}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9997 }}
        />
      )}

      {/* iOS step-by-step guide */}
      {step === 'ios-guide' && (
        <div style={{ ...S.guide, zIndex: 9998 }}>
          <div style={S.guideHeader}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: themeColor }}>Add to Home Screen</span>
            <button onClick={dismiss} style={S.closeBtn}>✕</button>
          </div>
          <div style={S.steps}>
            {[
              { n: '1', icon: '⬆', text: 'Tap the Share button at the bottom of Safari' },
              { n: '2', icon: '➕', text: 'Scroll down and tap "Add to Home Screen"' },
              { n: '3', icon: '✓', text: `Tap "Add" — ${siteName} appears on your home screen` },
            ].map(({ n, icon, text }) => (
              <div key={n} style={S.step}>
                <div style={{ ...S.stepNum, background: themeColor }}>{n}</div>
                <span style={S.stepIcon}>{icon}</span>
                <span style={S.stepText}>{text}</span>
              </div>
            ))}
          </div>
          <div style={S.safariHint}>Open in <strong>Safari</strong> for the best experience</div>
        </div>
      )}

      {/* Desktop guide */}
      {step === 'desktop-guide' && (
        <div style={{ ...S.guide, maxWidth: 340, zIndex: 9998 }}>
          <div style={S.guideHeader}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: themeColor }}>Install {siteName}</span>
            <button onClick={dismiss} style={S.closeBtn}>✕</button>
          </div>
          <div style={S.steps}>
            <div style={S.step}>
              <div style={{ ...S.stepNum, background: themeColor }}>1</div>
              <span style={S.stepText}>Look for the install icon (⊕) in your browser&apos;s address bar</span>
            </div>
            <div style={S.step}>
              <div style={{ ...S.stepNum, background: themeColor }}>2</div>
              <span style={S.stepText}>Click it and select &quot;Install&quot; — works in Chrome, Edge, and Brave</span>
            </div>
          </div>
        </div>
      )}

      {/* Main banner */}
      {step === 'banner' && (
        <div style={S.banner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div style={{ ...S.appIcon, background: themeColor }}>
              <span style={{ fontSize: '1.2rem' }}>⚖</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1a1a1a' }}>
                Install {siteName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>
                {platform === 'ios'
                  ? 'Add to Home Screen for the full app experience'
                  : canDirectInstall
                    ? 'Install for faster access — works offline too'
                    : 'Access consultations, documents & more from your home screen'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={dismiss} style={S.dismissBtn}>Not now</button>
            <button
              onClick={install}
              disabled={installing}
              style={{ ...S.installBtn, background: themeColor, color: goldColor }}
            >
              {installing ? '…' : canDirectInstall ? 'Install' : platform === 'ios' ? 'How to' : 'How to'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9996,
    background: '#fff',
    borderTop: '1px solid rgba(0,0,0,.1)',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    boxShadow: '0 -4px 24px rgba(0,0,0,.12)',
    fontFamily: 'var(--font-inter, system-ui, sans-serif)',
    backdropFilter: 'blur(12px)',
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  dismissBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 8,
  },
  installBtn: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  guide: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '24px 20px 32px',
    boxShadow: '0 -8px 40px rgba(0,0,0,.2)',
    fontFamily: 'var(--font-inter, system-ui, sans-serif)',
    maxWidth: 480,
    margin: '0 auto',
  },
  guideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#888',
    padding: 4,
  },
  steps: { display: 'flex', flexDirection: 'column', gap: 14 },
  step: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    color: '#fff',
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2,
  },
  stepIcon: { fontSize: '1.2rem', flexShrink: 0 },
  stepText: { fontSize: '0.88rem', color: '#444', lineHeight: 1.5 },
  safariHint: {
    marginTop: 20,
    padding: '10px 14px',
    background: '#f5f5f5',
    borderRadius: 10,
    fontSize: '0.82rem',
    color: '#555',
    textAlign: 'center',
  },
};
