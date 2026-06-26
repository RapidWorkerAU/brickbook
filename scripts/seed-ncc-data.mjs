/**
 * Seed script: NCC 2025 climate zone data → Supabase
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-ncc-data.mjs
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Seeds:
 *   ncc_climate_zones             - from au-locations.json (NCC Table 3)
 *   zone_profiles                 - per-zone design data (1 row per zone)
 *   zone_ceiling_fan_requirements - from NCC Table 13.5.2
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local (handles UTF-8 BOM that Windows editors add) ──────────────
function loadEnvLocal() {
  const envPath = join(__dirname, "../.env.local");
  let raw;
  try { raw = readFileSync(envPath, "utf8"); }
  catch { return; } // file missing, fall back to process.env as-is

  // Strip UTF-8 BOM if present
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    let v = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes if present
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

// ── Supabase admin client ─────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── NCC climate zone reference cities (Table 3) ───────────────────────────────
const rawLocations = JSON.parse(
  readFileSync(join(__dirname, "../src/data/au-locations.json"), "utf8")
);

const climateZoneRows = rawLocations.map((loc) => ({
  state:         loc.state,
  location_name: loc.suburb,
  postcode:      loc.postcode ?? null,
  climate_zone:  loc.climateZone,
  lat:           loc.lat,
  lng:           loc.lng,
}));

// ── Zone profiles (one row per zone 1-8) ─────────────────────────────────────
// Sources: NCC 2025, Your Home Guide (CSIRO/DISER), passive design principles
const zoneProfiles = [
  {
    zone: 1,
    zone_name: "Hot Humid Tropical",
    ncc_zone_name: "Hot humid summer, warm dry winter",
    climate_summary:
      "No real winter. The challenge is year-round heat and humidity with a wet/dry season cycle. " +
      "Cooling, shade, and ventilation do all the work. Thermal mass is your enemy here, not your friend.",
    design_priority: "cooling",
    dominant_strategy: "Maximum shade, cross-ventilation, and elevated lightweight construction",
    feel_description:
      "A well-designed Zone 1 home lives mostly outdoors. Deep verandahs and covered breezeways " +
      "make the inside-outside boundary dissolve. Rooms are light and airy. Natural cross-ventilation " +
      "replaces mechanical cooling for most of the year. Ceiling fans in every room reduce felt temperature " +
      "by 3-4°C. The wet season brings rain and humidity, but shaded elevated spaces remain comfortable. " +
      "Air conditioning handles the most intense weeks of the build-up.",
  },
  {
    zone: 2,
    zone_name: "Warm Humid",
    ncc_zone_name: "Warm humid",
    climate_summary:
      "Similar to Zone 1 but with slightly more seasonal variation. Winters are mild rather than hot. " +
      "Cooling dominates but there are cool nights where thermal mass can provide some benefit. " +
      "Ventilation and shading remain the primary strategies.",
    design_priority: "cooling",
    dominant_strategy: "North orientation, generous eaves, ceiling fans, and good cross-ventilation",
    feel_description:
      "Zone 2 homes at their best feel like permanent resort living. Open-plan living areas connect " +
      "directly to outdoor entertaining. The boundary dissolves. North-facing rooms with generous eaves " +
      "are bright and warm on mild winter mornings without overheating in summer. Ceiling fans in every " +
      "room mean you barely notice the summer heat. The climate rewards outdoor living: a well-designed " +
      "home feels like a relaxed, permanent holiday.",
  },
  {
    zone: 3,
    zone_name: "Hot Dry",
    ncc_zone_name: "Hot dry summer, cool winter",
    climate_summary:
      "Extreme summer heat (40°C+ days common) with cool to cold winters. Thermal mass stores night " +
      "coolness and resists daytime heat. Night ventilation is the critical cooling mechanism. The " +
      "diurnal temperature swing of 15-20°C is your asset.",
    design_priority: "cooling",
    dominant_strategy: "High thermal mass, night purge ventilation, and shade on all external surfaces",
    feel_description:
      "Zone 3 homes are fortresses against extreme heat that open up beautifully at night. Thick walls " +
      "and a shaded courtyard keep interiors 10-15°C cooler than outside on 45°C days. After sundown, " +
      "opening up the whole house flushes cool night air through heavy masonry rooms. By morning, the " +
      "slab and walls have stored enough coolness to carry through to the following afternoon. It is a " +
      "completely different experience from air conditioning, genuinely cool and free.",
  },
  {
    zone: 4,
    zone_name: "Mixed",
    ncc_zone_name: "Hot dry summer, cold winter",
    climate_summary:
      "Distinct warm summers and cold winters. The design challenge is handling both extremes: solar " +
      "gain is desirable in winter but must be excluded in summer. Thermal mass and correct eave sizing " +
      "do the heavy lifting across both seasons.",
    design_priority: "mixed",
    dominant_strategy: "North glazing + thermal mass + sized eaves + external summer shading",
    feel_description:
      "Zone 4 homes have distinct seasons, and a well-designed one feels different in each. Winter " +
      "mornings are bright and solar-heated through north-facing glazing. The living room warms naturally " +
      "by 10am. Summer evenings are pleasant on a shaded verandah. The shoulder seasons (spring and autumn) " +
      "require almost no heating or cooling at all in a well-oriented, well-insulated home. You experience " +
      "the seasons rather than hiding from them.",
  },
  {
    zone: 5,
    zone_name: "Warm Temperate",
    ncc_zone_name: "Warm temperate",
    climate_summary:
      "The goldilocks zone for passive design. Mild winters reward north glazing; warm summers require " +
      "summer shading, especially on the west face. A correctly designed home requires almost no mechanical " +
      "heating or cooling for 10-11 months of the year.",
    design_priority: "mixed",
    dominant_strategy: "North glazing with correct eave depth, summer shading, and cross-ventilation",
    feel_description:
      "Zone 5 is the goldilocks zone for passive design. Winters are mild enough that a north-facing " +
      "living area warms up naturally every clear day. The morning sun heating the concrete slab makes the " +
      "house feel warm without the heater on. Summers are warm but manageable. The biggest challenge is the " +
      "west face on hot summer afternoons. A properly designed Zone 5 home (north-oriented, with correct " +
      "eave depth and summer shading on the west) feels comfortable almost year-round without mechanical " +
      "assistance. It is the most achievable high-performance outcome in Australia.",
  },
  {
    zone: 6,
    zone_name: "Mild Temperate",
    ncc_zone_name: "Mild temperate",
    climate_summary:
      "Real winters reward good passive solar design. Thermal mass stores winter solar gain and releases " +
      "it overnight. Summer is mild to warm. North glazing with properly sized eaves is the defining " +
      "design move. It simultaneously admits winter sun and excludes summer sun.",
    design_priority: "heating",
    dominant_strategy: "North glazing, thermal mass, and a well-insulated envelope",
    feel_description:
      "Zone 6 homes have real winters that reward good passive design. North-facing living areas with " +
      "correctly proportioned eaves fill with warm light on winter days, making the house feel genuinely " +
      "warm without the heater running. High thermal mass stores this daytime heat and releases it into " +
      "the evening. The temperature does not crash when the sun sets. A well-designed Zone 6 home cuts " +
      "annual heating energy by 60-80% compared to a poorly-oriented equivalent. You feel the difference " +
      "most on still, sunny winter afternoons.",
  },
  {
    zone: 7,
    zone_name: "Cool Temperate",
    ncc_zone_name: "Cool temperate",
    climate_summary:
      "Serious winters with cold nights, frost, and short daylight hours. Heating dominates the energy " +
      "budget. Superinsulation, high thermal mass, and north glazing are all essential. Airtightness " +
      "matters significantly at this latitude.",
    design_priority: "heating",
    dominant_strategy: "Superinsulation, north glazing, high thermal mass, and airtightness",
    feel_description:
      "Zone 7 winters are serious, with cold nights, frosty mornings, and short daylight hours. But a " +
      "well-designed Zone 7 home feels remarkably warm inside when the sun is out, even in July. " +
      "Superinsulated walls and ceiling, double glazing, and a north-facing main living area create " +
      "a solar-passive warmth that feels different from mechanical heating: even-tempered, radiant, " +
      "and free. The challenge is retaining that heat through long winter nights. Thermal mass inside " +
      "the insulation envelope is the answer: it acts as a battery, storing daytime solar gain and " +
      "releasing it slowly overnight.",
  },
  {
    zone: 8,
    zone_name: "Alpine",
    ncc_zone_name: "Alpine",
    climate_summary:
      "Sub-zero nights, snow loading, and extreme wind. The highest energy loads in Australia. " +
      "Maximum insulation, airtightness, and triple glazing are the baseline. Passive solar still " +
      "works on clear days but must be balanced against heat loss through glazing at night.",
    design_priority: "heating",
    dominant_strategy: "Maximum insulation, airtightness, heat recovery ventilation, and triple glazing",
    feel_description:
      "Zone 8 is alpine and unforgiving. Snow loading, sub-zero nights, and extreme wind mean " +
      "structural performance matters as much as energy performance. But a well-designed alpine home " +
      "feels like a true refuge. Thick walls hold warmth for days, and a central wood heater or " +
      "radiant floor heating makes the space feel enveloping and cosy in a way that forced-air systems " +
      "never quite achieve. Clear winter days with solar gain through north-facing glazing are genuinely " +
      "beautiful: bright, warm, and serene against the snow outside.",
  },
];

// ── Ceiling fan requirements (NCC Table 13.5.2) ───────────────────────────────
// Bedrooms: zones 1, 2, 3 (all states)
// Habitable rooms (non-bedroom): zones 1, 2, 3 (all states) + zone 5 (NSW & QLD only)
const bedroomZones = [1, 2, 3];
const habitableZones = [1, 2, 3];  // all states
const habitableZone5 = [5];        // NSW & QLD only

const sizeBands = [
  { min: 0,   max: 15,   count: 1, diameter: 900  },
  { min: 15,  max: 20,   count: 1, diameter: 1200 },
  { min: 20,  max: 25,   count: 1, diameter: 1200 },
  { min: 25,  max: 30,   count: 1, diameter: 1400 },
  { min: 30,  max: 45,   count: 1, diameter: 1400 },
  { min: 45,  max: 50,   count: 2, diameter: 1400 },
  { min: 50,  max: null, count: 2, diameter: 1400 },
];

const habitableSizeBands = [
  { min: 0,   max: 15,   count: 1, diameter: 900  },
  { min: 15,  max: 20,   count: 1, diameter: 1200 },
  { min: 20,  max: 25,   count: 1, diameter: 1400 },
  { min: 25,  max: 30,   count: 2, diameter: 1200 },
  { min: 30,  max: 45,   count: 2, diameter: 1400 },
  { min: 45,  max: 50,   count: 3, diameter: 1200 },
  { min: 50,  max: null, count: 3, diameter: 1400 },
];

// ── Monthly climate averages: multiple cities per zone ────────────────────────
// Multiple cities per zone allow the API to return the nearest city to the user's
// location rather than a single arbitrary reference. Each row:
//   [avg_max_c, avg_min_c, avg_rainfall_mm, avg_humidity_pct, avg_wind_kmh]  (Jan-Dec)
const CLIMATE_CITIES = [
  // Zone 1 — two cities because Darwin (NT) and Cairns (QLD) differ in rainfall pattern
  {
    zone: 1, city_key: "darwin", city_name: "Darwin", state: "NT",
    lat: -12.46, lng: 130.84,
    data: [
      [32.0, 24.5, 386.0, 83, 11], [31.5, 24.5, 322.0, 84, 11], [31.5, 24.0, 271.0, 80, 12],
      [33.0, 23.5,  97.0, 69, 14], [33.0, 21.5,  21.0, 57, 17], [31.0, 19.5,   2.0, 51, 19],
      [30.5, 19.0,   1.0, 51, 19], [31.0, 20.0,   5.0, 51, 19], [33.0, 22.0,  14.0, 52, 16],
      [34.5, 23.5,  51.0, 60, 14], [34.5, 24.0, 119.0, 72, 12], [33.0, 24.5, 239.0, 79, 11],
    ],
  },
  {
    zone: 1, city_key: "cairns", city_name: "Cairns", state: "QLD",
    lat: -16.92, lng: 145.77,
    data: [
      [32.0, 24.0, 415.0, 78,  9], [31.0, 24.0, 417.0, 80,  9], [31.0, 23.0, 333.0, 78, 10],
      [30.0, 22.0, 175.0, 72, 12], [29.0, 20.0,  74.0, 64, 14], [27.0, 18.0,  41.0, 58, 15],
      [26.0, 17.0,  27.0, 56, 16], [27.0, 18.0,  30.0, 54, 15], [29.0, 19.0,  37.0, 52, 14],
      [31.0, 21.0,  53.0, 53, 12], [32.0, 23.0,  92.0, 60, 10], [32.0, 24.0, 175.0, 68,  9],
    ],
  },

  // Zone 2 — Townsville (representative warm humid)
  {
    zone: 2, city_key: "townsville", city_name: "Townsville", state: "QLD",
    lat: -19.26, lng: 146.82,
    data: [
      [31.0, 24.0, 240.0, 76, 14], [31.0, 24.0, 260.0, 77, 13], [30.0, 23.0, 150.0, 75, 13],
      [29.0, 21.0,  38.0, 67, 15], [27.0, 18.0,  29.0, 61, 17], [25.0, 16.0,  17.0, 57, 18],
      [24.0, 15.0,  13.0, 54, 18], [25.0, 16.0,  14.0, 52, 18], [27.0, 18.0,  14.0, 54, 17],
      [29.0, 21.0,  27.0, 60, 16], [31.0, 23.0,  75.0, 68, 15], [31.0, 24.0, 152.0, 74, 14],
    ],
  },

  // Zone 3 — Alice Springs (hot dry, single city captures the zone well)
  {
    zone: 3, city_key: "alice_springs", city_name: "Alice Springs", state: "NT",
    lat: -23.70, lng: 133.88,
    data: [
      [36.0, 22.0, 43.0, 27, 16], [35.0, 21.0, 33.0, 27, 16], [32.0, 18.0, 25.0, 24, 16],
      [27.5, 13.0, 15.0, 23, 16], [22.0,  8.0, 20.0, 28, 16], [19.0,  4.0, 15.0, 32, 16],
      [19.0,  3.0, 15.0, 28, 17], [22.0,  5.0, 10.0, 22, 18], [27.0, 10.0,  9.0, 17, 19],
      [31.5, 14.0, 20.0, 16, 18], [34.0, 18.5, 24.0, 17, 17], [36.0, 21.0, 37.0, 21, 16],
    ],
  },

  // Zone 4 — Dubbo (NSW inland) and Mildura (VIC/SA border)
  {
    zone: 4, city_key: "dubbo", city_name: "Dubbo", state: "NSW",
    lat: -32.25, lng: 148.60,
    data: [
      [34.5, 20.0, 57.0, 44, 14], [33.5, 19.0, 47.0, 44, 14], [29.5, 16.5, 47.0, 47, 14],
      [24.0, 11.0, 31.0, 49, 13], [18.5,  6.5, 37.0, 59, 12], [14.0,  3.0, 36.0, 67, 12],
      [13.0,  2.0, 37.0, 65, 12], [15.0,  3.0, 29.0, 60, 14], [19.5,  6.5, 37.0, 51, 15],
      [24.0, 10.5, 50.0, 48, 15], [29.0, 14.5, 53.0, 45, 15], [32.5, 18.0, 53.0, 42, 14],
    ],
  },
  {
    zone: 4, city_key: "mildura", city_name: "Mildura", state: "VIC",
    lat: -34.18, lng: 142.16,
    data: [
      [34.0, 19.0, 24.0, 34, 14], [34.0, 19.0, 22.0, 33, 13], [30.0, 16.0, 28.0, 36, 13],
      [24.0, 11.0, 27.0, 42, 11], [18.0,  8.0, 37.0, 54, 10], [14.0,  5.0, 38.0, 64, 10],
      [13.0,  4.0, 35.0, 64, 11], [15.0,  5.0, 29.0, 59, 12], [18.0,  7.0, 31.0, 51, 13],
      [23.0, 10.0, 28.0, 43, 14], [28.0, 14.0, 28.0, 37, 15], [32.0, 17.0, 25.0, 32, 15],
    ],
  },

  // Zone 5 — three cities: Sydney (humid), Perth (Mediterranean dry summer), Adelaide (Mediterranean)
  {
    zone: 5, city_key: "sydney", city_name: "Sydney", state: "NSW",
    lat: -33.87, lng: 151.21,
    data: [
      [26.0, 19.0, 103.0, 65, 17], [26.0, 19.0, 118.0, 68, 16], [25.0, 18.0, 131.0, 68, 15],
      [22.5, 15.0, 127.0, 66, 14], [19.0, 12.0, 122.0, 64, 14], [16.5, 10.0, 131.0, 68, 15],
      [16.0,  9.0,  98.0, 64, 16], [17.5, 10.0,  81.0, 61, 17], [19.5, 12.0,  69.0, 61, 18],
      [22.5, 14.5,  77.0, 62, 18], [23.5, 16.0,  83.0, 63, 18], [25.0, 18.0,  78.0, 63, 18],
    ],
  },
  {
    zone: 5, city_key: "perth", city_name: "Perth", state: "WA",
    lat: -31.95, lng: 115.86,
    data: [
      [31.0, 18.0,   8.0, 41, 20], [32.0, 18.0,  12.0, 41, 18], [30.0, 17.0,  18.0, 44, 17],
      [25.0, 14.0,  43.0, 52, 15], [21.0, 11.0, 103.0, 61, 14], [18.0,  9.0, 182.0, 69, 14],
      [17.0,  8.0, 172.0, 70, 15], [18.0,  9.0, 119.0, 66, 16], [20.0, 10.0,  79.0, 60, 18],
      [23.0, 12.0,  53.0, 54, 20], [27.0, 15.0,  20.0, 46, 21], [29.0, 17.0,  11.0, 41, 21],
    ],
  },
  {
    zone: 5, city_key: "adelaide", city_name: "Adelaide", state: "SA",
    lat: -34.93, lng: 138.60,
    data: [
      [29.0, 17.0, 20.0, 43, 17], [29.0, 17.0, 14.0, 43, 16], [26.0, 15.0, 26.0, 47, 15],
      [22.0, 12.0, 39.0, 55, 14], [18.0, 10.0, 61.0, 64, 14], [15.0,  8.0, 81.0, 71, 14],
      [15.0,  7.0, 76.0, 73, 15], [15.0,  8.0, 64.0, 71, 16], [18.0,  9.0, 47.0, 64, 17],
      [21.0, 11.0, 42.0, 57, 18], [24.0, 14.0, 26.0, 50, 18], [27.0, 16.0, 26.0, 44, 18],
    ],
  },

  // Zone 6 — Melbourne
  {
    zone: 6, city_key: "melbourne", city_name: "Melbourne", state: "VIC",
    lat: -37.81, lng: 144.96,
    data: [
      [26.0, 15.0, 48.0, 52, 19], [26.0, 15.0, 47.0, 52, 18], [23.5, 14.0, 50.0, 55, 17],
      [19.5, 11.0, 58.0, 60, 15], [16.0,  8.5, 56.0, 66, 15], [13.0,  7.0, 49.0, 71, 16],
      [12.5,  6.0, 48.0, 72, 16], [14.0,  7.0, 50.0, 69, 17], [16.5,  8.0, 59.0, 63, 18],
      [19.5, 10.0, 66.0, 59, 20], [22.0, 12.0, 60.0, 56, 20], [24.5, 14.0, 59.0, 53, 20],
    ],
  },

  // Zone 7 — Hobart (maritime cool) and Canberra (continental cool, colder winters)
  {
    zone: 7, city_key: "hobart", city_name: "Hobart", state: "TAS",
    lat: -42.88, lng: 147.33,
    data: [
      [22.0, 12.0, 48.0, 62, 15], [22.0, 12.0, 40.0, 62, 14], [20.0, 11.0, 46.0, 65, 14],
      [17.0,  9.0, 53.0, 68, 14], [14.0,  7.0, 52.0, 73, 14], [12.0,  5.0, 56.0, 76, 15],
      [11.5,  4.5, 52.0, 76, 16], [12.5,  5.0, 54.0, 73, 16], [14.5,  6.5, 53.0, 71, 16],
      [17.0,  8.0, 62.0, 65, 16], [18.5,  9.5, 55.0, 63, 16], [20.5, 11.0, 57.0, 62, 16],
    ],
  },
  {
    zone: 7, city_key: "canberra", city_name: "Canberra", state: "ACT",
    lat: -35.28, lng: 149.13,
    data: [
      [28.0, 13.0, 58.0, 49, 12], [27.0, 13.0, 55.0, 52, 11], [24.0, 10.0, 52.0, 54, 10],
      [20.0,  7.0, 47.0, 57, 10], [15.0,  3.0, 44.0, 64, 10], [12.0,  1.0, 40.0, 68, 11],
      [11.0,  0.0, 39.0, 65, 11], [13.0,  1.0, 40.0, 59, 12], [15.0,  4.0, 48.0, 53, 13],
      [19.0,  7.0, 60.0, 50, 13], [23.0, 10.0, 60.0, 47, 13], [26.0, 12.0, 56.0, 46, 13],
    ],
  },

  // Zone 8 — Mt Hotham (alpine)
  {
    zone: 8, city_key: "mt_hotham", city_name: "Mt Hotham", state: "VIC",
    lat: -37.05, lng: 147.13,
    data: [
      [16.0,  7.0,  77.0, 70, 28], [16.0,  7.0,  76.0, 70, 26], [13.0,  5.0,  92.0, 75, 25],
      [ 8.0,  1.0, 100.0, 80, 25], [ 3.0, -3.0, 120.0, 83, 28], [ 0.0, -6.0, 140.0, 87, 30],
      [-1.0, -7.0, 130.0, 87, 31], [ 0.0, -6.0, 120.0, 84, 31], [ 4.0, -3.0, 105.0, 80, 29],
      [ 8.0,  0.0, 100.0, 75, 28], [12.0,  3.0,  88.0, 72, 28], [14.0,  5.0,  84.0, 70, 28],
    ],
  },
];

function buildMonthlyRows() {
  const rows = [];
  for (const city of CLIMATE_CITIES) {
    city.data.forEach(([max, min, rain, humid, wind], i) => {
      rows.push({
        zone:               city.zone,
        city_key:           city.city_key,
        city_name:          city.city_name,
        state:              city.state,
        lat:                city.lat,
        lng:                city.lng,
        month:              i + 1,
        avg_max_c:          max,
        avg_min_c:          min,
        avg_rainfall_mm:    rain,
        avg_humidity_pct:   humid,
        avg_wind_speed_kmh: wind,
      });
    });
  }
  return rows;
}

function buildFanRows() {
  const rows = [];

  // Bedrooms: zones 1, 2, 3 (all states)
  for (const zone of bedroomZones) {
    for (const band of sizeBands) {
      rows.push({
        zone,
        applies_to:      "bedroom",
        room_sqm_min:    band.min,
        room_sqm_max:    band.max,
        fan_count:       band.count,
        fan_diameter_mm: band.diameter,
        state_restriction: null,
      });
    }
  }

  // Habitable rooms (non-bedroom): zones 1, 2, 3 (all states)
  for (const zone of habitableZones) {
    for (const band of habitableSizeBands) {
      rows.push({
        zone,
        applies_to:      "habitable_room",
        room_sqm_min:    band.min,
        room_sqm_max:    band.max,
        fan_count:       band.count,
        fan_diameter_mm: band.diameter,
        state_restriction: null,
      });
    }
  }

  // Zone 5 habitable rooms: NSW & QLD only
  for (const zone of habitableZone5) {
    for (const band of habitableSizeBands) {
      rows.push({
        zone,
        applies_to:      "habitable_room",
        room_sqm_min:    band.min,
        room_sqm_max:    band.max,
        fan_count:       band.count,
        fan_diameter_mm: band.diameter,
        state_restriction: "NSW,QLD",
      });
    }
  }

  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log("Seeding NCC climate data...\n");

  // 1. Zone profiles (must be first; ceiling fan table references zone_profiles)
  console.log("Inserting zone_profiles...");
  const { error: profileError } = await supabase
    .from("zone_profiles")
    .upsert(zoneProfiles, { onConflict: "zone" });
  if (profileError) { console.error("zone_profiles error:", profileError); process.exit(1); }
  console.log(`  ✓ ${zoneProfiles.length} zones`);

  // 2. NCC climate zones (reference cities)
  console.log("Inserting ncc_climate_zones...");
  const { error: zoneError } = await supabase
    .from("ncc_climate_zones")
    .upsert(climateZoneRows, { onConflict: "id" });
  if (zoneError) { console.error("ncc_climate_zones error:", zoneError); process.exit(1); }
  console.log(`  ✓ ${climateZoneRows.length} locations`);

  // 3. Ceiling fan requirements
  const fanRows = buildFanRows();
  console.log("Inserting zone_ceiling_fan_requirements...");
  // Clear and re-insert to avoid duplicates on re-run
  await supabase.from("zone_ceiling_fan_requirements").delete().neq("id", 0);
  const { error: fanError } = await supabase
    .from("zone_ceiling_fan_requirements")
    .insert(fanRows);
  if (fanError) { console.error("zone_ceiling_fan_requirements error:", fanError); process.exit(1); }
  console.log(`  ✓ ${fanRows.length} fan requirement rows`);

  // 4. Monthly climate averages
  const monthlyRows = buildMonthlyRows();
  console.log("Inserting zone_monthly_climate...");
  const { error: monthlyError } = await supabase
    .from("zone_monthly_climate")
    .upsert(monthlyRows, { onConflict: "city_key,month" });
  if (monthlyError) { console.error("zone_monthly_climate error:", monthlyError); process.exit(1); }
  console.log(`  ✓ ${monthlyRows.length} monthly rows`);

  console.log("\nDone.");
}

run().catch((err) => { console.error(err); process.exit(1); });
