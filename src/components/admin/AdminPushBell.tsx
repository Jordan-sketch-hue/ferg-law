"use client";

/**
 * AdminPushBell — one-click push subscription toggle for the admin topbar.
 *
 * OFF (default): shows a muted bell. Clicking requests permission, subscribes
 *   the device via /api/push/subscribe, and fires a confirmation push.
 * ON: shows a filled bell. Clicking unsubscribes via DELETE /api/push/subscribe.
 *
 * State is derived from the ServiceWorker registration only — no localStorage,
 * no polling. The component stays invisible until the SW is ready.
 */

import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

interface Props {
  token: string;
}

export default function AdminPushBell({ token }: Props) {
  const [ready, setReady] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      setReady(true);
    }).catch(() => null);
  }, []);

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setBusy(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC.replace(/=+$/, "")),
      });

      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth, token }),
      });

      if (res.ok) {
        setSubscribed(true);
        setError(false);
      } else {
        await sub.unsubscribe();
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint, token }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      // silently ignore
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <button
      type="button"
      title={subscribed ? "Notifications ON — click to turn off" : "Turn on push notifications"}
      onClick={subscribed ? turnOff : turnOn}
      disabled={busy}
      style={{
        background: "none",
        border: "none",
        cursor: busy ? "default" : "pointer",
        padding: "4px 6px",
        fontSize: 18,
        opacity: busy ? 0.5 : 1,
        lineHeight: 1,
        color: error ? "#e53e3e" : subscribed ? "#C8A65C" : "rgba(255,255,255,0.5)",
        transition: "color 0.2s",
      }}
      aria-label={subscribed ? "Notifications on" : error ? "Notification setup failed" : "Notifications off"}
    >
      {error ? "⚠️" : subscribed ? "🔔" : "🔕"}
    </button>
  );
}
