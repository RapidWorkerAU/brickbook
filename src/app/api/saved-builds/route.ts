import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const buildId = String(body?.build_id ?? "").trim();
  if (!buildId) return NextResponse.json({ error: "build_id is required." }, { status: 400 });

  const { data, error } = await supabase.from("saved_builds").upsert({ user_id: user.id, build_id: buildId }, { onConflict: "user_id,build_id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ saved: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get("build_id");
  if (!buildId) return NextResponse.json({ error: "build_id is required." }, { status: 400 });

  const { error } = await supabase.from("saved_builds").delete().eq("user_id", user.id).eq("build_id", buildId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
