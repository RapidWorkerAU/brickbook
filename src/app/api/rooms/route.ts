import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const buildId = String(body?.build_id ?? "").trim();
  const name = String(body?.name ?? "").trim();
  if (!buildId || !name) return NextResponse.json({ error: "Build and room name are required." }, { status: 400 });

  const { data: build } = await supabase.from("builds").select("id").eq("id", buildId).eq("owner_id", user.id).maybeSingle();
  if (!build) return NextResponse.json({ error: "Build not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      build_id: buildId,
      name,
      room_type: emptyToNull(body?.room_type),
      level: emptyToNull(body?.level),
      notes: emptyToNull(body?.notes),
    })
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create room." }, { status: 400 });
  return NextResponse.json({ room: data });
}

function emptyToNull(value: unknown) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
}
