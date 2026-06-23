import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id");
  if (!placeId) return NextResponse.json({ result: null });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error("[places/details] GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json({ result: null }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "geometry,address_components,name");
  url.searchParams.set("language", "en-AU");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  const data = await res.json();

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[places/details] Google API error:", data.status, data.error_message ?? "");
    return NextResponse.json({ result: null, error: data.status }, { status: 502 });
  }

  return NextResponse.json({ result: data.result ?? null });
}
