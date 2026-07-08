/**
 * Jamaica-timezone label formatting for the booking flow. Kept separate from
 * availability.ts so route handlers and the email module can reuse it without
 * pulling in slot-generation logic.
 */
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "./availability";

/** "9:00 AM" — slot/time label in Jamaica time. */
export function slotTimeLabel(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "h:mm a");
}

/** "Mon 30 Jun" — date-chip label in Jamaica time. */
export function dateChipLabel(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "EEE d MMM");
}

/** "yyyy-MM-dd" Jamaica calendar key — used to group slots by day. */
export function dayKey(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd");
}

/** "Monday, 30 June 2026 at 9:00 AM (Jamaica)" — full confirmation label. */
export function fullWhenLabel(iso: string): string {
  return (
    formatInTimeZone(new Date(iso), TZ, "EEEE, d MMMM yyyy 'at' h:mm a") +
    " (Jamaica time)"
  );
}
