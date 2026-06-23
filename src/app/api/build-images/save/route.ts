import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedImageUrls } from "@/lib/storage";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.buildId || !Array.isArray(body.paths) || body.paths.length === 0) {
    return NextResponse.json({ error: "buildId and paths are required." }, { status: 400 });
  }

  const {
    buildId,
    paths,
    milestoneId,
    roomId,
    roomType,
    visibility = "public",
    imageKind = "build",
    notes,
    planType,
  } = body as {
    buildId: string;
    paths: string[];
    milestoneId?: string;
    roomId?: string;
    roomType?: string;
    visibility?: string;
    imageKind?: string;
    notes?: string;
    planType?: string;
  };

  // Verify the user owns this build
  const { data: build } = await supabase.from("builds").select("id").eq("id", buildId).eq("owner_id", user.id).maybeSingle();
  if (!build) return NextResponse.json({ error: "Build not found." }, { status: 404 });

  if (roomId) {
    const { data: room } = await supabase.from("rooms").select("id").eq("id", roomId).eq("build_id", buildId).maybeSingle();
    if (!room) return NextResponse.json({ error: "Room does not belong to this build." }, { status: 400 });
  }

  const inserted = [];
  for (const storagePath of paths) {
    const insertPayload = {
      build_id: buildId,
      milestone_id: milestoneId || null,
      ...(roomId ? { room_id: roomId } : {}),
      ...(roomType ? { room_type: roomType } : {}),
      image_kind: imageKind,
      plan_type: planType || null,
      notes: notes || null,
      visibility,
      storage_path: storagePath,
    };

    const { data, error } = await supabase
      .from("build_images")
      .insert(insertPayload)
      .select("id,storage_path,milestone_id,room_id,room_type,update_id,selection_id,visibility,image_kind,plan_type,is_primary,notes,created_at")
      .single();

    if (error && !roomId) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("build_images")
        .select("id,storage_path,milestone_id,room_type,update_id,selection_id,visibility,image_kind,plan_type,is_primary,notes,created_at")
        .eq("storage_path", storagePath)
        .single();
      if (fallbackError || !fallbackData) continue;
      inserted.push({ ...fallbackData, room_id: null });
      continue;
    }
    if (error || !data) continue;
    inserted.push(data);
  }

  const storagePaths = inserted.map((img) => img.storage_path).filter(Boolean) as string[];
  const signedUrls = await getSignedImageUrls(storagePaths);
  const imagesWithUrls = inserted.map((img) => ({
    ...img,
    imageUrl: img.storage_path ? (signedUrls.get(img.storage_path) ?? null) : null,
  }));

  return NextResponse.json({ images: imagesWithUrls });
}
