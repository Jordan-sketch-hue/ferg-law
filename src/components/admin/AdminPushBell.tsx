"use client";

/**
 * AdminPushBell — standalone push notification toggle for the admin topbar.
 *
 * States:
 *   loading     → checking browser subscription on mount, renders nothing
 *   unsupported → Notification API absent (iOS Safari not installed as PWA)
 *   denied      → OS/browser has blocked notifications
 *   off         → no active subscription → bell dim → tap to subscribe
 *   on          → subscription live in DB → bell gold → tap to unsubscribe
 *
 * ON tap:  requestPermission → pushManager.subscribe → sub.toJSON() →
 *          POST /api/push/subscribe → server fires "Notifications are on" push
 * OFF tap: pushManager.unsubscribe → POST /api/admin/push-unsubscribe
 *
 * Foundation: /api/push/subscribe, /api/admin/push-unsubscribe, public/sw.js
 */

import { useCallback, useEffect, useState } from "react";

const GOLD = "#C8A65C";
const CREAM = "#F6F2EA";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function b64ToUint8(b64: string): Uint8Array {
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array([...atob(base64)].map((c) => c.charCodeAt(0)));
}

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

interface Props {
  token: string;
}

export default function AdminPushBell({ token }: Props) {
  const [status, setStatus] = useState<Status>("loading");

  // On mount: detect current subscription state without side effects
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("denied"); return; }

    void navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    }).catch(() => setStatus("off"));
  }, []);

  const toggle = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!VAPID_PUBLIC) { console.error("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set"); return; }

    const reg = await navigator.serviceWorker.ready;

    // --- TURN OFF ---
    if (status === "on") {
      try {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await fetch("/api/admin/push-unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, endpoint: existing.endpoint }),
          });
          await existing.unsubscribe();
        }
      } catch (e) { console.error("[push off]", e); }
      setStatus("off");
      return;
    }

    // --- TURN ON ---
    if (status !== "off") return;

    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm === "denied") { setStatus("denied"); return; }
    if (perm !== "granted") return;

    try {
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToUint8(VAPID_PUBLIC) as unknown as ArrayBuffer,
      });

      // .toJSON() required — raw PushSubscription doesn't serialize keys
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userRole: "admin", userRef: token }),
      });

      if (res.ok) setStatus("on");
      else console.error("[push on] subscribe endpoint returned", res.status);
    } catch (e) { console.error("[push on]", e); }
  }, [token, status]);

  if (status === "loading") return null;

  const on = status === "on";
  const blocked = status === "denied" || status === "unsupported";

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={blocked}
      title={
        status === "unsupported" ? "Add to home screen to enable push"
        : status === "denied" ? "Notifications blocked — allow in device Settings"
        : on ? "Notifications ON — tap to turn off"
        : "Notifications OFF — tap to turn on"
      }
      style={{
        padding: "5px 9px",
        borderRadius: 6,
        border: on
          ? `1.5px solid ${GOLD}`
          : `1px solid rgba(246,242,234,${blocked ? ".12" : ".28"})`,
        background: on ? `rgba(200,166,92,.15)` : "transparent",
        color: on ? GOLD : blocked ? `rgba(246,242,234,.3)` : CREAM,
        fontSize: 17,
        lineHeight: 1,
        cursor: blocked ? "default" : "pointer",
      }}
    >
      {blocked ? "🔕" : on ? "🔔" : "🔔"}
    </button>
  );
}
