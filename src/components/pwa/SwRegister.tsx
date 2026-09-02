'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SwRegister() {
  const router = useRouter();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((r) => {
      reg = r;
      r.addEventListener('updatefound', () => {
        const newWorker = r.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // SwUpdateToast handles the UI; nothing to dispatch here
          }
        });
      });
    }).catch((err) => console.warn('[SW] Registration failed:', err));

    // Auto-refresh when user returns to the PWA after being away
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !reg) return;
      reg.update().catch(() => null);
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    // Listen for PUSH_NAV messages from SW notification clicks
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NAV' && event.data.url) {
        router.push(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router]);

  return null;
}
