"use client";

/**
 * Appointment Attention System — booking-detail panel.
 *
 * Shows the computed attention status, the reminder delivery history (from
 * fl_appointment_reminder_log — the "did the system actually do its job"
 * audit trail), and the quick actions a professional needs to resolve an
 * appointment: join the call, send/resend the meeting link, reschedule,
 * cancel, or record the outcome (completed / no-show).
 */

import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import {
  computeAttentionStatus,
  formatCountdown,
  ATTENTION_LABEL,
} from "@/lib/attention/status";
import { AttentionBadge, type AttentionAppt } from "@/components/admin/AttentionOverview";

const GREEN = "#102A1E";
const GOLD = "#C8A65C";
const MUTED = "#69736d";
const TZ = "America/Jamaica";

interface ReminderLogRow {
  id: string;
  reminder_type: string;
  channel: string;
  destination: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const REMINDER_TYPE_LABEL: Record<string, string> = {
  confirmation: "Booking confirmation",
  "24h": "24-hour reminder",
  "2h": "2-hour reminder",
  "1h": "1-hour reminder",
  "15m": "15-minute reminder",
  attendance_check: "Attendance alert",
  rescheduled: "Reschedule notice",
  cancelled: "Cancellation notice",
  link_updated: "Meeting link update",
};

const MATTER_LABELS: Record<string, string> = {
  property_purchase: "Property Purchase",
  diaspora: "Diaspora Transaction",
  transfer: "Transfer / Transmission",
  power_of_attorney: "Power of Attorney (General)",
  power_of_attorney_limited: "Power of Attorney (Limited)",
  lost_title: "Lost / Destroyed Title",
  first_registration: "First Registration",
  adverse_possession: "Adverse Possession",
  subdivision: "Subdivision",
  estate_will: "Estate / Will",
  general: "General",
};

interface Props {
  appt: AttentionAppt & { email?: string | null; phone?: string | null };
  token: string;
  onClose: () => void;
  onStatus: (id: string, status: string) => void;
  onRefresh: () => void;
}

export default function AppointmentAttentionPanel({ appt, token, onClose, onStatus, onRefresh }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const [log, setLog] = useState<ReminderLogRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("10:00");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [clientCreated, setClientCreated] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [matterType, setMatterType] = useState<string>("");
  const [matterCreated, setMatterCreated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .rpc("fl_admin_reminder_log", { p_token: token, p_appointment_id: appt.id })
      .then(({ data }) => { if (!cancelled) setLog((data as ReminderLogRow[] | null) ?? []); });
    return () => { cancelled = true; };
  }, [appt.id, token]);

  const status = computeAttentionStatus(appt, now);
  const url = appt.meta?.meeting_url ?? appt.meta?.zoom_url ?? null;

