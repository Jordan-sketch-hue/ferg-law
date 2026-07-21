/**
 * GET /api/booking/slots?service=<id>&days=<n>
 *
 * Returns availability grouped by day so the modal can render date chips and a
 * slot grid. Taken times are flagged `available: false` (greyed out) rather
 * than omitted, via the PII-free `taken_slots` RPC.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateSlots, TZ } from "@/lib/booking/availability";
import {
  slotTimeLabel,
  dateChipLabel,
  dayKey,
} from "@/lib/booking/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Slot = { iso: string; label: string; available: boolean };
type Day = { date: string; label: string; slots: Slot[] };

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const service = url.searchParams.get("service") || "family";
  const days = clampDays(Number(url.searchParams.get("days")) || 14);

  const now = new Date();

  // All structurally-valid slots for the window, ignoring bookings.
  const allSlots = generateSlots(service, now, days, []);

  // Look up taken times + admin-blocked dates. Best-effort on both.
  const [taken, blockedSlots] = await Promise.all([
    fetchTakenSlots(allSlots),
    fetchBlockedSlots(allSlots),
  ]);

  const grouped = groupByDay(allSlots, taken, blockedSlots);

  return Response.json(
    { tz: TZ, service, days: grouped },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function clampDays(n: number): number {
  if (!Number.isFinite(n)) return 14;
  return Math.min(60, Math.max(1, Math.floor(n)));
}

async function fetchTakenSlots(allSlots: string[]): Promise<Set<number>> {
  const set = new Set<number>();
  if (allSlots.length === 0) return set;

  const from = allSlots[0];
  // +1ms past the last slot so the range is inclusive of it.
  const to = new Date(new Date(allSlots[allSlots.length - 1]).getTime() + 1000).toISOString();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("taken_slots", {
      p_from: from,
      p_to: to,
    });
    if (error || !data) return set;
    for (const t of data as string[]) {
      set.add(new Date(t).getTime());
    }
  } catch {
    // swallow — return whatever we have; grid stays usable
  }
  return set;
}

async function fetchBlockedSlots(allSlots: string[]): Promise<Set<number>> {
  const set = new Set<number>();
  if (allSlots.length === 0) return set;
  try {
    const supabase = createAdminClient();
    const from = allSlots[0];
    const to = new Date(new Date(allSlots[allSlots.length - 1]).getTime() + 1000).toISOString();
    const { data } = await supabase
      .from("fl_blocked_slots")
      .select("starts_at")
      .gte("starts_at", from)
      .lte("starts_at", to);
    for (const r of (data ?? []) as { starts_at: string }[]) set.add(new Date(r.starts_at).getTime());
  } catch { /* swallow */ }
  return set;
}

function groupByDay(allSlots: string[], taken: Set<number>, blocked: Set<number>): Day[] {
  const map = new Map<string, Day>();
  const seenLabels = new Map<string, Set<string>>();
  for (const iso of allSlots) {
    const key = dayKey(iso);
    let day = map.get(key);
    if (!day) {
      day = { date: key, label: dateChipLabel(iso), slots: [] };
      map.set(key, day);
      seenLabels.set(key, new Set());
    }
    const label = slotTimeLabel(iso);
    const dayLabels = seenLabels.get(key)!;
    if (dayLabels.has(label)) continue;
    dayLabels.add(label);
    const ms = new Date(iso).getTime();
    day.slots.push({
      iso,
      label,
      available: !taken.has(ms) && !blocked.has(ms),
    });
  }
  return [...map.values()];
}
