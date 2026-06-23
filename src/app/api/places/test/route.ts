import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, reason: "GOOGLE_MAPS_API_KEY is not set" });

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", "Sydney");
  url.searchParams.set("types", "geocode");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();

  return NextResponse.json({
    ok: data.status === "OK" || data.status === "ZERO_RESULTS",
    status: data.status,
    error_message: data.error_message ?? null,
    key_preview: `${key.slice(0, 8)}...${key.slice(-4)}`,
    predictions_count: data.predictions?.length ?? 0,
  });
}
