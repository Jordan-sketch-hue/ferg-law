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

  // Look up taken times in the same window (PII-free RPC). Best-effort: if it
  // fails, we still return the open grid rather than blocking the UI.
  const taken = await fetchTakenSlots(allSlots);

  const grouped = groupByDay(allSlots, taken);

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

function groupByDay(allSlots: string[], taken: Set<number>): Day[] {
  const map = new Map<string, Day>();
  for (const iso of allSlots) {
    const key = dayKey(iso);
    let day = map.get(key);
    if (!day) {
      day = { date: key, label: dateChipLabel(iso), slots: [] };
      map.set(key, day);
    }
    day.slots.push({
      iso,
      label: slotTimeLabel(iso),
      available: !taken.has(new Date(iso).getTime()),
    });
  }
  return [...map.values()];
}
