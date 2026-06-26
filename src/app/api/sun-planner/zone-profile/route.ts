import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/sun-planner/zone-profile?zone=5&lat=-31.95&lng=115.86
// Returns zone_profiles row + ceiling fan summary + monthly climate for the nearest
// reference city to the user's location within the given NCC climate zone.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneParam = searchParams.get("zone");
  const zone = zoneParam ? parseInt(zoneParam, 10) : NaN;

  if (isNaN(zone) || zone < 1 || zone > 8) {
    return NextResponse.json(
      { error: "zone must be an integer between 1 and 8" },
      { status: 400 }
    );
  }

  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const hasLocation = !isNaN(lat) && !isNaN(lng);

  const supabase = await createClient();

  const [profileResult, fanResult, climateResult] = await Promise.all([
    supabase
      .from("zone_profiles")
      .select("*")
      .eq("zone", zone)
      .maybeSingle(),
    supabase
      .from("zone_ceiling_fan_requirements")
      .select("applies_to, room_sqm_min, room_sqm_max, fan_count, fan_diameter_mm, state_restriction")
      .eq("zone", zone)
      .order("applies_to")
      .order("room_sqm_min"),
    supabase
      .from("zone_monthly_climate")
      .select("city_key, city_name, state, lat, lng, month, avg_max_c, avg_min_c, avg_rainfall_mm, avg_humidity_pct, avg_wind_speed_kmh")
      .eq("zone", zone)
      .order("city_key")
      .order("month"),
  ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }
  if (!profileResult.data) {
    return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  }

  // Group monthly rows by city
  const allRows = climateResult.data ?? [];
  const cityMap = new Map<string, typeof allRows>();
  for (const row of allRows) {
    if (!cityMap.has(row.city_key)) cityMap.set(row.city_key, []);
    cityMap.get(row.city_key)!.push(row);
  }

  // Pick nearest city if coordinates provided, otherwise first city alphabetically
  let chosenKey: string;
  if (hasLocation && cityMap.size > 1) {
    let nearest = "";
    let minDist = Infinity;
    for (const [key, rows] of cityMap) {
      const dist = haversineKm(lat, lng, rows[0].lat, rows[0].lng);
      if (dist < minDist) { minDist = dist; nearest = key; }
    }
    chosenKey = nearest;
  } else {
    chosenKey = [...cityMap.keys()][0] ?? "";
  }

  const chosenRows = (cityMap.get(chosenKey) ?? []).sort((a, b) => a.month - b.month);
  const climateCity = chosenRows[0]
    ? { name: chosenRows[0].city_name, state: chosenRows[0].state }
    : null;

  const fanRows = fanResult.data ?? [];
  const ceilingFanSummary = buildFanSummary(zone, fanRows);

  return NextResponse.json({
    profile: profileResult.data,
    ceilingFanSummary,
    ceilingFanRows: fanRows,
    monthlyClimate: chosenRows,
    climateCity,
  });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type FanRow = {
  applies_to: string;
  room_sqm_min: number;
  room_sqm_max: number | null;
  fan_count: number;
  fan_diameter_mm: number;
  state_restriction: string | null;
};

function buildFanSummary(
  zone: number,
  rows: FanRow[]
): { required: boolean; summary: string; stateNote: string | null } {
  if (rows.length === 0) {
    return { required: false, summary: "Not required in this climate zone.", stateNote: null };
  }

  const hasBedroom   = rows.some((r) => r.applies_to === "bedroom"       && !r.state_restriction);
  const hasHabitable = rows.some((r) => r.applies_to === "habitable_room" && !r.state_restriction);
  const hasStateSpec = rows.some((r) => r.applies_to === "habitable_room" &&  r.state_restriction);
  const stateRestriction = rows.find((r) => r.state_restriction)?.state_restriction ?? null;

  let summary: string;
  let stateNote: string | null = null;

  if (hasBedroom && hasHabitable) {
    summary = `NCC requires ceiling fans in all bedrooms and all habitable rooms in Zone ${zone}.`;
  } else if (hasHabitable) {
    summary = `NCC requires ceiling fans in all habitable rooms in Zone ${zone}.`;
  } else if (hasBedroom) {
    summary = `NCC requires ceiling fans in all bedrooms in Zone ${zone}.`;
  } else if (hasStateSpec) {
    summary = `NCC requires ceiling fans in all habitable rooms in Zone ${zone} (${stateRestriction} only).`;
  } else {
    summary = "Ceiling fans required. See NCC Table 13.5.2 for sizing.";
  }

  if (hasStateSpec && (hasBedroom || hasHabitable)) {
    stateNote = `Also required in habitable rooms (non-bedroom) in ${stateRestriction}.`;
  } else if (hasStateSpec) {
    stateNote = `Applies in ${stateRestriction} only.`;
  }

  return { required: true, summary, stateNote };
}