  async function sendMeetingLink() {
    setBusy("link"); setFeedback(null);
    try {
      const r = await fetch("/api/admin/zoom/recreate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: appt.id }),
      });
      const d = await r.json() as { ok: boolean; error?: string };
      setFeedback(d.ok ? "Meeting link sent." : (d.error ?? "Failed to send link."));
      if (d.ok) onRefresh();
    } catch { setFeedback("Network error."); }
    setBusy(null);
  }

  async function cancelBooking() {
    if (!confirm("Cancel this booking? The client will be emailed.")) return;
    setBusy("cancel"); setFeedback(null);
    try {
      const r = await fetch("/api/admin/zoom/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: appt.id }),
      });
      const d = await r.json() as { ok: boolean; error?: string };
      if (d.ok) { onRefresh(); onClose(); } else { setFeedback(d.error ?? "Failed to cancel."); }
    } catch { setFeedback("Network error."); }
    setBusy(null);
  }

  async function submitReschedule() {
    if (!rDate) { setFeedback("Pick a date."); return; }
    setBusy("reschedule"); setFeedback(null);
    try {
      const r = await fetch("/api/admin/zoom/reschedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: appt.id, starts_at_wall: `${rDate}T${rTime}` }),
      });
      const d = await r.json() as { ok: boolean; error?: string };
      if (d.ok) { onRefresh(); onClose(); } else { setFeedback(d.error ?? "Failed to reschedule."); }
    } catch { setFeedback("Network error."); }
    setBusy(null);
  }

  function markOutcome(outcome: "completed" | "no_show") {
    onStatus(appt.id, outcome);
    // After marking completed, show the post-consultation panel instead of closing
    if (outcome === "completed") {
      setShowFollowUp(true);
    } else {
      onClose();
    }
  }

  async function sendFollowUp() {
    setBusy("followup"); setFeedback(null);
    try {
      const r = await fetch("/api/admin/send-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ id: appt.id, notes: followUpNotes || undefined }),
      });
      const d = await r.json() as { ok?: boolean; skipped?: boolean; error?: string };
      setFeedback(d.ok ? "Follow-up email sent." : d.skipped ? "Email not configured (skipped)." : (d.error ?? "Failed."));
    } catch { setFeedback("Network error."); }
    setBusy(null);
  }

  async function createClientFromAppt(silent = false): Promise<string | null> {
    if (clientCreated) return createdClientId;
    if (!silent) { setBusy("client"); setFeedback(null); }
    try {
      const r = await createClient().rpc("fl_admin_upsert_client", {
        p_token: token,
        p_name: appt.name || "",
        p_email: appt.email ?? null,
        p_phone: appt.phone ?? null,
        p_type: "individual",
        p_country: null,
        p_notes: `Created from appointment ${appt.ref} — ${appt.service || "Consultation"}`,
      });
      if (r.error) { if (!silent) { setFeedback(r.error.message || "Could not create client."); setBusy(null); } return null; }
      const cid = typeof r.data === "string" ? r.data : null;
      setClientCreated(true); setCreatedClientId(cid);
      if (!silent) { setFeedback("Client record created."); setBusy(null); }
      return cid;
    } catch { if (!silent) { setFeedback("Network error."); setBusy(null); } return null; }
  }

  async function createMatterFromAppt() {
    if (matterCreated || !matterType) { if (!matterType) setFeedback("Select a matter type first."); return; }
    setBusy("matter"); setFeedback(null);
    try {
      const cid = createdClientId ?? (await createClientFromAppt(true));
      if (!cid) { setFeedback("Could not resolve client ID."); setBusy(null); return; }
      const r = await createClient().rpc("fl_open_matter", {
        p_client_id: cid,
        p_workflow_type: matterType,
        p_title: `${appt.name || "Client"} — ${MATTER_LABELS[matterType] ?? matterType}`,
      });
      if (r.error) { setFeedback(r.error.message || "Could not create matter."); }
      else { setMatterCreated(true); setFeedback("Matter opened successfully."); }
    } catch { setFeedback("Network error."); }
    setBusy(null);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.5)", display: "grid", placeItems: "center", padding: 16, zIndex: 1300 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: "1.15rem", color: GREEN }}>{appt.name || "—"}</div>
            <div style={{ fontSize: ".82rem", color: MUTED, marginTop: 2 }}>{appt.service || "—"} · {formatInTimeZone(new Date(appt.starts_at), TZ, "EEEE, d MMMM · h:mm a")} (Jamaica)</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0 18px" }}>
          <AttentionBadge status={status} />
          <span style={{ fontSize: ".78rem", color: "#8a6a22", fontWeight: 600 }}>{formatCountdown(appt.starts_at, now)}</span>
          {appt.ref && <span style={{ fontSize: ".76rem", color: MUTED, fontFamily: "monospace" }}>· {appt.ref}</span>}
        </div>

        {/* Attention checklist */}
        <div style={{ background: "#f8f6f1", border: "1px solid rgba(18,16,12,.08)", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: ".7rem", textTransform: "uppercase", letterSpacing: ".07em", color: MUTED, marginBottom: 10 }}>Reminder history</div>
          {log === null ? (
            <div style={{ fontSize: ".82rem", color: MUTED }}>Loading…</div>
          ) : log.length === 0 ? (
            <div style={{ fontSize: ".82rem", color: MUTED }}>No reminders logged yet for this booking.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {log.map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}>
                  <span>
                    <span style={{ color: l.status === "sent" || l.status === "delivered" ? "#2f7a52" : l.status === "failed" ? "#a23b3b" : MUTED }}>
                      {l.status === "sent" || l.status === "delivered" ? "✓" : l.status === "failed" ? "⚠" : "○"}
                    </span>{" "}
                    {REMINDER_TYPE_LABEL[l.reminder_type] ?? l.reminder_type} — {l.channel}
                  </span>
                  <span style={{ color: MUTED }}>
                    {l.status === "skipped" ? "Not configured" : l.status === "failed" ? (l.error_message || "Failed") : l.sent_at ? formatInTimeZone(new Date(l.sent_at), TZ, "d MMM, h:mm a") : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10, display: "flex", gap: 14, fontSize: ".82rem" }}>
            <span>{url
              ? `✓ ${appt.meta?.meeting_provider === "jitsi" ? "Browser video link" : appt.meta?.meeting_provider === "daily" ? "Daily video link" : "Zoom link"} ready — use Send meeting link to share with client`
              : "○ No meeting link generated yet"
            }</span>
          </div>
        </div>

        {feedback && (
          <div style={{ fontSize: ".82rem", color: feedback.includes("sent") || feedback.includes("Failed") === false ? "#2f7a52" : "#a23b3b", marginBottom: 12 }}>{feedback}</div>
        )}

        {showReschedule ? (
          <div style={{ background: "#f8f6f1", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.15)" }} />
              <input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.15)" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => void submitReschedule()} disabled={busy === "reschedule"}
                style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: GOLD, color: "#0e2518", fontWeight: 700, cursor: "pointer" }}>
                {busy === "reschedule" ? "Saving…" : "Confirm new time"}
              </button>
              <button type="button" onClick={() => setShowReschedule(false)} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(18,16,12,.2)", background: "#fff", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ padding: "9px 18px", borderRadius: 999, background: GOLD, color: "#0e2518", fontWeight: 700, textDecoration: "none", fontSize: ".85rem" }}>
                {appt.meta?.meeting_provider === "jitsi" || appt.meta?.meeting_provider === "daily"
                  ? "Join video call (browser)"
                  : "Join Zoom"}
              </a>
            )}
            {appt.status !== "cancelled" && appt.status !== "completed" && (
              <>
                <button type="button" onClick={() => void sendMeetingLink()} disabled={busy === "link"}
                  style={btnStyle}>{busy === "link" ? "Sending…" : "Send meeting link"}</button>
                <button type="button" onClick={() => setShowReschedule(true)} style={btnStyle}>Reschedule</button>
                <button type="button" onClick={() => void cancelBooking()} disabled={busy === "cancel"}
                  style={{ ...btnStyle, background: "rgba(162,59,59,.1)", color: "#a23b3b", border: "1px solid rgba(162,59,59,.2)" }}>
                  {busy === "cancel" ? "Cancelling…" : "Cancel"}
                </button>
              </>
            )}
          </div>
        )}

        {(status === "needs_confirmation" || status === "in_progress" || status === "due_now") && appt.status === "confirmed" && (
          <div style={{ borderTop: "1px solid rgba(18,16,12,.08)", paddingTop: 14 }}>
            <div style={{ fontSize: ".78rem", color: MUTED, marginBottom: 8 }}>
              {status === "needs_confirmation" ? "This appointment's time has passed — confirm what happened." : "Record the outcome once the appointment is done."}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => markOutcome("completed")}
                style={{ ...btnStyle, background: "rgba(47,122,82,.12)", color: "#2f7a52", border: "1px solid rgba(47,122,82,.25)" }}>
                ✓ Mark completed
              </button>
              <button type="button" onClick={() => markOutcome("no_show")}
                style={{ ...btnStyle, background: "rgba(162,59,59,.1)", color: "#a23b3b", border: "1px solid rgba(162,59,59,.2)" }}>
                Mark no-show
              </button>
            </div>
          </div>
        )}

        {(appt.status === "no_show" || appt.status === "cancelled") && (
          <div style={{ fontSize: ".82rem", color: MUTED, borderTop: "1px solid rgba(18,16,12,.08)", paddingTop: 14 }}>
            {ATTENTION_LABEL[status]} — no further action needed.
          </div>
        )}

        {(appt.status === "completed" || showFollowUp) && (
          <div style={{ borderTop: "1px solid rgba(18,16,12,.08)", paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontWeight: 700, fontSize: ".7rem", textTransform: "uppercase", letterSpacing: ".07em", color: MUTED, marginBottom: 12 }}>Post-consultation actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Follow-up email */}
              <div style={{ background: "#f8f6f1", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontWeight: 600, fontSize: ".85rem", color: GREEN, marginBottom: 6 }}>Send follow-up email to client</div>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Optional: add consultation notes or next steps to include in the email…"
                  rows={3}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.15)", fontSize: ".82rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => void sendFollowUp()}
                  disabled={busy === "followup"}
                  style={{ marginTop: 8, padding: "8px 18px", borderRadius: 999, border: "none", background: GOLD, color: "#0e2518", fontWeight: 700, cursor: "pointer", fontSize: ".84rem" }}>
                  {busy === "followup" ? "Sending…" : "Send follow-up email"}
                </button>
              </div>

              {/* Create client */}
              <button
                type="button"
                onClick={() => void createClientFromAppt()}
                disabled={busy === "client" || clientCreated}
                style={{
                  ...btnStyle,
                  background: clientCreated ? "rgba(47,122,82,.1)" : undefined,
                  color: clientCreated ? "#2f7a52" : GREEN,
                  border: clientCreated ? "1px solid rgba(47,122,82,.25)" : undefined,
                  textAlign: "left",
                }}>
                {clientCreated ? "✓ Client record created" : busy === "client" ? "Creating…" : "+ Create client record"}
              </button>

              {/* Create matter — 1-click */}
              <div style={{ background: "#f8f6f1", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontWeight: 600, fontSize: ".85rem", color: GREEN, marginBottom: 8 }}>Open a matter</div>
                <select
                  value={matterType}
                  onChange={(e) => setMatterType(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.15)", fontSize: ".82rem", marginBottom: 8, background: "#fff" }}>
                  <option value="">— Select workflow type —</option>
                  <option value="property_purchase">Property Purchase</option>
                  <option value="diaspora">Diaspora Transaction</option>
                  <option value="transfer">Transfer / Transmission</option>
                  <option value="power_of_attorney">Power of Attorney (General)</option>
                  <option value="power_of_attorney_limited">Power of Attorney (Limited)</option>
                  <option value="lost_title">Lost / Destroyed Title</option>
                  <option value="first_registration">First Registration</option>
                  <option value="adverse_possession">Adverse Possession</option>
                  <option value="subdivision">Subdivision</option>
                  <option value="estate_will">Estate / Will</option>
                  <option value="general">General</option>
                </select>
                <button
                  type="button"
                  onClick={() => void createMatterFromAppt()}
                  disabled={busy === "matter" || matterCreated}
                  style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: matterCreated ? "rgba(47,122,82,.1)" : GREEN, color: matterCreated ? "#2f7a52" : "#fff", fontWeight: 700, cursor: matterCreated ? "default" : "pointer", fontSize: ".84rem" }}>
                  {matterCreated ? "✓ Matter opened" : busy === "matter" ? "Creating…" : "+ Open matter"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 999, border: "1px solid rgba(16,42,30,.2)",
  background: "rgba(16,42,30,.06)", color: GREEN, fontSize: ".85rem", fontWeight: 600, cursor: "pointer",
};
