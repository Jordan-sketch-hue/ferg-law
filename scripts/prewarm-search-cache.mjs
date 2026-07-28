/**
 * Pre-warms the chat_search_cache table with common Jamaica property / NHT questions.
 * Run once: node scripts/prewarm-search-cache.mjs
 * Safe to re-run — skips queries already cached.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ciggiwpztuxkmbaccrlp.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY;

if (!SERVICE_KEY || !TAVILY_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY and TAVILY_API_KEY env vars.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const QUESTIONS = [
  // NHT
  "NHT benefit amount Jamaica 2025",
  "NHT loan interest rate Jamaica 2025",
  "NHT eligibility requirements Jamaica",
  "how to apply for NHT benefit Jamaica",
  "NHT open market benefit vs scheme housing Jamaica",
  "NHT mortgagor benefit Jamaica how to claim",
  "NHT portable benefit Jamaica diaspora",
  "NHT contributor years required Jamaica",
  // Costs & taxes
  "stamp duty rate Jamaica property transfer 2025",
  "transfer tax Jamaica property 2025",
  "registration duty Jamaica land title",
  "conveyancing legal fees Jamaica percentage",
  "property valuation cost Jamaica",
  "closing costs buying property Jamaica breakdown",
  // Process
  "how long does conveyancing take Jamaica",
  "agreement for sale Jamaica what to check",
  "title search Jamaica National Land Agency how long",
  "strata title Jamaica what is it",
  "what is a certificate of title Jamaica",
  // Diaspora & mortgage
  "diaspora buying property in Jamaica process",
  "can foreigners buy property in Jamaica",
  "Jamaica mortgage rates 2025",
  "NCB mortgage rate Jamaica 2025",
  "Scotia mortgage rate Jamaica 2025",
  // H.O.M.E. / Ferguson relevant
  "first time home buyer Jamaica requirements",
  "NHT first time buyer benefit Jamaica",
  "property survey cost Jamaica",
  "what documents needed to buy house in Jamaica",
  "power of attorney property purchase Jamaica",
];

const INCLUDED_DOMAINS = [
  "nhts.gov.jm", "jis.gov.jm", "mof.gov.jm",
  "jamaicalaw.gov.jm", "statin.gov.jm", "boj.org.jm",
];

async function tavilySearch(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      search_depth: "basic",
      max_results: 4,
      include_answer: true,
      include_domains: INCLUDED_DOMAINS,
    }),
  });
  const data = await res.json().catch(() => ({}));
  const answer = data.answer?.trim() || "";
  const snippets = (data.results ?? [])
    .slice(0, 3)
    .map((r) => `[${r.title}](${r.url}): ${r.content.slice(0, 300)}`)
    .join("\n\n");
  return [answer ? `Summary: ${answer}` : "", snippets]
    .filter(Boolean).join("\n\n") || null;
}

let saved = 0, skipped = 0, failed = 0;

for (const query of QUESTIONS) {
  const qn = query.toLowerCase().trim().replace(/\s+/g, " ");

  // Skip if already cached
  const { data: existing } = await sb
    .from("chat_search_cache")
    .select("id")
    .eq("query_normalized", qn)
    .maybeSingle();

  if (existing) {
    console.log(`  SKIP  ${query}`);
    skipped++;
    continue;
  }

  // Fetch from Tavily
  let result;
  try {
    result = await tavilySearch(query);
  } catch (e) {
    console.error(`  FAIL  ${query}:`, e.message);
    failed++;
    continue;
  }

  if (!result) {
    console.log(`  EMPTY ${query}`);
    failed++;
    continue;
  }

  // Save to cache
  const { error } = await sb.from("chat_search_cache").insert({
    query_normalized: qn,
    query,
    result,
    hit_count: 0,
  });

  if (error) {
    console.error(`  ERR   ${query}:`, error.message);
    failed++;
  } else {
    console.log(`  SAVED ${query}`);
    saved++;
  }

  // Respect Tavily rate limit
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\nDone. Saved: ${saved} | Skipped: ${skipped} | Failed: ${failed}`);
