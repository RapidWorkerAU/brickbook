import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET ?planningBuildId=X → list saved builds for a planning build
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const planningBuildId = searchParams.get("planningBuildId");
  if (!planningBuildId) return NextResponse.json({ error: "planningBuildId required." }, { status: 400 });

  const { data, error } = await supabase
    .from("planning_saved_builds")
    .select("id, saved_build_id")
    .eq("planning_build_id", planningBuildId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ saves: data ?? [] });
}

// POST { planning_build_id, saved_build_id } → save
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const planningBuildId = String(body?.planning_build_id ?? "").trim();
  const savedBuildId = String(body?.saved_build_id ?? "").trim();
  if (!planningBuildId || !savedBuildId) {
    return NextResponse.json({ error: "planning_build_id and saved_build_id required." }, { status: 400 });
  }

  // Verify caller owns the planning build
  const { data: planBuild } = await supabase
    .from("builds")
    .select("id, stage")
    .eq("id", planningBuildId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!planBuild) return NextResponse.json({ error: "Planning build not found." }, { status: 404 });
  if (planBuild.stage !== "planning") return NextResponse.json({ error: "Target build is not a planning build." }, { status: 400 });
  if (planningBuildId === savedBuildId) return NextResponse.json({ error: "Cannot save a build to itself." }, { status: 400 });

  const { data, error } = await supabase
    .from("planning_saved_builds")
    .upsert(
      { planning_build_id: planningBuildId, saved_build_id: savedBuildId, owner_id: user.id },
      { onConflict: "planning_build_id,saved_build_id" },
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ save: data });
}

// DELETE ?planningBuildId=X&savedBuildId=Y → unsave
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const planningBuildId = searchParams.get("planningBuildId");
  const savedBuildId = searchParams.get("savedBuildId");
  if (!planningBuildId || !savedBuildId) {
    return NextResponse.json({ error: "planningBuildId and savedBuildId required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("planning_saved_builds")
    .delete()
    .eq("planning_build_id", planningBuildId)
    .eq("saved_build_id", savedBuildId)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
