"use client";
import { useEffect, useRef, useState } from "react";

const GOLD = "#c9a86a";
const DARK = "#10211c";
const JMD_PER_USD = 157;

// ── Types ─────────────────────────────────────────────────────────────────────
type PropType =
  | "house" | "townhouse" | "apartment" | "condominium"
  | "residential-land" | "commercial-land"
  | "commercial-building" | "mixed-use" | "other";
type Confidence = "high" | "moderate" | "low";

interface CommunityInfo {
  name: string;
  aliases?: string[];
  class: "urban" | "suburban" | "rural" | "resort" | "commercial" | "mixed";
  landMult: number;
  builtMult: number;
}

interface BenchmarkRow { parish: string; prop_type: "land" | "built"; rate_low: number; rate_high: number; scraped_at: string; }
type ParishRates = Record<string, { land: [number, number]; built: [number, number]; label: string }>;
interface CommunityRate { community: string; land: [number, number]; built: [number, number]; }
type CommunityMap = Record<string, CommunityRate[]>;

interface CalcResult {
  low: number; high: number; midJmd: number; midUsd: number;
  landLow: number; landHigh: number; builtLow: number; builtHigh: number;
  confidence: Confidence;
  dataLabel: string;
  factors: string[];
  missingFields: string[];
}

// ── Jamaica geographic dataset ────────────────────────────────────────────────
// landMult / builtMult = multiplier vs. parish baseline rate.
// Sources: Keez.com, Century 21 JA, RE/MAX JA listing data Sep 2026.
// These are indicative market-segment modifiers, not verified sale records.
const JAMAICA_GEOGRAPHY: Record<string, CommunityInfo[]> = {
  "Kingston & St. Andrew": [
    { name: "Norbrook",            class: "suburban",   landMult: 1.70, builtMult: 1.25 },
    { name: "Cherry Gardens",      class: "suburban",   landMult: 1.55, builtMult: 1.18 },
    { name: "New Kingston",        class: "commercial", landMult: 1.60, builtMult: 1.15, aliases: ["New Kgn"] },
    { name: "Jack's Hill",         class: "suburban",   landMult: 1.40, builtMult: 1.20, aliases: ["Jacks Hill"] },
    { name: "Liguanea",            class: "mixed",      landMult: 1.30, builtMult: 1.10 },
    { name: "Barbican",            class: "suburban",   landMult: 1.25, builtMult: 1.08 },
    { name: "Half Way Tree",       class: "mixed",      landMult: 1.20, builtMult: 1.02, aliases: ["HWT", "Half-Way Tree"] },
    { name: "Manor Park",          class: "suburban",   landMult: 1.20, builtMult: 1.05 },
    { name: "Constant Spring",     class: "suburban",   landMult: 1.05, builtMult: 1.00 },
    { name: "Havendale",           class: "suburban",   landMult: 1.00, builtMult: 1.00 },
    { name: "Mona",                class: "suburban",   landMult: 1.00, builtMult: 0.98 },
    { name: "Washington Gardens",  class: "suburban",   landMult: 0.95, builtMult: 0.98 },
    { name: "Meadowbrook",         class: "suburban",   landMult: 0.95, builtMult: 0.97 },
    { name: "Caledonia",           class: "suburban",   landMult: 0.92, builtMult: 0.94 },
    { name: "Papine",              class: "suburban",   landMult: 0.90, builtMult: 0.93 },
    { name: "Red Hills",           class: "suburban",   landMult: 1.00, builtMult: 0.80, aliases: ["Red Hill"] },
    { name: "Stony Hill",          class: "rural",      landMult: 1.51, builtMult: 0.51 },
    { name: "Duhaney Park",        class: "suburban",   landMult: 0.85, builtMult: 0.88 },
    { name: "Pembroke Hall",       class: "suburban",   landMult: 0.85, builtMult: 0.88 },
    { name: "Kingston (Downtown)", class: "urban",      landMult: 1.10, builtMult: 0.78, aliases: ["Downtown KGN", "Kingston Central"] },
    { name: "August Town",         class: "urban",      landMult: 0.75, builtMult: 0.80 },
  ],
  "St. Catherine": [
    { name: "Hellshire",    class: "resort",   landMult: 1.20, builtMult: 1.08 },
    { name: "Caymanas",     class: "suburban", landMult: 1.00, builtMult: 0.98, aliases: ["Caymanas Estate"] },
    { name: "Portmore",     class: "suburban", landMult: 0.90, builtMult: 0.92, aliases: ["Greater Portmore"] },
    { name: "Spanish Town", class: "urban",    landMult: 0.85, builtMult: 0.85, aliases: ["St. Jago de la Vega"] },
    { name: "Old Harbour",  class: "urban",    landMult: 0.82, builtMult: 0.87 },
    { name: "Waterford",    class: "suburban", landMult: 0.82, builtMult: 0.88 },
    { name: "Bridgeport",   class: "suburban", landMult: 0.82, builtMult: 0.88 },
    { name: "Linstead",     class: "urban",    landMult: 0.78, builtMult: 0.85 },
    { name: "Bog Walk",     class: "rural",    landMult: 0.70, builtMult: 0.80 },
    { name: "Ewarton",      class: "rural",    landMult: 0.65, builtMult: 0.78 },
  ],
  "St. James": [
    { name: "Ironshore",     class: "resort",   landMult: 2.25, builtMult: 0.97 },
    { name: "Rose Hall",     class: "resort",   landMult: 0.97, builtMult: 1.48 },
    { name: "Montego Bay",   class: "urban",    landMult: 0.90, builtMult: 0.84, aliases: ["MoBay"] },
    { name: "Fairview",      class: "suburban", landMult: 1.05, builtMult: 1.02 },
    { name: "Catherine Hall",class: "suburban", landMult: 0.95, builtMult: 0.95 },
    { name: "Bogue",         class: "mixed",    landMult: 0.95, builtMult: 0.95 },
    { name: "Reading",       class: "suburban", landMult: 0.90, builtMult: 0.95 },
    { name: "Lilliput",      class: "suburban", landMult: 0.88, builtMult: 0.90 },
    { name: "Granville",     class: "suburban", landMult: 0.85, builtMult: 0.90 },
    { name: "Spring Gardens",class: "suburban", landMult: 0.85, builtMult: 0.88 },
  ],
  "Manchester": [
    { name: "Mandeville",    class: "urban", landMult: 1.08, builtMult: 1.11 },
    { name: "Christiana",    class: "rural", landMult: 0.80, builtMult: 0.90 },
    { name: "Porus",         class: "rural", landMult: 0.78, builtMult: 0.88 },
    { name: "Spalding",      class: "rural", landMult: 0.75, builtMult: 0.88 },
    { name: "Newport",       class: "rural", landMult: 0.72, builtMult: 0.85 },
    { name: "Knockpatrick",  class: "rural", landMult: 0.70, builtMult: 0.82 },
  ],
  "Clarendon": [
    { name: "May Pen",    class: "urban",  landMult: 0.99, builtMult: 0.94 },
    { name: "Rocky Point",class: "resort", landMult: 0.90, builtMult: 0.88 },
    { name: "Lionel Town",class: "rural",  landMult: 0.75, builtMult: 0.85 },
    { name: "Chapelton",  class: "rural",  landMult: 0.72, builtMult: 0.83 },
    { name: "Hayes",      class: "rural",  landMult: 0.70, builtMult: 0.82 },
    { name: "Frankfield", class: "rural",  landMult: 0.68, builtMult: 0.80 },
  ],
  "St. Elizabeth": [
    { name: "Treasure Beach", class: "resort", landMult: 1.25, builtMult: 1.12 },
    { name: "Santa Cruz",     class: "urban",  landMult: 1.21, builtMult: 1.03 },
    { name: "Black River",    class: "urban",  landMult: 2.00, builtMult: 0.55, aliases: ["Black River Town"] },
    { name: "Junction",       class: "rural",  landMult: 0.78, builtMult: 0.85 },
    { name: "Southfield",     class: "rural",  landMult: 0.72, builtMult: 0.82 },
    { name: "Balaclava",      class: "rural",  landMult: 0.70, builtMult: 0.80 },
  ],
  "Westmoreland": [
    { name: "Negril",         class: "resort", landMult: 1.06, builtMult: 1.12, aliases: ["Negril Beach"] },
    { name: "Whitehouse",     class: "resort", landMult: 1.12, builtMult: 1.02 },
    { name: "Savanna-la-Mar", class: "urban",  landMult: 1.00, builtMult: 0.98, aliases: ["Sav-la-Mar", "Savanna La Mar"] },
    { name: "Little London",  class: "rural",  landMult: 0.75, builtMult: 0.85 },
    { name: "Petersfield",    class: "rural",  landMult: 0.72, builtMult: 0.85 },
    { name: "Frome",          class: "rural",  landMult: 0.68, builtMult: 0.82 },
  ],
  "Hanover": [
    { name: "Lucea",      class: "urban",  landMult: 2.73, builtMult: 1.02 },
    { name: "Hopewell",   class: "resort", landMult: 0.92, builtMult: 0.55 },
    { name: "Green Island",class: "rural", landMult: 0.90, builtMult: 0.92 },
    { name: "Sandy Bay",  class: "rural",  landMult: 0.80, builtMult: 0.88 },
    { name: "Cascade",    class: "rural",  landMult: 0.72, builtMult: 0.85 },
  ],
  "Trelawny": [
    { name: "Falmouth",     class: "urban",  landMult: 0.73, builtMult: 1.02, aliases: ["Falmouth Town"] },
    { name: "Rio Bueno",    class: "resort", landMult: 0.95, builtMult: 0.92 },
    { name: "Duncans",      class: "rural",  landMult: 0.80, builtMult: 0.88 },
    { name: "Clark's Town", class: "rural",  landMult: 0.72, builtMult: 0.83, aliases: ["Clarks Town"] },
    { name: "Wakefield",    class: "rural",  landMult: 0.68, builtMult: 0.80 },
  ],
  "St. Ann": [
    { name: "Ocho Rios",    class: "resort",   landMult: 1.38, builtMult: 1.20, aliases: ["Ocho"] },
    { name: "Drax Hall",    class: "suburban", landMult: 1.22, builtMult: 1.12 },
    { name: "Discovery Bay",class: "resort",   landMult: 1.25, builtMult: 0.92 },
    { name: "Runaway Bay",  class: "resort",   landMult: 0.45, builtMult: 0.94 },
    { name: "St. Ann's Bay",class: "urban",    landMult: 1.00, builtMult: 0.98, aliases: ["St Anns Bay"] },
    { name: "Priory",       class: "rural",    landMult: 0.85, builtMult: 0.90 },
    { name: "Brown's Town", class: "rural",    landMult: 0.78, builtMult: 0.88, aliases: ["Browns Town"] },
    { name: "Claremont",    class: "rural",    landMult: 0.70, builtMult: 0.82 },
  ],
  "St. Mary": [
    { name: "Tower Isle",  class: "resort", landMult: 1.11, builtMult: 1.35, aliases: ["Towerisle"] },
    { name: "Oracabessa", class: "resort", landMult: 0.69, builtMult: 0.80 },
    { name: "Port Maria",  class: "urban",  landMult: 1.00, builtMult: 0.98 },
    { name: "Annotto Bay", class: "rural",  landMult: 0.78, builtMult: 0.85 },
    { name: "Highgate",    class: "rural",  landMult: 0.72, builtMult: 0.83 },
    { name: "Castleton",   class: "rural",  landMult: 0.70, builtMult: 0.82 },
  ],
  "Portland": [
    { name: "Port Antonio", class: "resort", landMult: 0.77, builtMult: 1.03, aliases: ["Port Antonio Town"] },
    { name: "Long Bay",     class: "resort", landMult: 0.98, builtMult: 0.92 },
    { name: "Boston Bay",   class: "resort", landMult: 0.97, builtMult: 0.92, aliases: ["Boston"] },
    { name: "Fairy Hill",   class: "rural",  landMult: 0.80, builtMult: 0.88 },
    { name: "Buff Bay",     class: "rural",  landMult: 0.78, builtMult: 0.88 },
    { name: "Hope Bay",     class: "rural",  landMult: 0.75, builtMult: 0.85 },
  ],
  "St. Thomas": [
    { name: "Morant Bay",  class: "urban", landMult: 1.08, builtMult: 1.01 },
    { name: "Yallahs",     class: "rural", landMult: 0.85, builtMult: 0.85 },
    { name: "Port Morant", class: "rural", landMult: 0.78, builtMult: 0.87 },
    { name: "Seaforth",    class: "rural", landMult: 0.72, builtMult: 0.83 },
    { name: "Bath",        class: "rural", landMult: 0.68, builtMult: 0.80 },
  ],
};

