"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = () => createClient();

interface CcContact {
  name: string;
  whatsapp?: string;
  email?: string;
}

type Prefs = {
  weekly_digest: boolean;
  milestone_updates: boolean;
  message_notifications: boolean;
  appointment_reminders: boolean;
  whatsapp_updates: boolean;
  cc_contacts: CcContact[];
};

const LABELS: Record<keyof Omit<Prefs, "cc_contacts">, { title: string; desc: string }> = {
  weekly_digest:          { title: "Weekly progress digest",       desc: "A summary of your matter every week — progress, pending steps, and any deadlines." },
  milestone_updates:      { title: "Milestone updates (email)",    desc: "An email each time a step on your matter is completed." },
  whatsapp_updates:       { title: "Milestone updates (WhatsApp)", desc: "A WhatsApp message when a step is completed — requires a phone number on file." },
  message_notifications:  { title: "Message notifications",        desc: "An email when Ferguson Law sends you a new message in the portal." },
  appointment_reminders:  { title: "Appointment reminders",        desc: "Reminder emails 24 hours and 1 hour before your scheduled consultation." },
};

const S = {
  page: { minHeight: "100svh", background: "var(--paper-1, #f4f1ec)", padding: "40px 16px", fontFamily: "Georgia, 'Times New Roman', serif" } as React.CSSProperties,
  wrap: { maxWidth: 520, margin: "0 auto" } as React.CSSProperties,
  back: { fontSize: 13, color: "var(--muted, #9a9a9a)", textDecoration: "none", display: "inline-block", marginBottom: 24 } as React.CSSProperties,
  header: { background: "#10211c", borderRadius: 12, padding: "28px 32px", marginBottom: 24 } as React.CSSProperties,
  eyebrow: { fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#c9a86a", marginBottom: 4 },
  title: { fontSize: 20, color: "#fff", fontWeight: 600 },
  subtitle: { fontSize: 13, color: "#9fb3ab", marginTop: 6 },
  card: { background: "#fff", borderRadius: 12, border: "1px solid #e7e1d6", overflow: "hidden", marginBottom: 20 } as React.CSSProperties,
  row: (i: number) => ({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 24px", cursor: "pointer", borderTop: i > 0 ? "1px solid #f0ede6" : undefined } as React.CSSProperties),
  pill: (on: boolean) => ({ flexShrink: 0, width: 44, height: 26, borderRadius: 13, background: on ? "#c9a86a" : "#d4cfc8", position: "relative" as const, transition: "background 0.2s" }),
  dot: (on: boolean) => ({ position: "absolute" as const, top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }),
  saveBtn: (saving: boolean, saved: boolean) => ({ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: saved ? "#2d6a4f" : "#c9a86a", color: saved ? "#fff" : "#10211c", fontSize: 15, fontWeight: 700, cursor: saving ? "default" : "pointer", transition: "background 0.3s" } as React.CSSProperties),
};

export default function SettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newCC, setNewCC] = useState<CcContact>({ name: "", whatsapp: "", email: "" });
  const [addingCC, setAddingCC] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) { router.push("/directory/client-login"); return; }
      const res = await fetch("/api/client/notification-prefs");
      const json = await res.json();
      if (json.ok) setPrefs({ ...json.prefs, cc_contacts: json.prefs.cc_contacts ?? [] });
    })();
  }, [router]);

  async function save() {
    if (!prefs) return;
    setSaving(true); setSaved(false); setError("");
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

  function toggle(key: keyof Omit<Prefs, "cc_contacts">) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
    setSaved(false);
  }

  function addCC() {
    if (!prefs || !newCC.name || (!newCC.whatsapp && !newCC.email)) return;
    const contact: CcContact = { name: newCC.name };
    if (newCC.whatsapp) contact.whatsapp = newCC.whatsapp;
    if (newCC.email) contact.email = newCC.email;
    setPrefs({ ...prefs, cc_contacts: [...(prefs.cc_contacts ?? []), contact] });
    setNewCC({ name: "", whatsapp: "", email: "" });
    setAddingCC(false);
    setSaved(false);
  }

  function removeCC(i: number) {
    if (!prefs) return;
    const updated = prefs.cc_contacts.filter((_, idx) => idx !== i);
    setPrefs({ ...prefs, cc_contacts: updated });
    setSaved(false);
  }

  if (!prefs) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper-1, #f4f1ec)" }}>
        <p style={{ color: "var(--muted, #9a9a9a)", fontFamily: "Georgia, serif" }}>Loading...</p>
      </div>
    );
  }

  const toggleKeys = Object.keys(LABELS) as (keyof typeof LABELS)[];

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/directory/client" style={S.back}>&larr; Back to portal</Link>

        <div style={S.header}>
          <div style={S.eyebrow}>Ferguson Law</div>
          <div style={S.title}>Notification preferences</div>
          <div style={S.subtitle}>Choose how and who receives updates on your matter.</div>
        </div>

        {/* Toggle prefs */}
        <div style={S.card}>
          {toggleKeys.map((key, i) => (
            <div key={key} onClick={() => toggle(key)} style={S.row(i)}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#10211c", marginBottom: 3 }}>{LABELS[key].title}</div>
                <div style={{ fontSize: 13, color: "#6a6a6a", lineHeight: 1.5 }}>{LABELS[key].desc}</div>
              </div>
              <div style={S.pill(prefs[key] as boolean)}>
                <div style={S.dot(prefs[key] as boolean)} />
              </div>
            </div>
          ))}
        </div>

        {/* CC contacts */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e7e1d6", padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#10211c", marginBottom: 4 }}>Notify someone else</div>
          <div style={{ fontSize: 13, color: "#6a6a6a", lineHeight: 1.55, marginBottom: 16 }}>
            Add a realtor, agent, or family member. They will receive a message when a step on your matter is completed — by WhatsApp, email, or both.
          </div>

          {(prefs.cc_contacts ?? []).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {prefs.cc_contacts.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < prefs.cc_contacts.length - 1 ? "1px solid #f0ede6" : undefined }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#10211c" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#9a9a9a" }}>
                      {[c.whatsapp, c.email].filter(Boolean).join("  ·  ")}
                    </div>
                  </div>
                  <button
                    onClick={() => removeCC(i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#b00", fontSize: 13, padding: "4px 8px" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {addingCC ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(["name", "whatsapp", "email"] as const).map(field => (
                <input
                  key={field}
                  type={field === "email" ? "email" : "text"}
                  placeholder={field === "name" ? "Full name" : field === "whatsapp" ? "WhatsApp number (e.g. +18761234567)" : "Email address (optional)"}
                  value={newCC[field] ?? ""}
                  onChange={e => setNewCC(p => ({ ...p, [field]: e.target.value }))}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "inherit", outline: "none" }}
                />
              ))}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={addCC}
                  disabled={!newCC.name || (!newCC.whatsapp && !newCC.email)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#c9a86a", color: "#10211c", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  Add contact
                </button>
                <button
                  onClick={() => { setAddingCC(false); setNewCC({ name: "", whatsapp: "", email: "" }); }}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontSize: 14, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCC(true)}
              disabled={(prefs.cc_contacts ?? []).length >= 5}
              style={{ padding: "10px 18px", borderRadius: 8, border: "1.5px dashed #c9a86a", background: "none", color: "#8a6d1f", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              + Add a person
            </button>
          )}
        </div>

        <button onClick={save} disabled={saving} style={S.saveBtn(saving, saved)}>
          {saving ? "Saving..." : saved ? "Saved" : "Save preferences"}
        </button>

        {error && <p style={{ color: "#b00", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>}

        <p style={{ fontSize: 12, color: "#9a9a9a", textAlign: "center", marginTop: 20 }}>
          Turning off all emails will not affect your access to the portal. You can always log in to check your matter status directly.
        </p>

        <DangerZone />
      </div>
    </div>
  );
}

