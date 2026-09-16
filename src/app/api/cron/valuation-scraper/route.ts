import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// JMD/USD exchange rate — update periodically
const JMD_PER_USD = 157;

// Parish name normalisation — maps variant spellings to canonical keys
const PARISH_MAP: Record<string, string> = {
  "kingston":                   "Kingston & St. Andrew",
  "kingston and st. andrew":    "Kingston & St. Andrew",
  "kingston & st. andrew":      "Kingston & St. Andrew",
  "kingston/st. andrew":        "Kingston & St. Andrew",
  "st. andrew":                 "Kingston & St. Andrew",
  "saint andrew":               "Kingston & St. Andrew",
  "st. james":                  "St. James",
  "saint james":                "St. James",
  "montego bay":                "St. James",
  "st. catherine":              "St. Catherine",
  "saint catherine":            "St. Catherine",
  "portmore":                   "St. Catherine",
  "clarendon":                  "Clarendon",
  "manchester":                 "Manchester",
  "mandeville":                 "Manchester",
  "st. elizabeth":              "St. Elizabeth",
  "saint elizabeth":            "St. Elizabeth",
  "trelawny":                   "Trelawny",
  "falmouth":                   "Trelawny",
  "st. ann":                    "St. Ann",
  "saint ann":                  "St. Ann",
  "ocho rios":                  "St. Ann",
  "st. mary":                   "St. Mary",
  "saint mary":                 "St. Mary",
  "portland":                   "Portland",
  "port antonio":               "Portland",
  "st. thomas":                 "St. Thomas",
  "saint thomas":               "St. Thomas",
  "westmoreland":               "Westmoreland",
  "negril":                     "Westmoreland",
  "hanover":                    "Hanover",
  "lucea":                      "Hanover",
};

interface Listing {
  parish: string;
  propType: "land" | "built";
  priceJmd: number;
  sizesqft: number;
  pricePerSqft: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normaliseParish(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\bst\b\.?\s/g, "st. ");
  return PARISH_MAP[key] ?? null;
}

function extractJmd(priceStr: string): number | null {
  const clean = priceStr.replace(/,/g, "").trim();
  const usdMatch = clean.match(/(?:USD?|US\$|U\.?S\.?\$)\s*([0-9.]+)/i);
  if (usdMatch) return parseFloat(usdMatch[1]) * JMD_PER_USD;
  const jmdMatch = clean.match(/(?:JMD?|J\$|JA\$)?\s*([0-9.]+(?:\.[0-9]+)?)\s*(?:million|m)?/i);
  if (!jmdMatch) return null;
  const val = parseFloat(jmdMatch[1]);
  if (/million|m/i.test(clean)) return val * 1_000_000;
  return val > 0 ? val : null;
}

