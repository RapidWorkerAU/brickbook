import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if ("planningStyles" in body) allowed.planning_styles = Array.isArray(body.planningStyles) ? body.planningStyles : [];
  if ("stage" in body) allowed.stage = body.stage ?? null;
  if ("budgetLandMin" in body) allowed.budget_land_min = body.budgetLandMin ? Number(body.budgetLandMin) : null;
  if ("budgetLandMax" in body) allowed.budget_land_max = body.budgetLandMax ? Number(body.budgetLandMax) : null;
  if ("budgetBuildMin" in body) allowed.budget_build_min = body.budgetBuildMin ? Number(body.budgetBuildMin) : null;
  if ("budgetBuildMax" in body) allowed.budget_build_max = body.budgetBuildMax ? Number(body.budgetBuildMax) : null;

  if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });

  const { error } = await supabase.from("builds").update(allowed).eq("id", buildId).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