function DangerZone() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function exportData() {
    setExporting(true); setError("");
    try {
      const res = await fetch("/api/client/export-data");
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Export failed."); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ferguson-law-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (!confirm(
      "Permanently delete your Ferguson Law account and all data?\n\n" +
      "This removes your login, matter records, uploaded documents, KYC/ID information, messages, and appointment history. This cannot be undone. Consider exporting your data first."
    )) return;
    const typed = prompt('Type DELETE to confirm.');
    if (typed !== "DELETE") return;

    setDeleting(true); setError("");
    try {
      const res = await fetch("/api/client/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Deletion failed.");
      await supabase().auth.signOut();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed.");
      setDeleting(false);
    }
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f0d5d5", padding: "20px 24px", marginTop: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#b00", marginBottom: 4 }}>Danger zone</div>
      <div style={{ fontSize: 13, color: "#6a6a6a", lineHeight: 1.55, marginBottom: 16 }}>
        Download a copy of everything Ferguson Law has on file for you, or permanently delete your account and all associated data. Deletion is irreversible.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={exportData}
          disabled={exporting}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#10211c", fontSize: 14, fontWeight: 600, cursor: exporting ? "default" : "pointer" }}
        >
          {exporting ? "Preparing…" : "Export my data"}
        </button>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d33", background: "#fff", color: "#d33", fontSize: 14, fontWeight: 600, cursor: deleting ? "default" : "pointer" }}
        >
          {deleting ? "Deleting…" : "Delete my account & data"}
        </button>
      </div>
      {error && <p style={{ color: "#b00", fontSize: 13, marginTop: 12 }}>{error}</p>}
    </div>
  );
}
