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
 *   ncc_climate_zones             — from au-locations.json (NCC Table 3)
 *   zone_profiles                 — per-zone design data (1 row per zone)
 *   zone_ceiling_fan_requirements — from NCC Table 13.5.2
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
  catch { return; } // file missing — fall back to process.env as-is

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

// ── Zone profiles (one row per zone 1–8) ─────────────────────────────────────
// Sources: NCC 2025, Your Home Guide (CSIRO/DISER), passive design principles
const zoneProfiles = [
  {
    zone: 1,
    zone_name: "Hot Humid Tropical",
    ncc_zone_name: "Hot humid summer, warm dry winter",
    climate_summary:
      "No real winter. The challenge is year-round heat and humidity with a wet/dry season cycle. " +
      "Cooling, shade, and ventilation do all the work — thermal mass is your enemy here, not your friend.",
    design_priority: "cooling",
    dominant_strategy: "Maximum shade + cross-ventilation + elevated lightweight construction",
    feel_description:
      "A well-designed Zone 1 home lives mostly outdoors. Deep verandahs and covered breezeways " +
      "make the inside-outside boundary dissolve. Rooms are light and airy — natural cross-ventilation " +
      "replaces mechanical cooling for most of the year. Ceiling fans in every room reduce felt temperature " +
      "by 3–4°C. The wet season brings rain and humidity, but shaded elevated spaces remain comfortable. " +
      "Air conditioning handles the most intense weeks of the build-up.",
  },
  {
    zone: 2,
    zone_name: "Warm Humid",
    ncc_zone_name: "Warm humid",
    climate_summary:
      "Similar to Zone 1 but with slightly more seasonal variation — winters are mild rather than hot. " +
      "Cooling dominates but there are cool nights where thermal mass can provide some benefit. " +
      "Ventilation and shading remain the primary strategies.",
    design_priority: "cooling",
    dominant_strategy: "North orientation + generous eaves + ceiling fans + good cross-ventilation",
    feel_description:
      "Zone 2 homes at their best feel like permanent resort living. Open-plan living areas connect " +
      "directly to outdoor entertaining — the boundary dissolves. North-facing rooms with generous eaves " +
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
      "coolness and resists daytime heat. Night ventilation is the critical cooling mechanism — the " +
      "diurnal temperature swing of 15–20°C is your asset.",
    design_priority: "cooling",
    dominant_strategy: "High thermal mass + night purge ventilation + shade all external surfaces",
    feel_description:
      "Zone 3 homes are fortresses against extreme heat that open up beautifully at night. Thick walls " +
      "and a shaded courtyard keep interiors 10–15°C cooler than outside on 45°C days. After sundown, " +
      "opening up the whole house flushes cool night air through heavy masonry rooms. By morning, the " +
      "slab and walls have stored enough coolness to carry through to the following afternoon. It is a " +
      "completely different experience from air conditioning — genuinely cool and free.",
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
      "mornings are bright and solar-heated through north-facing glazing — the living room warms naturally " +
      "by 10am. Summer evenings are pleasant on a shaded verandah. The shoulder seasons — spring and autumn " +
      "— require almost no heating or cooling at all in a well-oriented, well-insulated home. You experience " +
      "the seasons rather than hiding from them.",
  },
  {
    zone: 5,
    zone_name: "Warm Temperate",
    ncc_zone_name: "Warm temperate",
    climate_summary:
      "The goldilocks zone for passive design. Mild winters reward north glazing; warm summers require " +
      "summer shading — especially on the west face. A correctly designed home requires almost no mechanical " +
      "heating or cooling for 10–11 months of the year.",
    design_priority: "mixed",
    dominant_strategy: "North glazing with correct eave depth + summer shading + cross-ventilation",
    feel_description:
      "Zone 5 is the goldilocks zone for passive design. Winters are mild enough that a north-facing " +
      "living area warms up naturally every clear day — the morning sun heating the concrete slab makes the " +
      "house feel warm without the heater on. Summers are warm but manageable. The biggest challenge is the " +
      "west face on hot summer afternoons. A properly designed Zone 5 home — north-oriented, with correct " +
      "eave depth and summer shading on the west — feels comfortable almost year-round without mechanical " +
      "assistance. It is the most achievable high-performance outcome in Australia.",
  },
  {
    zone: 6,
    zone_name: "Mild Temperate",
    ncc_zone_name: "Mild temperate",
    climate_summary:
      "Real winters reward good passive solar design. Thermal mass stores winter solar gain and releases " +
      "it overnight. Summer is mild to warm. North glazing with properly sized eaves is the defining " +
      "design move — it simultaneously admits winter sun and excludes summer sun.",
    design_priority: "heating",
    dominant_strategy: "North glazing + thermal mass + well-insulated envelope",
    feel_description:
      "Zone 6 homes have real winters that reward good passive design. North-facing living areas with " +
      "correctly proportioned eaves fill with warm light on winter days, making the house feel genuinely " +
      "warm without the heater running. High thermal mass stores this daytime heat and releases it into " +
      "the evening — the temperature doesn't crash when the sun sets. A well-designed Zone 6 home cuts " +
      "annual heating energy by 60–80% compared to a poorly-oriented equivalent. You feel the difference " +
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
    dominant_strategy: "Superinsulation + north glazing + high thermal mass + airtightness",
    feel_description:
      "Zone 7 winters are serious — cold nights, frosty mornings, and short daylight hours. But a " +
      "well-designed Zone 7 home feels remarkably warm inside when the sun is out, even in July. " +
      "Superinsulated walls and ceiling, double glazing, and a north-facing main living area create " +
      "a solar-passive warmth that feels different from mechanical heating — even-tempered, radiant, " +
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
    dominant_strategy: "Maximum insulation + airtightness + heat recovery ventilation + triple glazing",
    feel_description:
      "Zone 8 is alpine and unforgiving. Snow loading, sub-zero nights, and extreme wind mean " +
      "structural performance matters as much as energy performance. But a well-designed alpine home " +
      "feels like a true refuge — thick walls hold warmth for days, and a central wood heater or " +
      "radiant floor heating makes the space feel enveloping and cosy in a way that forced-air systems " +
      "never quite achieve. Clear winter days with solar gain through north-facing glazing are genuinely " +
      "beautiful — bright, warm, and serene against the snow outside.",
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

function buildFanRows() {
  const rows = [];

  // Bedrooms: zones 1, 2, 3 — all states
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

  // Habitable rooms (non-bedroom): zones 1, 2, 3 — all states
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

  // 1. Zone profiles (must be first — ceiling fan table references zone_profiles)
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

  console.log("\nDone.");
}

run().catch((err) => { console.error(err); process.exit(1); });