// ── Parish baseline rates (JMD per sq ft) ────────────────────────────────────
// Calibrated from 970 Keez.com listings Oct 2026 (5 pages per parish).
// Range = median ± ~40%; reflects asking prices, not recorded sales.
const FALLBACK_PARISHES: ParishRates = {
  "Kingston & St. Andrew": { land: [ 600, 1500], built: [21000, 42000], label: "Kingston & St. Andrew" },
  "St. James":             { land: [1500, 3500], built: [20000, 42000], label: "St. James" },
  "St. Catherine":         { land: [ 350,  800], built: [10000, 21000], label: "St. Catherine" },
  "Manchester":            { land: [ 550, 1400], built: [ 8000, 16000], label: "Manchester" },
  "Clarendon":             { land: [ 400,  900], built: [ 7000, 14000], label: "Clarendon" },
  "St. Elizabeth":         { land: [ 500, 1200], built: [ 8000, 16000], label: "St. Elizabeth" },
  "Trelawny":              { land: [1000, 2400], built: [20000, 40000], label: "Trelawny" },
  "St. Ann":               { land: [2100, 5200], built: [30000, 58000], label: "St. Ann" },
  "St. Mary":              { land: [ 950, 2500], built: [21000, 42000], label: "St. Mary" },
  "Portland":              { land: [ 430, 1050], built: [33000, 66000], label: "Portland" },
  "St. Thomas":            { land: [ 520, 1300], built: [ 9000, 19000], label: "St. Thomas" },
  "Westmoreland":          { land: [1000, 2600], built: [23000, 48000], label: "Westmoreland" },
  "Hanover":               { land: [ 480, 1200], built: [24000, 48000], label: "Hanover" },
};

