import type { MetadataRoute } from "next";

const BASE = "https://fergusonlawja.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/get-started`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/buyers-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/explainers`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/directory`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
