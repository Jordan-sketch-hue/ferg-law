/**
 * Appointment Attention System — pure status/formatting logic.
 *
 * No I/O here so it can be unit-tested and reused by both the admin dashboard
 * (client) and any server route that needs the same classification. Statuses
 * are derived purely from `status` + `starts_at`/`ends_at` vs. "now" — nothing
 * is persisted, so the label is always fresh and never drifts from reality.
 */

export type AttentionStatus =
  | "upcoming"
  | "due_soon"
  | "due_now"
  | "in_progress"
  | "needs_confirmation"
  | "completed"
  | "no_show"
  | "cancelled";

export interface AttentionInput {
  status: string | null;
  starts_at: string;
  ends_at?: string | null;
}

const DUE_SOON_MS = 2 * 60 * 60 * 1000; // 2h
const DUE_NOW_MS = 15 * 60 * 1000; // 15m

/** Classify one appointment's attention state as of `now`. */
export function computeAttentionStatus(a: AttentionInput, now: Date = new Date()): AttentionStatus {
  if (a.status === "cancelled") return "cancelled";
  if (a.status === "completed") return "completed";
  if (a.status === "no_show") return "no_show";

  const nowMs = now.getTime();
  const startMs = new Date(a.starts_at).getTime();
  const endMs = a.ends_at ? new Date(a.ends_at).getTime() : startMs + 20 * 60 * 1000;

  if (nowMs > endMs) return "needs_confirmation"; // ended, never marked completed/no-show
  if (nowMs >= startMs) return "in_progress";
  if (startMs - nowMs <= DUE_NOW_MS) return "due_now";
  if (startMs - nowMs <= DUE_SOON_MS) return "due_soon";
  return "upcoming";
}

export const ATTENTION_LABEL: Record<AttentionStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  due_now: "Due now",
  in_progress: "In progress",
  needs_confirmation: "Attendance confirmation required",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
};

export const ATTENTION_TONE: Record<AttentionStatus, { bg: string; fg: string }> = {
  upcoming: { bg: "rgba(18,16,12,.07)", fg: "#69736d" },
  due_soon: { bg: "rgba(200,166,92,.18)", fg: "#8a6a22" },
  due_now: { bg: "rgba(200,166,92,.35)", fg: "#5f4813" },
  in_progress: { bg: "rgba(47,122,82,.18)", fg: "#2f7a52" },
  needs_confirmation: { bg: "rgba(190,60,60,.14)", fg: "#a23b3b" },
  completed: { bg: "rgba(16,42,30,.12)", fg: "#102A1E" },
  no_show: { bg: "rgba(190,60,60,.14)", fg: "#a23b3b" },
  cancelled: { bg: "rgba(18,16,12,.08)", fg: "#69736d" },
};

/** "2h 18m" / "18m" / "starting now" / "12m ago" — for countdown displays. */
export function formatCountdown(targetIso: string, now: Date = new Date()): string {
  const diffMs = new Date(targetIso).getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  if (diffMs <= 0 && abs < 60_000) return "starting now";
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diffMs > 0 ? `in ${label}` : `${label} ago`;
}

/** Attention items are only "actionable" in these states — used to badge/filter. */
export function needsAttention(s: AttentionStatus): boolean {
  return s === "due_now" || s === "in_progress" || s === "needs_confirmation";
}