// ── Multiplier tables ────────────────────────────────────────────────────────
const CONDITION_MULT:  Record<string, number> = { excellent: 1.15, good: 1.0,  fair: 0.85, poor: 0.70 };
const FITTINGS_MULT:   Record<string, number> = { luxury: 1.12, standard: 1.0, basic: 0.88, unfinished: 0.72 };
const CONSTR_MULT:     Record<string, number> = { concrete: 1.0, steel: 1.05,  wood: 0.85 };
const AMENITY_BONUS:   Record<string, number> = { pool: 0.08, garage: 0.05, parking: 0.03, solar: 0.04, generator: 0.03 };
const TITLE_MULT:      Record<string, number> = { registered: 1.0, strata: 0.98, deed: 0.95, "in-progress": 0.88, unknown: 0.93 };
const ACCESS_MULT:     Record<string, number> = { paved: 1.0, dirt: 0.88, none: 0.72 };
const UTILITIES_MULT:  Record<string, number> = { both: 1.0, electricity: 0.88, none: 0.70 };
const TERRAIN_MULT:    Record<string, number> = { flat: 1.0, gentle: 0.94, steep: 0.78, waterfront: 1.35 };
const ZONING_MULT:     Record<string, number> = { commercial: 1.35, mixed: 1.15, residential: 1.0, agricultural: 0.65 };
const BUILT_TYPE_MULT: Record<string, number> = {
  house: 1.0, townhouse: 0.92, apartment: 0.82, condominium: 0.88,
  "commercial-building": 1.25, "mixed-use": 1.10, other: 1.0,
};

// ── Unit conversion to sq ft ─────────────────────────────────────────────────
function toSqFt(value: number, unit: string): number {
  if (unit === "sqft")    return value;
  if (unit === "sqm")     return value * 10.7639;
  if (unit === "acres")   return value * 43560;
  if (unit === "perches") return value * 272.25;
  return value;
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function fmt(n: number) { return new Intl.NumberFormat("en-JM").format(Math.round(n)); }
function fmtM(n: number) {
  if (n >= 1_000_000) return `J$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `J$${Math.round(n / 1000)}k`;
  return `J$${Math.round(n)}`;
}
function fmtRounded(n: number) {
  return new Intl.NumberFormat("en-JM").format(
    n >= 1_000_000 ? Math.round(n / 1_000_000) * 1_000_000 : Math.round(n / 1000) * 1000
  );
}
function fmtInput(raw: string) {
  const digits = raw.replace(/,/g, "");
  if (!digits || isNaN(Number(digits))) return raw;
  return new Intl.NumberFormat("en-JM").format(Number(digits));
}
function parseNum(formatted: string): number { return parseFloat(formatted.replace(/,/g, "")) || 0; }

// ── Data fetchers ─────────────────────────────────────────────────────────────
async function fetchLiveRates(): Promise<{ rates: ParishRates; lastUpdated: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { rates: FALLBACK_PARISHES, lastUpdated: null };
  try {
    const res = await fetch(
      `${url}/rest/v1/valuation_benchmarks?select=parish,prop_type,rate_low,rate_high,scraped_at&order=scraped_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!res.ok) return { rates: FALLBACK_PARISHES, lastUpdated: null };
    const rows: BenchmarkRow[] = await res.json();
    if (!rows.length) return { rates: FALLBACK_PARISHES, lastUpdated: null };
    const merged: Record<string, Partial<{ land: [number, number]; built: [number, number]; scraped_at: string }>> = {};
    for (const row of rows) {
      if (!merged[row.parish]) merged[row.parish] = { scraped_at: row.scraped_at };
      merged[row.parish][row.prop_type] = [row.rate_low, row.rate_high];
    }
    const rates: ParishRates = {};
    for (const [parish, data] of Object.entries(merged)) {
      const land  = data.land  ?? FALLBACK_PARISHES[parish]?.land  ?? [2000, 8000];
      const built = data.built ?? FALLBACK_PARISHES[parish]?.built ?? [8000, 16000];
      rates[parish] = { land, built, label: parish };
    }
    for (const [parish, fb] of Object.entries(FALLBACK_PARISHES)) {
      if (!rates[parish]) rates[parish] = fb;
    }
    return { rates, lastUpdated: rows[0]?.scraped_at ?? null };
  } catch { return { rates: FALLBACK_PARISHES, lastUpdated: null }; }
}

