import type { MetadataRoute } from "next";

const BASE = "https://ferguson-law.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guides/buyer`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guides/seller`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/directory`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
