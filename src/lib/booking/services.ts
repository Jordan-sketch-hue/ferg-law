/**
 * Canonical service catalog for the booking flow — shared by the modal (UI)
 * and the API (validation + display-name resolution). Ids and titles MUST
 * match BookingModal's SERVICES list and availability.ts's duration map.
 */
import type { ServiceId } from "./availability";

export type ServiceMeta = {
  id: ServiceId;
  title: string;
  durationMin: number;
};

export const SERVICE_META: Record<ServiceId, ServiceMeta> = {
  corporate: { id: "corporate", title: "Corporate & Commercial", durationMin: 20 },
  realestate: { id: "realestate", title: "Real Estate & Conveyancing", durationMin: 20 },
  family: { id: "family", title: "Family & Estate", durationMin: 20 },
  divorce: { id: "divorce", title: "Divorce & Matrimonial", durationMin: 20 },
  ip: { id: "ip", title: "Intellectual Property", durationMin: 20 },
  sports: { id: "sports", title: "Sports Law", durationMin: 20 },
};

export function isServiceId(v: unknown): v is ServiceId {
  return typeof v === "string" && v in SERVICE_META;
}

export function serviceTitle(id: string): string {
  return isServiceId(id) ? SERVICE_META[id].title : id;
}
