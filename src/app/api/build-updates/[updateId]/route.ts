import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  updateId: string,
  userId: string,
) {
  const { data: update } = await supabase
    .from("build_updates")
    .select("id, build_id")
    .eq("id", updateId)
    .maybeSingle();
  if (!update) return null;

  const { data: build } = await supabase
    .from("builds")
    .select("id")
    .eq("id", update.build_id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!build) return null;

  return update;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ updateId: string }> },
) {
  const { updateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const update = await verifyOwnership(supabase, updateId, user.id);
  if (!update) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("build_updates").delete().eq("id", updateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ updateId: string }> },
) {
  const { updateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const update = await verifyOwnership(supabase, updateId, user.id);
  if (!update) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload: Record<string, unknown> = {};
  if (typeof body.content === "string") payload.content = body.content;
  if ("milestone_id" in body) payload.milestone_id = body.milestone_id ?? null;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("build_updates").update(payload).eq("id", updateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
