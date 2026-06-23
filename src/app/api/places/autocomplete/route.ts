import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input")?.trim();
  if (!input) return NextResponse.json({ predictions: [] });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error("[places/autocomplete] GOOGLE_MAPS_API_KEY is not set");
    return NextResponse.json({ predictions: [] }, { status: 500 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("types", "geocode");
  url.searchParams.set("components", "country:au");
  url.searchParams.set("language", "en-AU");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  const data = await res.json();

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[places/autocomplete] Google API error:", data.status, data.error_message ?? "");
    return NextResponse.json({ predictions: [], error: data.status }, { status: 502 });
  }

  return NextResponse.json({ predictions: data.predictions ?? [] });
}
