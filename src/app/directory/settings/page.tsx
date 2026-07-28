"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = () => createClient();

type Prefs = {
  weekly_digest: boolean;
  milestone_updates: boolean;
  message_notifications: boolean;
  appointment_reminders: boolean;
};

const LABELS: Record<keyof Prefs, { title: string; desc: string }> = {
  weekly_digest:          { title: "Weekly progress digest",       desc: "A summary of your matter every week — progress, pending steps, and any deadlines." },
  milestone_updates:      { title: "Milestone updates",            desc: "An email each time a step on your matter is completed." },
  message_notifications:  { title: "Message notifications",        desc: "An email when Ferguson Law sends you a new message in the portal." },
  appointment_reminders:  { title: "Appointment reminders",        desc: "Reminder emails 24 hours and 1 hour before your scheduled consultation." },
};

export default function SettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) { router.push("/directory/client-login"); return; }
      const res = await fetch("/api/client/notification-prefs");
      const json = await res.json();
      if (json.ok) setPrefs(json.prefs);
    })();
  }, [router]);

  async function save() {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/client/notification-prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    const json = await res.json();
    setSaving(false);
    if (json.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError(json.error || "Failed to save.");
  }

  function toggle(key: keyof Prefs) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
    setSaved(false);
  }

  if (!prefs) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper-1, #f4f1ec)" }}>
        <p style={{ color: "var(--muted, #9a9a9a)", fontFamily: "Georgia, serif" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100svh", background: "var(--paper-1, #f4f1ec)", padding: "40px 16px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        <Link href="/directory/client" style={{ fontSize: 13, color: "var(--muted, #9a9a9a)", textDecoration: "none", display: "inline-block", marginBottom: 24 }}>
          &larr; Back to portal
        </Link>

        <div style={{ background: "#10211c", borderRadius: 12, padding: "28px 32px", marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#c9a86a", marginBottom: 4 }}>Ferguson Law</div>
          <div style={{ fontSize: 20, color: "#fff", fontWeight: 600 }}>Email preferences</div>
          <div style={{ fontSize: 13, color: "#9fb3ab", marginTop: 6 }}>Choose which emails you receive from us.</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e7e1d6", overflow: "hidden", marginBottom: 20 }}>
          {(Object.keys(LABELS) as (keyof Prefs)[]).map((key, i) => (
            <div
              key={key}
              onClick={() => toggle(key)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 16, padding: "18px 24px", cursor: "pointer",
                borderTop: i > 0 ? "1px solid #f0ede6" : undefined,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#10211c", marginBottom: 3 }}>{LABELS[key].title}</div>
                <div style={{ fontSize: 13, color: "#6a6a6a", lineHeight: 1.5 }}>{LABELS[key].desc}</div>
              </div>
              {/* Toggle pill */}
              <div style={{
                flexShrink: 0, width: 44, height: 26, borderRadius: 13,
                background: prefs[key] ? "#c9a86a" : "#d4cfc8",
                position: "relative", transition: "background 0.2s",
              }}>
                <div style={{
                  position: "absolute", top: 3, left: prefs[key] ? 21 : 3,
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{
            width: "100%", padding: "14px", borderRadius: 10, border: "none",
            background: saved ? "#2d6a4f" : "#c9a86a", color: saved ? "#fff" : "#10211c",
            fontSize: 15, fontWeight: 700, cursor: saving ? "default" : "pointer",
            transition: "background 0.3s",
          }}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save preferences"}
        </button>

        {error && <p style={{ color: "#b00", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>}

        <p style={{ fontSize: 12, color: "#9a9a9a", textAlign: "center", marginTop: 20 }}>
          Turning off all emails will not affect your access to the portal. You can always log in to check your matter status directly.
        </p>
      </div>
    </div>
  );
}
