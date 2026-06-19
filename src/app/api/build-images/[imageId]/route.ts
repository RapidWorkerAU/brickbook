import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseStoragePath } from "@/lib/storage";

async function getOwnedImage(supabase: Awaited<ReturnType<typeof createClient>>, imageId: string, userId: string) {
  const { data } = await supabase
    .from("build_images")
    .select("id,storage_path,build_id,update_id,selection_id,image_kind,plan_type,builds!inner(owner_id)")
    .eq("id", imageId)
    .eq("builds.owner_id", userId)
    .maybeSingle();
  return data;
}

async function removeStorageObjects(images: { storage_path: string | null }[]) {
  const byBucket = new Map<string, string[]>();
  for (const image of images) {
    if (!image.storage_path) continue;
    const { bucket, path } = parseStoragePath(image.storage_path);
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  }

  const admin = createAdminClient();
  for (const [bucket, paths] of byBucket) {
    await admin.storage.from(bucket).remove(paths);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownedImage = await getOwnedImage(supabase, imageId, user.id);
  if (!ownedImage) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const hasRoomUpdate = body && typeof body === "object" && "room_id" in body;
  const roomId = typeof body?.room_id === "string" ? body.room_id.trim() : "";
  if (roomId) {
    const { data: room } = await supabase.from("rooms").select("id").eq("id", roomId).eq("build_id", ownedImage.build_id).maybeSingle();
    if (!room) return NextResponse.json({ error: "Room does not belong to this build." }, { status: 400 });
  }

  // Handle is_primary: when setting to true, clear it from siblings of the same plan_type first.
  const hasIsPrimaryUpdate = body && typeof body === "object" && "is_primary" in body;
  const isPrimary = hasIsPrimaryUpdate && typeof body.is_primary === "boolean" ? body.is_primary : null;
  if (isPrimary === true && ownedImage.plan_type) {
    await supabase
      .from("build_images")
      .update({ is_primary: false })
      .eq("build_id", ownedImage.build_id)
      .eq("plan_type", ownedImage.plan_type)
      .neq("id", imageId);
  }

  const hasRoomTypeUpdate = body && typeof body === "object" && "room_type" in body;
  const roomType = hasRoomTypeUpdate ? (typeof body.room_type === "string" ? body.room_type.trim() || null : null) : undefined;

  const updatePayload = {
    milestone_id: body?.milestone_id || null,
    ...(hasRoomUpdate ? { room_id: roomId || null } : {}),
    ...(hasRoomTypeUpdate ? { room_type: roomType } : {}),
    visibility: String(body?.visibility ?? "public"),
    notes: typeof body?.notes === "string" ? body.notes.trim() || null : undefined,
    ...(isPrimary !== null ? { is_primary: isPrimary } : {}),
  };

  const { data, error } = await supabase
    .from("build_images")
    .update(updatePayload)
    .eq("id", imageId)
    .select("id,storage_path,milestone_id,room_id,room_type,update_id,selection_id,visibility,image_kind,plan_type,is_primary,notes,created_at")
    .single();
  if (error && !roomId) {
    const fallbackPayload = {
      milestone_id: body?.milestone_id || null,
      ...(hasRoomTypeUpdate ? { room_type: roomType } : {}),
      visibility: String(body?.visibility ?? "public"),
      notes: typeof body?.notes === "string" ? body.notes.trim() || null : undefined,
      ...(isPrimary !== null ? { is_primary: isPrimary } : {}),
    };
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("build_images")
      .update(fallbackPayload)
      .eq("id", imageId)
      .select("id,storage_path,milestone_id,room_type,update_id,selection_id,visibility,image_kind,plan_type,is_primary,notes,created_at")
      .single();
    if (fallbackError || !fallbackData) return NextResponse.json({ error: fallbackError?.message ?? "Failed to save image." }, { status: 400 });
    return NextResponse.json({ image: { ...fallbackData, room_id: null } });
  }
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to save image." }, { status: 400 });
  return NextResponse.json({ image: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const image = await getOwnedImage(supabase, imageId, user.id);
  if (!image) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  const action = new URL(request.url).searchParams.get("postAction");

  if (image.update_id) {
    const { data: postImages, error: postImagesError } = await supabase
      .from("build_images")
      .select("id,storage_path")
      .eq("update_id", image.update_id)
      .eq("build_id", image.build_id);

    if (postImagesError) return NextResponse.json({ error: postImagesError.message }, { status: 400 });
    const linkedImages = postImages ?? [];

    if (linkedImages.length <= 1 && action !== "keep-post" && action !== "delete-post") {
      return NextResponse.json(
        {
          error: "This is the last image on its post.",
          requiresPostImageChoice: true,
          updateId: image.update_id,
        },
        { status: 409 },
      );
    }

    if (action === "delete-post") {
      const imageIds = linkedImages.map((item) => item.id);
      if (imageIds.length) {
        await supabase.from("image_likes").delete().in("image_id", imageIds);
        await supabase.from("comments").delete().in("image_id", imageIds);
      }
      await supabase.from("update_likes").delete().eq("update_id", image.update_id);
      await supabase.from("comments").delete().eq("update_id", image.update_id);
      await supabase.from("notifications").delete().eq("update_id", image.update_id);

      const { error: imagesDeleteError } = await supabase.from("build_images").delete().eq("update_id", image.update_id).eq("build_id", image.build_id);
      if (imagesDeleteError) return NextResponse.json({ error: imagesDeleteError.message }, { status: 400 });

      const { error: updateDeleteError } = await supabase.from("build_updates").delete().eq("id", image.update_id).eq("build_id", image.build_id);
      if (updateDeleteError) return NextResponse.json({ error: updateDeleteError.message }, { status: 400 });

      await removeStorageObjects(linkedImages);
      return NextResponse.json({ ok: true, deletedPost: true, deletedImageIds: imageIds });
    }
  }

  await supabase.from("image_likes").delete().eq("image_id", imageId);
  await supabase.from("comments").delete().eq("image_id", imageId);
  const { error } = await supabase.from("build_images").delete().eq("id", imageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await removeStorageObjects([image]);

  return NextResponse.json({ ok: true, deletedPost: false, deletedImageIds: [imageId] });
}
