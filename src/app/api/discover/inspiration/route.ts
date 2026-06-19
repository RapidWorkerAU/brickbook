import { NextRequest, NextResponse } from "next/server";
import { getPaginatedInspirationImages } from "@/lib/public-data";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  try {
    const result = await getPaginatedInspirationImages({
      rawOffset: parseInt(p.get("rawOffset") ?? "0", 10),
      search: p.get("search") ?? "",
      categories: p.get("categories")?.split(",").filter(Boolean) ?? [],
      rooms: p.get("rooms")?.split(",").filter(Boolean) ?? [],
      styles: p.get("styles")?.split(",").filter(Boolean) ?? [],
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
