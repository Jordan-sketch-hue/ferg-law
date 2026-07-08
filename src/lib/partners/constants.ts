/**
 * Partner Directory — shared, framework-neutral constants & types.
 * No "use client" and no Supabase import, so BOTH server components (public
 * directory / profile pages) and the client api layer can import from here.
 */

export type PartnerKind = "realtor" | "loan_officer" | "valuator" | "surveyor";

export interface Media {
  type: "image" | "video";
  url: string;
}

export interface Partner {
  id: string;
  kind: PartnerKind;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  parishes: string[];
  reb_number: string | null;
  bio: string | null;
  logo_url: string | null;
  slug: string | null;
  status: "pending" | "approved" | "suspended";
  featured: boolean;
}

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  parish: string | null;
  address: string | null;
  price_jmd: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  media: Media[];
  status: "draft" | "published" | "archived";
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  fee_text: string | null;
  fee_jmd: number | null;
  status: "draft" | "published" | "archived";
}

export const PARTNER_KINDS: { value: PartnerKind; label: string; blurb: string }[] = [
  { value: "realtor",      label: "Real Estate Agent", blurb: "Post property listings with photos & video." },
  { value: "loan_officer", label: "Loan Officer",      blurb: "Post your mortgage & loan products and rates." },
  { value: "valuator",     label: "Valuator",          blurb: "Post your valuation services and fees." },
  { value: "surveyor",     label: "Land Surveyor",     blurb: "Post your survey services and fees." },
];

export const KIND_LABEL: Record<PartnerKind, string> = {
  realtor:      "Real Estate Agent",
  loan_officer: "Loan Officer",
  valuator:     "Valuator",
  surveyor:     "Land Surveyor",
};

export const KIND_PLURAL: Record<PartnerKind, string> = {
  realtor:      "Real Estate Agents",
  loan_officer: "Loan Officers",
  valuator:     "Valuators",
  surveyor:     "Land Surveyors",
};

export const PARISHES = [
  "Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester",
  "St. Elizabeth", "Westmoreland", "Hanover", "St. James", "Trelawny",
  "St. Ann", "St. Mary", "Portland", "St. Thomas",
];

/**
 * Sentinel stored in `parishes[]` when a partner serves the whole island.
 * Realtors & surveyors often cover several parishes but not everywhere — so the
 * dashboard offers individual parishes OR this single "Islandwide" toggle.
 */
export const ISLANDWIDE = "Islandwide";

/** Shown on every public partner page — the firm lists, it does not endorse. */
export const PARTNER_DISCLAIMER =
  "Listings are posted by independent third-party professionals. Ferguson Law does not " +
  "employ, endorse, verify or warrant any listed professional, listing, property, service " +
  "or fee, and accepts no liability for them. Any engagement is solely between you and the " +
  "professional. Always conduct your own due diligence.";
