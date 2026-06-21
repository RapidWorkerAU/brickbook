export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return new Response("Missing API key", { status: 500 });

  // Forward only safe Static Maps params to avoid key-leaking via arbitrary URLs
  const allowed = ["center", "zoom", "size", "scale", "maptype", "format", "path", "markers"];
  const params  = new URLSearchParams();
  for (const k of allowed) {
    const v = searchParams.get(k);
    if (v) params.set(k, v);
  }
  params.set("key", key);

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
    if (!res.ok) return new Response("Satellite fetch failed", { status: res.status });
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type":  res.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Internal error", { status: 500 });
  }
}
