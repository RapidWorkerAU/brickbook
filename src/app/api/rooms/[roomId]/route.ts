import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getOwnedRoom(supabase: Awaited<ReturnType<typeof createClient>>, roomId: string, userId: string) {
  const { data } = await supabase
    .from("rooms")
    .select("id,build_id,builds!inner(owner_id)")
    .eq("id", roomId)
    .eq("builds.owner_id", userId)
    .maybeSingle();
  return data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getOwnedRoom(supabase, roomId, user.id))) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Room name is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("rooms")
    .update({
      name,
      room_type: emptyToNull(body?.room_type),
      level: emptyToNull(body?.level),
      notes: emptyToNull(body?.notes),
    })
    .eq("id", roomId)
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to save room." }, { status: 400 });
  return NextResponse.json({ room: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getOwnedRoom(supabase, roomId, user.id))) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

function emptyToNull(value: unknown) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
}