async function fetchCommunities(): Promise<CommunityMap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};
  try {
    const res = await fetch(
      `${url}/rest/v1/community_benchmarks?select=parish,community,prop_type,rate_low,rate_high&order=parish,community`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!res.ok) return {};
    const rows: { parish: string; community: string; prop_type: string; rate_low: number; rate_high: number }[] = await res.json();
    const map: CommunityMap = {};
    for (const row of rows) {
      if (!map[row.parish]) map[row.parish] = [];
      const existing = map[row.parish].find(c => c.community === row.community);
      if (existing) {
        if (row.prop_type === "land") existing.land = [row.rate_low, row.rate_high];
        else existing.built = [row.rate_low, row.rate_high];
      } else {
        map[row.parish].push({
          community: row.community,
          land:  row.prop_type === "land"  ? [row.rate_low, row.rate_high] : [0, 0],
          built: row.prop_type === "built" ? [row.rate_low, row.rate_high] : [0, 0],
        });
      }
    }
    return map;
  } catch { return {}; }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ValuationEstimatorClient() {
  // Location
  const [parish,   setParish]   = useState("Kingston & St. Andrew");
  const [community,setCommunity]= useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Property type & condition
  const [propType,   setPropType]  = useState<PropType>("house");
  const [condition,  setCondition] = useState("good");
  const [titleStatus,setTitle]     = useState("registered");

  // Areas
  const [landDisplay, setLandDisplay] = useState("");
  const [landUnit,    setLandUnit]    = useState("sqft");
  const [builtDisplay,setBuiltDisplay]= useState("");
  const [builtUnit,   setBuiltUnit]   = useState("sqft");

  // Built details
  const [bedrooms,   setBedrooms]  = useState("3");
  const [bathrooms,  setBathrooms] = useState("2");
  const [construction,setConstr]   = useState("concrete");
  const [yearBuilt,  setYearBuilt] = useState("");
  const [fittings,   setFittings]  = useState("standard");
  const [amenities,  setAmenities] = useState<string[]>([]);

  // Land details
  const [roadAccess,setAccess]    = useState("paved");
  const [utilities, setUtil]      = useState("both");
  const [terrain,   setTerrain]   = useState("flat");
  const [zoning,    setZoning]    = useState("residential");

  // Optional
  const [nlaRef,    setNlaRef]    = useState("");

  // Data
  const [parishes,     setParishes]     = useState<ParishRates>(FALLBACK_PARISHES);
  const [lastUpdated,  setLastUpdated]  = useState<string | null>(null);
  const [dataSource,   setDataSource]   = useState<"live" | "fallback">("fallback");
  const [communityMap, setCommunityMap] = useState<CommunityMap>({});

  // Result
  const [result,    setResult]    = useState<CalcResult | null>(null);
  const [formError, setFormError] = useState("");

  const isLand = propType === "residential-land" || propType === "commercial-land";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    fetchLiveRates().then(({ rates, lastUpdated: lu }) => {
      setParishes(rates);
      setLastUpdated(lu);
      setDataSource(lu ? "live" : "fallback");
    });
    fetchCommunities().then(setCommunityMap);
  }, []);

  // Community list for current parish (inline dataset + any extra DB entries)
  const parishCommunities = JAMAICA_GEOGRAPHY[parish] ?? [];
  const dbCommunityNames  = (communityMap[parish] ?? []).map(c => c.community);
  const allNames = [
    ...parishCommunities.map(c => c.name),
    ...dbCommunityNames.filter(n => !parishCommunities.some(p => p.name === n)),
  ];
  const filteredNames = communitySearch.trim()
    ? parishCommunities
        .filter(c =>
          c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
          (c.aliases ?? []).some(a => a.toLowerCase().includes(communitySearch.toLowerCase()))
        )
        .map(c => c.name)
    : allNames;

  function selectCommunity(name: string) {
    setCommunity(name);
    setCommunitySearch(name);
    setDropOpen(false);
    setResult(null);
  }

  function clearCommunity() {
    setCommunity("");
    setCommunitySearch("");
    setResult(null);
  }

  function handleLandInput(val: string) {
    const raw = val.replace(/,/g, "");
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setLandDisplay(raw ? fmtInput(raw) : "");
      setResult(null);
    }
  }

  function handleBuiltInput(val: string) {
    const raw = val.replace(/,/g, "");
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setBuiltDisplay(raw ? fmtInput(raw) : "");
      setResult(null);
    }
  }

  function toggleAmenity(key: string) {
    setAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
    setResult(null);
  }

  function calculate() {
    const landSqFt = toSqFt(parseNum(landDisplay), landUnit);
    if (!landSqFt) { setFormError("Please enter a land area to continue."); return; }
    setFormError("");

    // ── Determine base rates ─────────────────────────────────────────────────
    const dbCommunityRate = communityMap[parish]?.find(c => c.community === community);
    const localCommunity  = parishCommunities.find(c => c.name === community);
    const parishBase      = parishes[parish] ?? FALLBACK_PARISHES[parish] ?? { land: [2000,8000], built: [8000,16000] };

    let landBase: [number, number];
    let builtBase: [number, number];
    let confidence: Confidence;
    let dataLabel: string;

    if (dbCommunityRate && community && community !== "Other / not listed") {
      // DB community rate — highest fidelity
      landBase  = dbCommunityRate.land[0]  > 0 ? dbCommunityRate.land  : parishBase.land;
      builtBase = dbCommunityRate.built[0] > 0 ? dbCommunityRate.built : parishBase.built;
      confidence = "high";
      dataLabel  = `Verified data · ${community}`;
    } else if (localCommunity && community && community !== "Other / not listed") {
      // Inline community multiplier applied to parish base
      landBase  = [parishBase.land[0]  * localCommunity.landMult,  parishBase.land[1]  * localCommunity.landMult]  as [number, number];
      builtBase = [parishBase.built[0] * localCommunity.builtMult, parishBase.built[1] * localCommunity.builtMult] as [number, number];
      confidence = dataSource === "live" ? "moderate" : "low";
      dataLabel  = dataSource === "live"
        ? `Market data · ${community}`
        : `Estimated · ${community}`;
    } else {
      landBase  = parishBase.land;
      builtBase = parishBase.built;
      confidence = dataSource === "live" ? "moderate" : "low";
      dataLabel  = dataSource === "live"
        ? `Market data · ${parish}`
        : `Estimates · ${parish}`;
    }

    // ── Multipliers ──────────────────────────────────────────────────────────
    const condMult  = CONDITION_MULT[condition] ?? 1;
    const titleMult = TITLE_MULT[titleStatus]   ?? 1;
    const factors: string[] = [];

    if (condition !== "good")      factors.push(`Condition: ${condition} (×${condMult.toFixed(2)})`);
    if (titleStatus !== "registered") factors.push(`Title: ${titleStatus} (×${titleMult.toFixed(2)})`);

    let landMult  = condMult * titleMult;
    let builtMult = condMult * titleMult;

    if (isLand) {
      const am = ACCESS_MULT[roadAccess]  ?? 1;
      const um = UTILITIES_MULT[utilities] ?? 1;
      const tm = TERRAIN_MULT[terrain]    ?? 1;
      const zm = ZONING_MULT[zoning]      ?? 1;
      landMult *= am * um * tm * zm;
      if (roadAccess !== "paved")       factors.push(`Road: ${roadAccess} (×${am.toFixed(2)})`);
      if (utilities  !== "both")        factors.push(`Utilities: ${utilities} (×${um.toFixed(2)})`);
      if (terrain    !== "flat")        factors.push(`Terrain: ${terrain} (×${tm.toFixed(2)})`);
      if (zoning     !== "residential") factors.push(`Zoning: ${zoning} (×${zm.toFixed(2)})`);
    } else {
      const builtSqFt   = toSqFt(parseNum(builtDisplay), builtUnit);
      const fittM       = FITTINGS_MULT[fittings]   ?? 1;
      const constrM     = CONSTR_MULT[construction]  ?? 1;
      const typeM       = BUILT_TYPE_MULT[propType]  ?? 1;
      const beds        = parseInt(bedrooms)  || 3;
      const baths       = parseInt(bathrooms) || 2;
      const bedroomM    = 1 + Math.max(0, beds  - 3) * 0.03;
      const bathroomM   = 1 + Math.max(0, baths - 2) * 0.02;
      const amenityM    = 1 + amenities.reduce((s, a) => s + (AMENITY_BONUS[a] ?? 0), 0);
      let   ageM        = 1.0;
      const yr          = parseInt(yearBuilt);
      if (yr > 1900) {
        const age = new Date().getFullYear() - yr;
        if (age >= 60) ageM = 0.80;
        else if (age >= 40) ageM = 0.88;
        else if (age >= 20) ageM = 0.95;
        if (ageM < 1) factors.push(`Age: ${age}yr (×${ageM.toFixed(2)})`);
      }
      builtMult *= fittM * constrM * typeM * bedroomM * bathroomM * amenityM * ageM;
      if (fittings !== "standard") factors.push(`Fittings: ${fittings} (×${fittM.toFixed(2)})`);
      if (construction !== "concrete") factors.push(`Construction: ${construction} (×${constrM.toFixed(2)})`);
      if (typeM !== 1)  factors.push(`Type: ${propType} (×${typeM.toFixed(2)})`);
      if (amenities.length) factors.push(`Amenities: ${amenities.join(", ")} (+${((amenityM - 1) * 100).toFixed(0)}%)`);
    }

    // ── Calculate land & built components ────────────────────────────────────
    const builtSqFt = isLand ? 0 : toSqFt(parseNum(builtDisplay), builtUnit);
    const landLow   = landBase[0]  * landSqFt  * landMult;
    const landHigh  = landBase[1]  * landSqFt  * landMult;
    const builtLow  = builtSqFt > 0 ? builtBase[0] * builtSqFt * builtMult : 0;
    const builtHigh = builtSqFt > 0 ? builtBase[1] * builtSqFt * builtMult : 0;
    const low       = landLow + builtLow;
    const high      = landHigh + builtHigh;
    const midJmd    = (low + high) / 2;

    // ── Missing fields that would improve accuracy ───────────────────────────
    const missingFields: string[] = [];
    if (!community || community === "Other / not listed") missingFields.push("Community or scheme name");
    if (!isLand && !parseNum(builtDisplay)) missingFields.push("Built / floor area");
    if (!isLand && !yearBuilt) missingFields.push("Year of construction");
    if (titleStatus === "unknown") missingFields.push("Title documentation type");

    setResult({ low, high, midJmd, midUsd: midJmd / JMD_PER_USD, landLow, landHigh, builtLow, builtHigh, confidence, dataLabel, factors, missingFields });
  }

  function downloadCSV() {
    if (!result) return;
    const rows = [
      ["Field", "Value"],
      ["Parish", parish],
      ["Community", community || "Not specified"],
      ["Property Type", propType],
      ["Condition", condition],
      ["Title Status", titleStatus],
      ["Land Area", `${landDisplay} ${landUnit}`],
      ...(!isLand ? [["Built Area", `${builtDisplay} ${builtUnit}`]] : []),
      ...(!isLand ? [["Bedrooms", bedrooms], ["Bathrooms", bathrooms], ["Year Built", yearBuilt || "N/A"], ["Construction", construction], ["Fittings", fittings]] : []),
      ...(isLand  ? [["Road Access", roadAccess], ["Utilities", utilities], ["Terrain", terrain], ["Zoning", zoning]] : []),
      ["NLA / Reference", nlaRef || "N/A"],
      ["Estimate Low (JMD)", Math.round(result.low)],
      ["Estimate High (JMD)", Math.round(result.high)],
      ["Midpoint (JMD)", Math.round(result.midJmd)],
      ["Midpoint (USD)", Math.round(result.midUsd)],
      ["Confidence", result.confidence],
      ["Data Source", result.dataLabel],
      ["Generated", new Date().toLocaleDateString("en-JM", { year: "numeric", month: "short", day: "numeric" })],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `valuation-estimate-${parish.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`; a.click();
  }

  const parishList     = Object.keys(parishes).sort();
  const formattedDate  = lastUpdated ? new Date(lastUpdated).toLocaleDateString("en-JM", { year: "numeric", month: "short", day: "numeric" }) : null;
  const confidenceInfo: Record<Confidence, { label: string; color: string; bg: string; note: string }> = {
    high:     { label: "HIGH",     color: "#2d7a4a", bg: "#e8f4ec", note: "Verified community-level market data" },
    moderate: { label: "MODERATE", color: "#7a5f10", bg: "#fdf5e0", note: "Parish market data with community adjustment" },
    low:      { label: "LOW",      color: "#8b3a3a", bg: "#fdecea", note: "Indicative only — add community details to improve accuracy" },
  };

  return (
    <>
      <style>{`
        .amenity-chip { cursor:pointer; padding:.35rem .75rem; border-radius:20px; font-size:.78rem; font-weight:600; transition:background .15s,color .15s; user-select:none; }
        .amenity-chip.on  { background:#c9a86a; color:#fff; border:1px solid #c9a86a; }
        .amenity-chip.off { background:#fff; color:#6b7a6e; border:1px solid #d5cfc4; }
        .comm-drop { position:absolute; z-index:100; top:calc(100% + 2px); left:0; right:0; background:#fff; border:1px solid #d5cfc4; border-radius:6px; max-height:220px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,.1); }
        .comm-drop li { padding:.55rem .75rem; font-size:.88rem; cursor:pointer; list-style:none; color:#10211c; }
        .comm-drop li:hover { background:#f5f0e8; }
        @media print { body>*{display:none!important} .val-print-block{display:block!important} .val-print-block *{display:revert!important} }
      `}</style>

      <div className="val-print-block" style={{ maxWidth: 720, margin: "0 auto", padding: "0 1rem 4rem" }}>
        <div style={{ background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "1.75rem", boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span style={{ fontWeight: 600, fontSize: ".9rem", color: DARK }}>Property Details</span>
            <span style={{ marginLeft: "auto", fontSize: ".72rem", color: "#9aaa9e" }}>All 14 parishes</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            {/* Parish */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Parish <span style={{ color: "#e05" }}>*</span></label>
              <select value={parish} onChange={e => { setParish(e.target.value); clearCommunity(); setResult(null); }} style={selectStyle}>
                {parishList.map(p => <option key={p} value={p}>{parishes[p].label}</option>)}
              </select>
            </div>

            {/* Community searchable combobox */}
            <div style={{ gridColumn: "1/-1", position: "relative" }} ref={dropRef}>
              <label style={labelStyle}>
                Community / Scheme
                <span style={{ color: "#9aaa9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}> (optional — improves accuracy)</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder={`Search communities in ${parish}…`}
                  value={communitySearch}
                  onChange={e => { setCommunitySearch(e.target.value); setCommunity(""); setDropOpen(true); setResult(null); }}
                  onFocus={() => setDropOpen(true)}
                  style={{ ...inputStyle, paddingRight: "2.2rem" }}
                  autoComplete="off"
                />
                {communitySearch && (
                  <button onClick={clearCommunity} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9aaa9e", fontSize: "1rem", lineHeight: 1 }}>×</button>
                )}
              </div>
              {dropOpen && filteredNames.length > 0 && (
                <ul className="comm-drop" style={{ margin: 0, padding: 0 }}>
                  {filteredNames.map(name => {
                    const info = parishCommunities.find(c => c.name === name);
                    const hasDB = (communityMap[parish] ?? []).some(c => c.community === name);
                    return (
                      <li key={name} onMouseDown={() => selectCommunity(name)}>
                        <span>{name}</span>
                        {info && <span style={{ marginLeft: 6, fontSize: ".72rem", color: "#9aaa9e" }}>{info.class}</span>}
                        {hasDB && <span style={{ marginLeft: 6, fontSize: ".68rem", fontWeight: 700, color: "#2d7a4a" }}>verified</span>}
                      </li>
                    );
                  })}
                  <li style={{ color: "#9aaa9e", fontStyle: "italic" }} onMouseDown={() => selectCommunity("Other / not listed")}>Other / not listed</li>
                </ul>
              )}
            </div>

            {/* Property Type */}
            <div>
              <label style={labelStyle}>Property Type <span style={{ color: "#e05" }}>*</span></label>
              <select value={propType} onChange={e => { setPropType(e.target.value as PropType); setResult(null); }} style={selectStyle}>
                <option value="house">House / Villa</option>
                <option value="townhouse">Townhouse</option>
                <option value="apartment">Apartment</option>
                <option value="condominium">Condominium</option>
                <option value="residential-land">Residential Land</option>
                <option value="commercial-land">Commercial Land</option>
                <option value="commercial-building">Commercial Building</option>
                <option value="mixed-use">Mixed-Use Property</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Overall Condition */}
            <div>
              <label style={labelStyle}>Overall Condition</label>
              <select value={condition} onChange={e => { setCondition(e.target.value); setResult(null); }} style={selectStyle}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor / Needs work</option>
              </select>
            </div>

            {/* Land Area */}
            <div>
              <label style={labelStyle}>Land Area <span style={{ color: "#e05" }}>*</span></label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input type="text" inputMode="numeric" placeholder="e.g. 6,000" value={landDisplay} onChange={e => handleLandInput(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <select value={landUnit} onChange={e => { setLandUnit(e.target.value); setResult(null); }} style={{ ...selectStyle, width: "auto", minWidth: 85, flex: "0 0 auto" }}>
                  <option value="sqft">sq ft</option>
                  <option value="sqm">sq m</option>
                  <option value="acres">acres</option>
                  <option value="perches">perches</option>
                </select>
              </div>
            </div>

            {/* Built Area (hidden for land) */}
            {!isLand && (
              <div>
                <label style={labelStyle}>Built / Floor Area</label>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input type="text" inputMode="numeric" placeholder="e.g. 1,800" value={builtDisplay} onChange={e => handleBuiltInput(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <select value={builtUnit} onChange={e => { setBuiltUnit(e.target.value); setResult(null); }} style={{ ...selectStyle, width: "auto", minWidth: 85, flex: "0 0 auto" }}>
                    <option value="sqft">sq ft</option>
                    <option value="sqm">sq m</option>
                  </select>
                </div>
              </div>
            )}

            {/* Bedrooms & Bathrooms */}
            {!isLand && (<>
              <div>
                <label style={labelStyle}>Bedrooms</label>
                <select value={bedrooms} onChange={e => { setBedrooms(e.target.value); setResult(null); }} style={selectStyle}>
                  {["1","2","3","4","5","6"].map(v => <option key={v} value={v}>{v === "6" ? "6+" : v}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Bathrooms</label>
                <select value={bathrooms} onChange={e => { setBathrooms(e.target.value); setResult(null); }} style={selectStyle}>
                  {["1","2","3","4","5"].map(v => <option key={v} value={v}>{v === "5" ? "5+" : v}</option>)}
                </select>
              </div>
            </>)}

            {/* Construction & Fittings */}
            {!isLand && (<>
              <div>
                <label style={labelStyle}>Construction</label>
                <select value={construction} onChange={e => { setConstr(e.target.value); setResult(null); }} style={selectStyle}>
                  <option value="concrete">Concrete / Block</option>
                  <option value="steel">Steel Frame</option>
                  <option value="wood">Wood Frame</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Condition of Fittings</label>
                <select value={fittings} onChange={e => { setFittings(e.target.value); setResult(null); }} style={selectStyle}>
                  <option value="luxury">Luxury</option>
                  <option value="standard">Standard</option>
                  <option value="basic">Basic</option>
                  <option value="unfinished">Unfinished</option>
                </select>
              </div>
            </>)}

            {/* Year Built */}
            {!isLand && (
              <div>
                <label style={labelStyle}>Year Built <span style={{ color: "#9aaa9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <input type="text" inputMode="numeric" placeholder="e.g. 2005" value={yearBuilt} maxLength={4}
                  onChange={e => { setYearBuilt(e.target.value.replace(/\D/g, "").slice(0, 4)); setResult(null); }} style={inputStyle} />
              </div>
            )}

            {/* Land-specific fields */}
            {isLand && (<>
              <div>
                <label style={labelStyle}>Road Access</label>
                <select value={roadAccess} onChange={e => { setAccess(e.target.value); setResult(null); }} style={selectStyle}>
                  <option value="paved">Paved road</option>
                  <option value="dirt">Dirt / track road</option>
                  <option value="none">No direct access</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Utilities</label>
                <select value={utilities} onChange={e => { setUtil(e.target.value); setResult(null); }} style={selectStyle}>
                  <option value="both">Water & electricity</option>
                  <option value="electricity">Electricity only</option>
                  <option value="none">No utilities</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Terrain</label>
                <select value={terrain} onChange={e => { setTerrain(e.target.value); setResult(null); }} style={selectStyle}>
                  <option value="flat">Flat / level</option>
                  <option value="gentle">Gentle slope</option>
                  <option value="steep">Steep / hillside</option>
                  <option value="waterfront">Waterfront / coastal</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Zoning / Development</label>
                <select value={zoning} onChange={e => { setZoning(e.target.value); setResult(null); }} style={selectStyle}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed-use</option>
                  <option value="agricultural">Agricultural</option>
                </select>
              </div>
            </>)}

            {/* Title Status */}
            <div>
              <label style={labelStyle}>Title Status <span style={{ color: "#9aaa9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <select value={titleStatus} onChange={e => { setTitle(e.target.value); setResult(null); }} style={selectStyle}>
                <option value="registered">Registered title</option>
                <option value="strata">Strata title</option>
                <option value="deed">Deed only</option>
                <option value="in-progress">Title in progress</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            {/* NLA Reference */}
            <div>
              <label style={labelStyle}>NLA / Property Reference <span style={{ color: "#9aaa9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input type="text" placeholder="e.g. 1234/567/89" value={nlaRef} onChange={e => setNlaRef(e.target.value)} style={inputStyle} />
            </div>

          </div>

          {/* Amenities */}
          {!isLand && (
            <div style={{ marginTop: "1rem" }}>
              <label style={{ ...labelStyle, marginBottom: 10 }}>Amenities</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {(["pool", "garage", "parking", "solar", "generator"] as const).map(key => (
                  <button key={key} type="button" onClick={() => toggleAmenity(key)} className={`amenity-chip ${amenities.includes(key) ? "on" : "off"}`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}{amenities.includes(key) && ` +${(AMENITY_BONUS[key] * 100).toFixed(0)}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formError && <p style={{ marginTop: ".75rem", color: "#8b3a3a", fontSize: ".82rem", fontWeight: 600 }}>{formError}</p>}

          <button onClick={calculate} style={{ marginTop: "1.5rem", width: "100%", padding: "0.85rem", background: GOLD, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "1rem", cursor: "pointer", letterSpacing: ".03em" }}>
            Estimate Value
          </button>

          {/* ── Result ─────────────────────────────────────────────────────── */}
          {result && (() => {
            const ci = confidenceInfo[result.confidence];
            return (
              <div id="val-result" style={{ marginTop: "1.5rem", padding: "1.4rem", background: "#f5f0e8", borderRadius: 10, borderLeft: `4px solid ${GOLD}` }}>

                {/* Value range */}
                <p style={{ margin: "0 0 .2rem", fontSize: ".75rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GOLD }}>Estimated Market Value</p>
                <p style={{ margin: "0 0 .4rem", fontSize: "1.55rem", fontWeight: 700, color: DARK, lineHeight: 1.2 }}>
                  J${fmtRounded(result.low)} &ndash; J${fmtRounded(result.high)}
                </p>
                <p style={{ margin: 0, fontSize: ".88rem", color: "#6b7a6e" }}>
                  Midpoint: approx. J${fmtRounded(result.midJmd)}&nbsp;&middot;&nbsp;US${fmt(result.midUsd)}
                </p>

                {/* Land / Built split (if both present) */}
                {!isLand && result.builtLow > 0 && (
                  <div style={{ marginTop: ".8rem", display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 130, background: "#fff", borderRadius: 8, padding: ".6rem .8rem", border: "1px solid #e8e0d0" }}>
                      <p style={{ margin: "0 0 .2rem", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#9aaa9e" }}>Land component</p>
                      <p style={{ margin: 0, fontWeight: 700, color: DARK, fontSize: ".88rem" }}>{fmtM((result.landLow + result.landHigh) / 2)}</p>
                      <p style={{ margin: 0, fontSize: ".72rem", color: "#9aaa9e" }}>{fmtM(result.landLow)} – {fmtM(result.landHigh)}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 130, background: "#fff", borderRadius: 8, padding: ".6rem .8rem", border: "1px solid #e8e0d0" }}>
                      <p style={{ margin: "0 0 .2rem", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#9aaa9e" }}>Improvement component</p>
                      <p style={{ margin: 0, fontWeight: 700, color: DARK, fontSize: ".88rem" }}>{fmtM((result.builtLow + result.builtHigh) / 2)}</p>
                      <p style={{ margin: 0, fontSize: ".72rem", color: "#9aaa9e" }}>{fmtM(result.builtLow)} – {fmtM(result.builtHigh)}</p>
                    </div>
                  </div>
                )}

                {/* Confidence + data source */}
                <div style={{ marginTop: ".9rem", display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ padding: ".22rem .6rem", borderRadius: 20, background: ci.bg, color: ci.color, fontWeight: 700, fontSize: ".68rem", letterSpacing: ".06em" }}>
                    {ci.label} CONFIDENCE
                  </span>
                  <span style={{ padding: ".22rem .6rem", borderRadius: 20, background: dataSource === "live" ? "#e8f4ec" : "#f0ede7", color: dataSource === "live" ? "#2d7a4a" : "#7a6535", fontWeight: 600, fontSize: ".68rem", letterSpacing: ".04em" }}>
                    {result.dataLabel}{formattedDate ? ` · ${formattedDate}` : ""}
                  </span>
                </div>
                <p style={{ margin: ".5rem 0 0", fontSize: ".75rem", color: "#6b7a6e", lineHeight: 1.5 }}>{ci.note}</p>

                {/* Factors applied */}
                {result.factors.length > 0 && (
                  <div style={{ marginTop: ".8rem" }}>
                    <p style={{ margin: "0 0 .3rem", fontSize: ".73rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#9aaa9e" }}>Adjustment factors applied</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
                      {result.factors.map(f => (
                        <span key={f} style={{ fontSize: ".72rem", background: "#fff", border: "1px solid #e0d8cc", borderRadius: 4, padding: ".15rem .45rem", color: "#6b7a6e" }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing fields */}
                {result.missingFields.length > 0 && (
                  <div style={{ marginTop: ".8rem", padding: ".65rem .8rem", background: "#fff8ee", borderRadius: 8, border: "1px solid #f0d88a" }}>
                    <p style={{ margin: "0 0 .3rem", fontSize: ".73rem", fontWeight: 700, color: "#7a5f10" }}>To improve accuracy, add:</p>
                    <ul style={{ margin: 0, padding: "0 0 0 1.1rem" }}>
                      {result.missingFields.map(f => <li key={f} style={{ fontSize: ".75rem", color: "#7a5f10" }}>{f}</li>)}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <p style={{ margin: ".85rem 0 0", fontSize: ".72rem", color: "#9aaa9e", lineHeight: 1.55 }}>
                  Indicative estimate based on {dataSource === "live" ? "current market listing data" : "market benchmarks"}. This is not a formal or certified property valuation. Ferguson Law is not a valuation firm. For an official appraisal, engage a chartered valuator. Data sourced from property listing platforms — not NLA or JAMPROP databases.
                </p>

                {/* Export + CTA */}
                <div style={{ marginTop: "1rem", display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
                  <button onClick={downloadCSV} style={exportBtnStyle}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Save as CSV
                  </button>
                  <button onClick={() => window.print()} style={exportBtnStyle}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print / PDF
                  </button>
                  <a href="/booking" style={{ ...exportBtnStyle, textDecoration: "none" }}>Book Consultation</a>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: ".78rem", fontWeight: 600, letterSpacing: ".06em",
  textTransform: "uppercase", color: "#6b7a6e", marginBottom: 6,
};
const selectStyle: React.CSSProperties = {
  width: "100%", padding: ".6rem .75rem", border: "1px solid #d5cfc4",
  borderRadius: 6, fontSize: ".9rem", background: "#fff", color: "#10211c",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: ".6rem .75rem", border: "1px solid #d5cfc4",
  borderRadius: 6, fontSize: ".9rem", background: "#fff", color: "#10211c", boxSizing: "border-box",
};
const exportBtnStyle: React.CSSProperties = {
  padding: ".5rem 1rem", background: "#fff", border: "1px solid #c9a86a",
  borderRadius: 6, color: "#10211c", fontSize: ".8rem", fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: ".4rem",
};
