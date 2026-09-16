import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// sq metre to sq ft conversion
const SQM_TO_SQFT = 10.7639;
// Fraction of total apartment price attributable to built area (vs embedded land value)
const BUILT_FRACTION = 0.62;
// Fraction attributable to land component
const LAND_FRACTION = 0.35;

interface NumbeoData {
  parish: string;
  centrePricePerSqm: number;   // JMD per sqm, city centre
  outsidePricePerSqm: number;  // JMD per sqm, outside centre
  sampleCount: number;
  contributors: number;
}

async function fetchNumbeo(city: string): Promise<{ centre: number; outside: number; samples: number; contributors: number } | null> {
  const url = `https://www.numbeo.com/property-investment/in/${city}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FergusonLaw/1.0; property research bot)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const centreM = html.match(/Price per Square Meter to Buy Apartment in City Centre\s*J\$([\d,]+\.[\d]+)/);
    const outsideM = html.match(/Price per Square Meter to Buy Apartment Outside of Centre\s*J\$([\d,]+\.[\d]+)/);
    const samplesM = html.match(/based on (\d+) entr(?:y|ies) from (\d+) contributor/);

    const centre = centreM ? parseFloat(centreM[1].replace(/,/g, "")) : 0;
    const outside = outsideM ? parseFloat(outsideM[1].replace(/,/g, "")) : centre * 0.72;
    const samples = samplesM ? parseInt(samplesM[1]) : 0;
    const contributors = samplesM ? parseInt(samplesM[2]) : 0;

    if (centre <= 0) return null;
    return { centre, outside, samples, contributors };
  } catch {
    return null;
  }
}

// Cities to query on Numbeo → map to canonical parish names
const NUMBEO_TARGETS = [
  { city: "Kingston-Jamaica",  parish: "Kingston & St. Andrew", minContributors: 5 },
  { city: "Mandeville-Jamaica", parish: "Manchester",           minContributors: 3 },
  { city: "Portmore-Jamaica",  parish: "St. Catherine",         minContributors: 3 },
  { city: "Montego-Bay",       parish: "St. James",             minContributors: 3 },
  { city: "Ocho-Rios",         parish: "St. Ann",               minContributors: 3 },
];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const upserted: string[] = [];
  const skipped: string[] = [];

  for (const target of NUMBEO_TARGETS) {
    const data = await fetchNumbeo(target.city);
    if (!data || data.contributors < target.minContributors) {
      skipped.push(`${target.parish} (contributors: ${data?.contributors ?? 0})`);
      continue;
    }

    // Convert Numbeo sqm price → sqft rate components
    const landRateLow  = Math.round((data.outside / SQM_TO_SQFT) * LAND_FRACTION);
    const landRateHigh = Math.round((data.centre  / SQM_TO_SQFT) * LAND_FRACTION);
    const builtRateLow  = Math.round((data.outside / SQM_TO_SQFT) * BUILT_FRACTION);
    const builtRateHigh = Math.round((data.centre  / SQM_TO_SQFT) * BUILT_FRACTION);

    const now = new Date().toISOString();

    const rows = [
      {
        parish: target.parish, prop_type: "land",
        rate_low: landRateLow, rate_high: landRateHigh,
        median_per_sqft: Math.round((landRateLow + landRateHigh) / 2),
        sample_count: data.samples, source: "numbeo", scraped_at: now,
      },
      {
        parish: target.parish, prop_type: "built",
        rate_low: builtRateLow, rate_high: builtRateHigh,
        median_per_sqft: Math.round((builtRateLow + builtRateHigh) / 2),
        sample_count: data.samples, source: "numbeo", scraped_at: now,
      },
    ];

    const { error } = await supabase
      .from("valuation_benchmarks")
      .upsert(rows, { onConflict: "parish,prop_type" });

    if (!error) upserted.push(target.parish);
    else console.error("[valuation-scraper] upsert error for", target.parish, error);
  }

  console.log(`[valuation-scraper] upserted=${upserted.join(",")} skipped=${skipped.join(",")}`);
  return NextResponse.json({ ok: true, upserted, skipped });
}