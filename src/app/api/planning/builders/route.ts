import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const buildId = String(body?.build_id ?? "").trim();
  const builderName = String(body?.builder_name ?? "").trim();
  if (!buildId || !builderName) return NextResponse.json({ error: "build_id and builder_name are required." }, { status: 400 });

  const { data: build } = await supabase.from("builds").select("id").eq("id", buildId).eq("owner_id", user.id).maybeSingle();
  if (!build) return NextResponse.json({ error: "Build not found." }, { status: 404 });

  const { data, error } = await supabase.from("planning_builders").insert({ build_id: buildId, builder_name: builderName, website: body?.website ?? null, notes: body?.notes ?? null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ builder: data });
}
