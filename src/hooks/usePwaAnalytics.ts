'use client';

import { useEffect } from 'react';

function getDisplayMode(): string {
  if (typeof window === 'undefined') return 'browser';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  if ((window.navigator as { standalone?: boolean }).standalone) return 'standalone';
  return 'browser';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return 'edge';
  if (/opr\//i.test(ua)) return 'opera';
  if (/chrome/i.test(ua)) return 'chrome';
  if (/safari/i.test(ua)) return 'safari';
  if (/firefox/i.test(ua)) return 'firefox';
  return 'other';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows/i.test(ua)) return 'windows';
  if (/mac/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  return 'other';
}

function getSessionId(): string {
  let id = sessionStorage.getItem('fl-session-id');
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('fl-session-id', id);
  }
  return id;
}

export function usePwaAnalytics(options?: { userRef?: string; userRole?: string; site?: string }) {
  useEffect(() => {
    const payload = {
      sessionId: getSessionId(),
      site: options?.site || 'ferguson-law',
      displayMode: getDisplayMode(),
      platform: navigator.platform || 'unknown',
      browser: getBrowser(),
      os: getOS(),
      installedPwa: getDisplayMode() === 'standalone',
      notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
      pushEnabled: false,
      userRef: options?.userRef ?? null,
      userRole: options?.userRole ?? null,
    };

    // Check push subscription status
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          fetch('/api/pwa/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, pushEnabled: !!sub }),
          }).catch(() => {});
        });
      }).catch(() => {
        fetch('/api/pwa/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      });
    } else {
      fetch('/api/pwa/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    // Track offline events
    const onOffline = () => {
      fetch('/api/pwa/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, offlineEventCount: 1 }),
      }).catch(() => {});
    };
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [options?.userRef, options?.userRole, options?.site]);
}
