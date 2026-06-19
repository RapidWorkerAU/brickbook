import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const buildId = getString(formData, "build_id");
  const milestoneId = getString(formData, "milestone_id");
  const roomId = getString(formData, "room_id");
  const content = getString(formData, "content");
  const files = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);

  if (!buildId || !content) {
    return NextResponse.json({ error: "Build and caption are required." }, { status: 400 });
  }

  const { data: build } = await supabase
    .from("builds")
    .select("id,owner_id")
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!build) return NextResponse.json({ error: "Build not found." }, { status: 404 });
  if (roomId) {
    const { data: room } = await supabase.from("rooms").select("id").eq("id", roomId).eq("build_id", buildId).maybeSingle();
    if (!room) return NextResponse.json({ error: "Room does not belong to this build." }, { status: 400 });
  }

  const { data: update, error: updateError } = await supabase
    .from("build_updates")
    .insert({
      build_id: buildId,
      milestone_id: milestoneId || null,
      room_id: roomId || null,
      author_id: user.id,  // FIX 1: was user_id, correct column is author_id
      content,
    })
    .select("id")
    .single();

  if (updateError || !update) {
    return NextResponse.json({ error: updateError?.message ?? "Failed to create update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const bucket = "brickbook-build-images";

  for (const file of files.slice(0, 10)) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Each image must be under 12MB." }, { status: 400 });
    }

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const path = `${user.id}/${buildId}/updates/${update.id}/${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { error: imageError } = await supabase.from("build_images").insert({
      build_id: buildId,
      milestone_id: milestoneId || null,
      update_id: update.id,
      image_kind: "update",
      storage_path: `${bucket}/${path}`,
    });

    if (imageError) {
      return NextResponse.json({ error: imageError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ updateId: update.id });
}
