import { NextRequest, NextResponse } from "next/server";
import { getPaginatedPublicBuilds } from "@/lib/public-data";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  try {
    const result = await getPaginatedPublicBuilds({
      offset: parseInt(p.get("offset") ?? "0", 10),
      search: p.get("search") ?? "",
      phases: p.get("phases")?.split(",").filter(Boolean) ?? [],
      types: p.get("types")?.split(",").filter(Boolean) ?? [],
      states: p.get("states")?.split(",").filter(Boolean) ?? [],
      milestoneCategories: p.get("milestoneCategories")?.split(",").filter(Boolean) ?? [],
      sort: p.get("sort") ?? "recent",
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
