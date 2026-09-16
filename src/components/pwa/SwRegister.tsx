'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SwRegister() {
  const router = useRouter();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Auto-reload when a new SW takes control.
    // Only set up if already controlled -- first-install controllerchange must not reload.
    if (navigator.serviceWorker.controller) {
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        // If user is actively typing in a form, show the toast instead of hard-reloading.
        const el = document.activeElement;
        const inForm = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
        if (inForm) {
          window.dispatchEvent(new CustomEvent('fl:sw-updated'));
        } else {
          window.location.reload();
        }
      });
    }

    let reg: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((r) => {
      reg = r;
    }).catch((err) => console.warn('[SW] Registration failed:', err));

    // On tab focus / visibility restore: poll for a newer SW and activate it.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !reg) return;
      reg.update().catch(() => null);
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    };
    document.addEventListener('visibilitychange', onVisible);

    // Navigate after push notification tap.
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