function toSqft(size: number, unit: string): number | null {
  const u = unit.toLowerCase().trim();
  if (u.includes("sq ft") || u.includes("sqft") || u === "ft" || u === "ft2") return size;
  if (u.includes("sq m") || u.includes("sqm") || u === "m2") return size * 10.7639;
  if (u.includes("acre")) return size * 43560;
  if (u.includes("perch")) return size * 272.25;
  return null;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Scrapers ─────────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Extract listings from Century21 Jamaica search results page */
async function scrapeCentury21(): Promise<Listing[]> {
  const listings: Listing[] = [];
  const baseUrl = "https://www.century21ja.com";

  for (const type of ["residential", "land-lots-farms"]) {
    try {
      const html = await fetchHtml(`${baseUrl}/properties-for-sale?type=${type}&perPage=100`);

      // JSON-LD schema extraction
      const jsonldMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of jsonldMatches) {
        try {
          const data = JSON.parse(m[1]);
          const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
          for (const item of items) {
            if (!item.name) continue;
            const priceRaw = item.offers?.price ?? item.price ?? "";
            const currency = (item.offers?.priceCurrency ?? "JMD").toUpperCase();
            const sizeRaw = item.floorSize?.value ?? item.lotSize?.value ?? "";
            const sizeUnit = item.floorSize?.unitCode ?? item.lotSize?.unitCode ?? "SQFT";
            const parish = item.address?.addressRegion ?? item.address?.addressLocality ?? "";

            const priceNum = parseFloat(String(priceRaw).replace(/,/g, ""));
            const priceJmd = currency === "USD" ? priceNum * JMD_PER_USD : priceNum;
            const sqft = toSqft(parseFloat(String(sizeRaw)), sizeUnit);
            const p = normaliseParish(parish);

            if (p && sqft && sqft > 0 && priceJmd > 100_000) {
              const propType = type === "land-lots-farms" ? "land" : "built";
              listings.push({ parish: p, propType, priceJmd, sizesqft: sqft, pricePerSqft: priceJmd / sqft });
            }
          }
        } catch {}
      }

      // Fallback: regex extraction from listing cards
      const cardRe = /<div[^>]+class="[^"]*property-card[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;
      const priceRe = /(?:J\$|JMD|USD?|US\$)[\s]*([0-9,]+(?:\.[0-9]+)?(?:\s*(?:million|m))?)/gi;
      const sizeRe = /([0-9,]+(?:\.[0-9]+)?)\s*(sq\.?\s*ft|sqft|acres?|sq\.?\s*m)/gi;
      const parishRe = /(?:parish|location)[^>]*>[^<]*?(Kingston|St\.\s*\w+|Manchester|Clarendon|Trelawny|Westmoreland|Hanover|Portland)[^<]*/gi;

      for (const card of html.matchAll(cardRe)) {
        const cardHtml = card[0];
        const priceM = priceRe.exec(cardHtml);
        const sizeM = sizeRe.exec(cardHtml);
        const parishM = parishRe.exec(cardHtml);
        if (!priceM || !sizeM || !parishM) continue;

        const priceJmd = extractJmd(priceM[0]);
        const sqft = toSqft(parseFloat(sizeM[1].replace(/,/g, "")), sizeM[2]);
        const p = normaliseParish(parishM[1]);

        if (p && sqft && sqft > 0 && priceJmd && priceJmd > 100_000) {
          const propType = type === "land-lots-farms" ? "land" : "built";
          listings.push({ parish: p, propType, priceJmd, sizeqft: sqft, pricePerSqft: priceJmd / sqft } as Listing);
        }
      }
    } catch (err) {
      console.warn("[valuation-scraper] century21 error:", err);
    }
  }
  return listings;
}

/** Extract listings from PropertyAds Jamaica */
async function scrapePropertyAds(): Promise<Listing[]> {
  const listings: Listing[] = [];
  const parishes = [
    "kingston", "st-james", "st-catherine", "clarendon",
    "manchester", "st-ann", "trelawny", "westmoreland",
    "portland", "st-thomas", "st-elizabeth", "st-mary", "hanover",
  ];

  for (const parish of parishes) {
    try {
      const html = await fetchHtml(`https://www.propertyads.com.jm/buy?parish=${parish}&perPage=50`);
      // Price regex
      const priceRe = /(?:J\$|JMD|USD?|US\$)[\s]*([0-9,]+(?:\.[0-9]+)?(?:\s*(?:million|m))?)/gi;
      const sizeRe = /([0-9,]+(?:\.[0-9]+)?)\s*(sq\.?\s*ft|sqft|acres?|sq\.?\s*m)/gi;
      const landRe = /\b(land|lot|plot|farm)\b/i;

      const prices = [...html.matchAll(priceRe)];
      const sizes = [...html.matchAll(sizeRe)];
      const isLand = landRe.test(html.substring(0, 5000));
      const p = normaliseParish(parish.replace(/-/g, " "));
      if (!p) continue;

      for (let i = 0; i < Math.min(prices.length, sizes.length); i++) {
        const priceJmd = extractJmd(prices[i][0]);
        const sqft = toSqft(parseFloat(sizes[i][1].replace(/,/g, "")), sizes[i][2]);
        if (sqft && sqft > 0 && priceJmd && priceJmd > 100_000) {
          listings.push({
            parish: p,
            propType: isLand ? "land" : "built",
            priceJmd,
            sizeqft: sqft,
            pricePerSqft: priceJmd / sqft,
          } as Listing);
        }
      }
    } catch (err) {
      console.warn(`[valuation-scraper] propertyads ${parish}:`, err);
    }
  }
  return listings;
}

