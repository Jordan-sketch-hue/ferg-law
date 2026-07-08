/**
 * Booking availability — business rules + slot generation.
 *
 * Pure & testable. All wall-clock reasoning is done in the firm's timezone
 * (America/Jamaica, fixed UTC-5, no DST) using date-fns-tz, and every slot is
 * returned as a real UTC instant (ISO string). The browser renders the label
 * for the same instant back in Jamaica time, so what the visitor picks is
 * exactly what lands in the database.
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const TZ = "America/Jamaica";

/** Service ids must match BookingModal's SERVICES list. */
export type ServiceId =
  | "corporate"
  | "realestate"
  | "family"
  | "divorce"
  | "ip"
  | "sports";

/** Consultation length per service, in minutes. */
export const SERVICE_DURATION: Record<ServiceId, number> = {
  // Flat 20-minute consultation for every service (Owen, 2026-06-28).
  corporate: 20,
  realestate: 20,
  family: 20,
  divorce: 20,
  ip: 20,
  sports: 20,
};

/** Booking window, in Jamaica wall-clock terms. */
const OPEN_HOUR = 9; // 09:00
const CLOSE_HOUR = 16; // 16:00 (last slot must END by this)
const LUNCH_START_HOUR = 13; // 13:00–14:00 excluded
const LUNCH_END_HOUR = 14;
const SLOT_STEP_MIN = 30; // grid granularity
const MIN_LEAD_MS = 2 * 60 * 60 * 1000; // 2-hour minimum lead time

export function serviceDuration(service: string): number {
  return (SERVICE_DURATION as Record<string, number>)[service] ?? 20;
}

/** Minutes-since-midnight (Jamaica) of a [start, start+dur) window. */
function withinBusinessHours(startMin: number, durationMin: number): boolean {
  const endMin = startMin + durationMin;
  const openMin = OPEN_HOUR * 60;
  const closeMin = CLOSE_HOUR * 60;
  const lunchStart = LUNCH_START_HOUR * 60;
  const lunchEnd = LUNCH_END_HOUR * 60;

  if (startMin < openMin) return false;
  if (endMin > closeMin) return false;
  // Reject any slot that overlaps the lunch break.
  if (startMin < lunchEnd && endMin > lunchStart) return false;
  return true;
}

/** A weekday in Jamaica: Mon(1)–Fri(5). */
function isWeekday(zoned: Date): boolean {
  const dow = zoned.getDay();
  return dow >= 1 && dow <= 5;
}

/**
 * Generate available slot start times (ISO/UTC) for `service`, scanning the
 * next `days` calendar days starting at `fromDate`.
 *
 * @param service  service id (falls back to 30-min duration if unknown)
 * @param fromDate the "now" reference instant (defaults to current time)
 * @param days     number of calendar days to scan forward (default 14)
 * @param taken    ISO start times already booked — excluded from the result
 */
export function generateSlots(
  service: string,
  fromDate: Date = new Date(),
  days = 14,
  taken: string[] = [],
): string[] {
  const duration = serviceDuration(service);
  const earliest = fromDate.getTime() + MIN_LEAD_MS;
  const takenSet = new Set(taken.map((t) => new Date(t).getTime()));

  // Start scanning from the Jamaica-local calendar date of `fromDate`.
  const startZoned = toZonedTime(fromDate, TZ);
  const baseYear = startZoned.getFullYear();
  const baseMonth = startZoned.getMonth();
  const baseDate = startZoned.getDate();

  const out: string[] = [];
  const seenInstants = new Set<number>(); // Prevent duplicate times

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    // Midnight of this scan day, expressed as Jamaica wall-clock.
    const dayZoned = new Date(
      baseYear,
      baseMonth,
      baseDate + dayOffset,
      0,
      0,
      0,
      0,
    );
    if (!isWeekday(dayZoned)) continue;

    for (
      let minutes = OPEN_HOUR * 60;
      minutes < CLOSE_HOUR * 60;
      minutes += SLOT_STEP_MIN
    ) {
      if (!withinBusinessHours(minutes, duration)) continue;

      // Build the wall-clock instant for this slot, then convert to a real UTC
      // instant via the Jamaica zone.
      const wall = new Date(
        dayZoned.getFullYear(),
        dayZoned.getMonth(),
        dayZoned.getDate(),
        Math.floor(minutes / 60),
        minutes % 60,
        0,
        0,
      );
      const instant = fromZonedTime(wall, TZ);
      const ms = instant.getTime();

      if (ms < earliest) continue; // past / inside the lead window
      if (takenSet.has(ms)) continue; // already booked
      if (seenInstants.has(ms)) continue; // skip exact duplicates

      seenInstants.add(ms);
      out.push(instant.toISOString());
    }
  }

  return out;
}
