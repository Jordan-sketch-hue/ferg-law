"use client";

/**
 * Partner Directory — browser API layer.
 *
 * Wraps the token-gated SECURITY DEFINER RPCs (migrations 0009/0010). The
 * partner's session token lives in localStorage; every call passes it as
 * p_token and the database verifies it. No service-role key is ever shipped.
 */
import { createClient } from "@/lib/supabase/client";
import type { PartnerKind, Media, Partner, Listing, Service } from "./constants";

// Re-export shared types/constants so existing `@/lib/partners/api` imports keep working.
export type { PartnerKind, Media, Partner, Listing, Service } from "./constants";
export { PARTNER_KINDS, PARISHES, ISLANDWIDE, PARTNER_DISCLAIMER } from "./constants";

const TOKEN_KEY = "fl-partner-token";

export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("email exists")) return "That email is already registered. Try logging in.";
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("weak password")) return "Password must be at least 6 characters.";
  if (m.includes("unauthorized")) return "Your session expired — please log in again.";
  if (m.includes("bad kind")) return "Please choose real estate agent, loan officer, valuator or land surveyor.";
  return msg || "Something went wrong. Please try again.";
}

export async function registerPartner(
  email: string,
  password: string,
  kind: PartnerKind,
  businessName: string,
): Promise<string> {
  const sb = createClient();
  const { data, error } = await sb.rpc("fl_partner_register", {
    p_email: email,
    p_password: password,
    p_kind: kind,
    p_business_name: businessName,
  });
  if (error) throw new Error(friendly(error.message));
  setToken(data as string);
  return data as string;
}

export async function loginPartner(email: string, password: string): Promise<string> {
  const sb = createClient();
  const { data, error } = await sb.rpc("fl_partner_login", {
    p_email: email,
    p_password: password,
  });
  if (error) throw new Error(friendly(error.message));
  setToken(data as string);
  return data as string;
}

export async function getMe(): Promise<Partner | null> {
  const token = getToken();
  if (!token) return null;
  const sb = createClient();
  const { data, error } = await sb.rpc("fl_partner_me", { p_token: token });
  if (error) {
    if (error.message.toLowerCase().includes("unauthorized")) clearToken();
    return null;
  }
  const rows = data as Partner[];
  return rows && rows.length ? rows[0] : null;
}

export async function updateProfile(patch: Partial<Partner>): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  const sb = createClient();
  const { error } = await sb.rpc("fl_partner_update", { p_token: token, p_patch: patch });
  if (error) throw new Error(friendly(error.message));
}

/** Change the signed-in partner's password (verifies the current one). */
export async function changePassword(current: string, next: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  const sb = createClient();
  const { error } = await sb.rpc("fl_partner_set_password", {
    p_token: token,
    p_current: current,
    p_new: next,
  });
  if (error) {
    if (error.message.toLowerCase().includes("invalid login")) {
      throw new Error("Your current password is incorrect.");
    }
    throw new Error(friendly(error.message));
  }
}

export async function getMyListings(): Promise<Listing[]> {
  const token = getToken();
  if (!token) return [];
  const sb = createClient();
  const { data, error } = await sb.rpc("fl_partner_listings", { p_token: token });
  if (error) throw new Error(friendly(error.message));
  return (data as Listing[]) ?? [];
}

export async function getMyServices(): Promise<Service[]> {
  const token = getToken();
  if (!token) return [];
  const sb = createClient();
  const { data, error } = await sb.rpc("fl_partner_services", { p_token: token });
  if (error) throw new Error(friendly(error.message));
  return (data as Service[]) ?? [];
}

export async function saveListing(listing: Partial<Listing>): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  const sb = createClient();
  const { data, error } = await sb.rpc("fl_partner_save_listing", {
    p_token: token,
    p_data: listing,
  });
  if (error) throw new Error(friendly(error.message));
  return data as string;
}

export async function deleteListing(id: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  const sb = createClient();
  const { error } = await sb.rpc("fl_partner_delete_listing", { p_token: token, p_id: id });
  if (error) throw new Error(friendly(error.message));
}

export async function saveService(service: Partial<Service>): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  const sb = createClient();
  const { data, error } = await sb.rpc("fl_partner_save_service", {
    p_token: token,
    p_data: service,
  });
  if (error) throw new Error(friendly(error.message));
  return data as string;
}

export async function deleteService(id: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not signed in.");
  const sb = createClient();
  const { error } = await sb.rpc("fl_partner_delete_service", { p_token: token, p_id: id });
  if (error) throw new Error(friendly(error.message));
}

/** Upload an image/video to the public partner-media bucket; returns its URL. */
export async function uploadMedia(partnerId: string, file: File): Promise<Media> {
  const sb = createClient();
  const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${partnerId}/${Date.now()}-${safe}`;
  const { error } = await sb.storage.from("partner-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(friendly(error.message));
  const { data } = sb.storage.from("partner-media").getPublicUrl(path);
  return { type: file.type.startsWith("video") ? "video" : "image", url: data.publicUrl };
}
