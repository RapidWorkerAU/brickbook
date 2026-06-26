import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/sun-planner/zone-profile?zone=5
// Returns zone_profiles row + ceiling fan summary for the given NCC climate zone.
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

  const supabase = await createClient();

  const [profileResult, fanResult] = await Promise.all([
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
  ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  if (!profileResult.data) {
    return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  }

  // Summarise ceiling fan requirements into a human-readable form
  const fanRows = fanResult.data ?? [];
  const ceilingFanSummary = buildFanSummary(zone, fanRows);

  return NextResponse.json({
    profile: profileResult.data,
    ceilingFanSummary,
    ceilingFanRows: fanRows,
  });
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

  const hasBedroom     = rows.some((r) => r.applies_to === "bedroom" && !r.state_restriction);
  const hasHabitable   = rows.some((r) => r.applies_to === "habitable_room" && !r.state_restriction);
  const hasStateSpec   = rows.some((r) => r.applies_to === "habitable_room" && r.state_restriction);
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
    summary = "Ceiling fans required — see NCC Table 13.5.2 for sizing.";
  }

  if (hasStateSpec && (hasBedroom || hasHabitable)) {
    stateNote = `Also required in habitable rooms (non-bedroom) in ${stateRestriction}.`;
  } else if (hasStateSpec) {
    stateNote = `Applies in ${stateRestriction} only.`;
  }

  return { required: true, summary, stateNote };
}
