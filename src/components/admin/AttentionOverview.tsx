"use client";

/**
 * Appointment Attention System — Overview surface.
 *
 * Renders "Next appointment", "Today's schedule", and an "Attention required"
 * banner inside the admin Overview tab. Pure presentation over the `appts`
 * array the dashboard already fetches (fl_admin_appointments) — no extra
 * network calls except the tiny schedule-review read/write.
 *
 * Design note: attention state is *computed*, not stored — see
 * src/lib/attention/status.ts. This component just renders that computation
 * and gives the admin the same "join / mark completed / mark no-show" quick
 * actions that live on the full attention panel, without leaving Overview.
 */

import { useCallback, useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import {
  computeAttentionStatus,
  formatCountdown,
  needsAttention,
  ATTENTION_LABEL,
  ATTENTION_TONE,
  type AttentionStatus,
} from "@/lib/attention/status";

const GREEN = "#102A1E";
const GOLD = "#C8A65C";
const MUTED = "#69736d";
const TZ = "America/Jamaica";

export interface AttentionAppt {
  id: string;
  name: string | null;
  service: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string | null;
  ref: string | null;
  meta?: { meeting_url?: string | null; zoom_url?: string | null } | null;
}

interface Props {
  appts: AttentionAppt[];
  token: string;
  accountEmail: string | null;
  onOpenAttention: (a: AttentionAppt) => void;
  onTab: (t: string) => void;
}

function meetingUrl(a: AttentionAppt): string | null {
  return a.meta?.meeting_url ?? a.meta?.zoom_url ?? null;
}

function todayKeyJamaica(now: Date): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

export default function AttentionOverview({ appts, token, accountEmail, onOpenAttention, onTab }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [reviewedAt, setReviewedAt] = useState<string | null | undefined>(undefined); // undefined = loading
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const reviewKey = accountEmail || token;

  const loadReviewStatus = useCallback(async () => {
    if (!token || !reviewKey) return;
    const supabase = createClient();
    const { data } = await supabase.rpc("fl_admin_schedule_review_today", {
      p_token: token,
      p_email: reviewKey,
    });
    setReviewedAt((data as string | null) ?? null);
  }, [token, reviewKey]);

  useEffect(() => { void loadReviewStatus(); }, [loadReviewStatus]);

  async function markReviewed() {
    if (!token || !reviewKey || reviewBusy) return;
    setReviewBusy(true);
    const supabase = createClient();
    await supabase.rpc("fl_admin_mark_schedule_reviewed", { p_token: token, p_email: reviewKey });
    await loadReviewStatus();
    setReviewBusy(false);
  }

  const todayKey = todayKeyJamaica(now);
  const todaysAppts = appts
    .filter((a) => formatInTimeZone(new Date(a.starts_at), TZ, "yyyy-MM-dd") === todayKey)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const upNext = appts
    .filter((a) => a.status !== "cancelled" && a.status !== "completed" && a.status !== "no_show")
    .filter((a) => new Date(a.starts_at).getTime() + 20 * 60 * 1000 >= now.getTime())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

  const attentionItems = appts.filter((a) => needsAttention(computeAttentionStatus(a, now)));

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Next appointment */}
      {upNext ? (
        <NextAppointmentCard appt={upNext} now={now} onOpen={() => onOpenAttention(upNext)} />
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: MUTED, fontSize: ".88rem" }}>
          No upcoming appointments.
        </div>
      )}

      {/* Attention required banner */}
      {attentionItems.length > 0 && (
        <div style={{ background: "rgba(190,60,60,.08)", border: "1px solid rgba(190,60,60,.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".07em", color: "#a23b3b", marginBottom: 10 }}>
            ⚠ Attention required — {attentionItems.length} appointment{attentionItems.length > 1 ? "s" : ""}
          </div>
          {attentionItems.slice(0, 4).map((a) => {
            const st = computeAttentionStatus(a, now);
            return (
              <button key={a.id} type="button" onClick={() => onOpenAttention(a)}
                style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid rgba(190,60,60,.15)", background: "none", border: "none", cursor: "pointer" }}>
                <span>
                  <span style={{ fontWeight: 600, fontSize: ".88rem", color: GREEN }}>{a.name || "—"}</span>
                  <span style={{ color: MUTED, fontSize: ".78rem" }}> · {a.service || "—"} · {formatInTimeZone(new Date(a.starts_at), TZ, "h:mm a")}</span>
                </span>
                <AttentionBadge status={st} />
              </button>
            );
          })}
        </div>
      )}

      {/* Today's schedule */}
      <div style={{ background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(18,16,12,.06)" }}>
          <span style={{ fontWeight: 700, fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".06em", color: MUTED }}>
            Today&rsquo;s schedule {todaysAppts.length > 0 && `(${todaysAppts.length})`}
          </span>
          <button type="button" onClick={() => onTab("calendar")} style={{ fontSize: ".76rem", fontWeight: 600, color: "#8a6a22", background: "none", border: "none", cursor: "pointer" }}>
            View calendar →
          </button>
        </div>
        {todaysAppts.length === 0 ? (
          <div style={{ padding: "18px 16px", color: MUTED, fontSize: ".88rem" }}>No appointments scheduled for today.</div>
        ) : (
          todaysAppts.map((a, i) => {
            const st = computeAttentionStatus(a, now);
            const url = meetingUrl(a);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: i > 0 ? "1px solid rgba(18,16,12,.06)" : "none" }}>
                <div style={{ width: 76, flexShrink: 0, fontWeight: 700, fontSize: ".85rem", color: GREEN }}>
                  {formatInTimeZone(new Date(a.starts_at), TZ, "h:mm a")}
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpenAttention(a)}>
                  <div style={{ fontWeight: 600, fontSize: ".88rem", color: GREEN }}>{a.name || "—"}</div>
                  <div style={{ fontSize: ".78rem", color: MUTED }}>{a.service || "—"}</div>
                </div>
                <AttentionBadge status={st} />
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: ".76rem", fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: GOLD, color: "#0e2518", textDecoration: "none", whiteSpace: "nowrap" }}>
                    Join
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Schedule review acknowledgement */}
      {todaysAppts.length > 0 && (
        reviewedAt ? (
          <div style={{ fontSize: ".8rem", color: "#2f7a52", display: "flex", alignItems: "center", gap: 10 }}>
            ✓ Schedule reviewed today ({formatInTimeZone(new Date(reviewedAt), TZ, "h:mm a")})
            <button type="button" onClick={() => void markReviewed()} disabled={reviewBusy}
              style={{ background: "none", border: "none", color: MUTED, fontSize: ".76rem", cursor: "pointer", textDecoration: "underline" }}>
              Review again
            </button>
          </div>
        ) : reviewedAt === null ? (
          <button type="button" onClick={() => void markReviewed()} disabled={reviewBusy}
            style={{ fontSize: ".82rem", fontWeight: 600, color: "#8a6a22", background: "rgba(200,166,92,.12)", border: "1px solid rgba(200,166,92,.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
            {reviewBusy ? "Recording…" : "✓ Mark today's schedule as reviewed"}
          </button>
        ) : null
      )}
    </div>
  );
}

function NextAppointmentCard({ appt, now, onOpen }: { appt: AttentionAppt; now: Date; onOpen: () => void }) {
  const st = computeAttentionStatus(appt, now);
  const startingSoon = st === "due_now" || st === "in_progress";
  const url = meetingUrl(appt);
  return (
    <div
      onClick={onOpen}
      style={{
        background: startingSoon ? "linear-gradient(135deg,#102A1E,#1a3d2a)" : "#fff",
        border: startingSoon ? "1px solid rgba(200,166,92,.4)" : "1px solid rgba(18,16,12,.08)",
        borderRadius: 14, padding: "18px 22px", marginBottom: 12, cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: ".7rem", textTransform: "uppercase", letterSpacing: ".08em", color: startingSoon ? GOLD : MUTED, marginBottom: 8 }}>
        {startingSoon ? "Starting soon" : "Next appointment"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.15rem", fontWeight: 700, color: startingSoon ? "#F6F2EA" : GREEN }}>
            {appt.name || "—"}
          </div>
          <div style={{ fontSize: ".85rem", color: startingSoon ? "#c9d6cd" : MUTED, marginTop: 2 }}>
            {appt.service || "—"} · {formatInTimeZone(new Date(appt.starts_at), TZ, "EEE d MMM, h:mm a")}
          </div>
          <div style={{ fontSize: ".8rem", color: startingSoon ? GOLD : "#8a6a22", marginTop: 4, fontWeight: 600 }}>
            {formatCountdown(appt.starts_at, now)}
          </div>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            style={{ fontSize: ".85rem", fontWeight: 700, padding: "10px 20px", borderRadius: 999, background: GOLD, color: "#0e2518", textDecoration: "none", whiteSpace: "nowrap" }}>
            Join Zoom
          </a>
        )}
      </div>
    </div>
  );
}

export function AttentionBadge({ status }: { status: AttentionStatus }) {
  const tone = ATTENTION_TONE[status];
  return (
    <span style={{ background: tone.bg, color: tone.fg, fontSize: ".7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {ATTENTION_LABEL[status]}
    </span>
  );
}
