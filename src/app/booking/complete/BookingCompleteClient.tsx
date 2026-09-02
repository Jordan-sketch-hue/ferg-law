"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const GREEN = "#102A1E";
const GOLD = "#C8A65C";

export default function BookingCompleteClient() {
  const [notifState, setNotifState] = useState<"prompt" | "granted" | "denied" | "hidden">("hidden");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const alreadyPrompted = localStorage.getItem("fl_notif_prompted") === "true";
      if (alreadyPrompted) { setReady(true); return; }
      if (typeof Notification === "undefined") { setReady(true); return; }
      if (Notification.permission === "granted") { setReady(true); return; }
      setNotifState("prompt");
    } catch { /* noop */ }
    setReady(true);
  }, []);

  function enableReminders() {
    Notification.requestPermission().then(perm => {
      setNotifState(perm === "granted" ? "granted" : "denied");
      try { localStorage.setItem("fl_notif_prompted", "true"); } catch { /* noop */ }
    });
  }

  function dismissNotif() {
    setNotifState("hidden");
    try { localStorage.setItem("fl_notif_prompted", "true"); } catch { /* noop */ }
  }

  if (!ready) return null;

  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Notification card */}
      {notifState === "prompt" && (
        <div style={{ background: "rgba(16,42,30,.05)", border: "1px solid rgba(16,42,30,.14)", borderRadius: 12, padding: "14px 16px", textAlign: "left" }}>
          <p style={{ fontWeight: 700, fontSize: ".88rem", color: GREEN, margin: "0 0 4px" }}>
            Want reminders for your consultation?
          </p>
          <p style={{ fontSize: ".82rem", color: "#5c645e", margin: "0 0 12px", lineHeight: 1.5 }}>
            Get notified 24 hours and 1 hour before your appointment.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={enableReminders}
              style={{ flex: 1, background: GOLD, color: GREEN, border: "none", borderRadius: 8, padding: "9px 12px", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}
            >
              Enable reminders
            </button>
            <button
              onClick={dismissNotif}
              style={{ flex: 1, background: "transparent", color: "#69736d", border: "1px solid rgba(18,16,12,.18)", borderRadius: 8, padding: "9px 12px", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Account creation card */}
      <div style={{ background: "rgba(16,42,30,.04)", border: "1px solid rgba(16,42,30,.12)", borderRadius: 12, padding: "14px 16px", textAlign: "left" }}>
        <p style={{ fontWeight: 700, fontSize: ".88rem", color: GREEN, margin: "0 0 4px" }}>
          Track your matter online
        </p>
        <p style={{ fontSize: ".82rem", color: "#5c645e", margin: "0 0 12px", lineHeight: 1.5 }}>
          Track your matter, view documents, message our team. Create your free portal account — takes 30 seconds.
        </p>
        <Link
          href="/auth?mode=signup&from=booking"
          style={{ display: "block", background: GREEN, color: "#fbf8f1", borderRadius: 8, padding: "10px 14px", fontWeight: 700, fontSize: ".85rem", textDecoration: "none", textAlign: "center" }}
        >
          Create account →
        </Link>
      </div>
    </div>
  );
}
