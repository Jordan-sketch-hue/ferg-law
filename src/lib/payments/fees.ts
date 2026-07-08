/**
 * Consultation fees (JMD) per service. These are the amounts a visitor pays to
 * confirm a booking on the pay path — they MUST match the flat J$8,000 price
 * shown on the service cards in BookingModal (SERVICES list) so the review step
 * and the gateway charge agree with what the visitor was quoted.
 *
 * Keyed by the canonical service ids from `@/lib/booking/services.ts`
 * (corporate, realestate, family, divorce, ip, sports).
 */
import type { ServiceId } from "@/lib/booking/availability";

/** Whole JMD — no cents. */
export const CONSULT_FEES: Record<ServiceId, number> = {
  // Flat consultation fee — J$8,000 (≈US$50), 20 minutes, every service
  // (Owen, 2026-06-28).
  corporate: 8000,
  realestate: 8000,
  family: 8000,
  divorce: 8000,
  ip: 8000,
  sports: 8000,
};

/** Consultation duration in minutes — applies to every service. */
export const CONSULT_DURATION_MIN = 20;

/** Flat consultation fee — applies to every service. */
const DEFAULT_FEE = 8000;

/** Consultation fee in whole JMD for a service id. */
export function consultFee(serviceId: string): number {
  return (CONSULT_FEES as Record<string, number>)[serviceId] ?? DEFAULT_FEE;
}

/** "J$8,000" — display helper for the review step and emails. */
export function formatJmd(amount: number): string {
  return "J$" + amount.toLocaleString("en-JM");
}