/** Extract listings from Belfield Real Estate Jamaica */
async function scrapeBelfield(): Promise<Listing[]> {
  const listings: Listing[] = [];
  try {
    const html = await fetchHtml("https://www.belfieldeja.com/properties-for-sale?per_page=100");
    const jsonldMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of jsonldMatches) {
      try {
        const data = JSON.parse(m[1]);
        const items: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const price = (item.offers as Record<string, string>)?.price;
          const currency = ((item.offers as Record<string, string>)?.priceCurrency ?? "JMD").toUpperCase();
          const parish = (item.address as Record<string, string>)?.addressRegion ?? "";
          const size = (item.floorSize as Record<string, string>)?.value ?? (item.lotSize as Record<string, string>)?.value ?? "";
          const unit = (item.floorSize as Record<string, string>)?.unitCode ?? "SQFT";
          const p = normaliseParish(parish);
          if (!p || !price || !size) continue;
          const priceNum = parseFloat(String(price).replace(/,/g, ""));
          const priceJmd = currency === "USD" ? priceNum * JMD_PER_USD : priceNum;
          const sqft = toSqft(parseFloat(String(size)), unit);
          if (sqft && sqft > 0 && priceJmd > 100_000) {
            const isLand = /land|lot|plot/i.test(String(item.name ?? ""));
            listings.push({ parish: p, propType: isLand ? "land" : "built", priceJmd, sizeqft: sqft, pricePerSqft: priceJmd / sqft } as Listing);
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[valuation-scraper] belfield error:", err);
  }
  return listings;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Gather listings from all sources concurrently
  const [c21, propads, belfield] = await Promise.allSettled([
    scrapeCentury21(),
    scrapePropertyAds(),
    scrapeBelfield(),
  ]);

  const all: Listing[] = [
    ...(c21.status === "fulfilled" ? c21.value : []),
    ...(propads.status === "fulfilled" ? propads.value : []),
    ...(belfield.status === "fulfilled" ? belfield.value : []),
  ].filter((l) => l.pricePerSqft > 0 && l.pricePerSqft < 200_000);

  if (all.length === 0) {
    return NextResponse.json({ ok: false, message: "No listings extracted — scrapers returned 0 results", upserted: 0 });
  }

  // Group by (parish, propType)
  const grouped: Record<string, number[]> = {};
  for (const l of all) {
    const key = `${l.parish}||${l.propType}`;
    (grouped[key] = grouped[key] ?? []).push(l.pricePerSqft);
  }

  // Compute ranges and upsert
  let upserted = 0;
  for (const [key, rates] of Object.entries(grouped)) {
    if (rates.length < 2) continue; // need at least 2 data points
    const [parish, propType] = key.split("||");
    const sorted = [...rates].sort((a, b) => a - b);
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const med = median(sorted);

    const { error } = await supabase.from("valuation_benchmarks").upsert(
      {
        parish,
        prop_type: propType,
        rate_low: Math.round(p25),
        rate_high: Math.round(p75),
        median_per_sqft: Math.round(med),
        sample_count: rates.length,
        source: "listing-scraper",
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "parish,prop_type" },
    );
    if (!error) upserted++;
  }

  console.log(`[valuation-scraper] ${all.length} listings → ${upserted} parishes upserted`);
  return NextResponse.json({ ok: true, listings: all.length, upserted, scrapers: { c21: c21.status, propads: propads.status, belfield: belfield.status } });
}