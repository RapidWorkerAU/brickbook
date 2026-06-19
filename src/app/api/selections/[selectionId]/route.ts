import { NextResponse } from "next/server";
import { normalizeSelectionType } from "@/lib/selection-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseStoragePath } from "@/lib/storage";

async function getOwnedSelection(supabase: Awaited<ReturnType<typeof createClient>>, selectionId: string, userId: string) {
  const { data } = await supabase
    .from("selections")
    .select("id,build_id,image_path,builds!inner(owner_id)")
    .eq("id", selectionId)
    .eq("builds.owner_id", userId)
    .maybeSingle();
  return data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ selectionId: string }> }) {
  const { selectionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownedSelection = await getOwnedSelection(supabase, selectionId, user.id);
  if (!ownedSelection) return NextResponse.json({ error: "Selection not found." }, { status: 404 });

  const formData = await request.formData();
  const roomId = getString(formData, "room_id") || null;
  if (roomId && !(await roomBelongsToBuild(supabase, roomId, ownedSelection.build_id))) {
    return NextResponse.json({ error: "Room does not belong to this build." }, { status: 400 });
  }

  const linkedImageId = formData.has("image_id") ? getString(formData, "image_id") || null : undefined;
  if (linkedImageId && !(await imageBelongsToBuild(supabase, linkedImageId, ownedSelection.build_id))) {
    return NextResponse.json({ error: "Image does not belong to this build." }, { status: 400 });
  }

  let imagePath = typeof ownedSelection.image_path === "string" ? ownedSelection.image_path : null;
  const image = formData.get("image");
  let uploadedImagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) return NextResponse.json({ error: "Selection image must be an image." }, { status: 400 });
    if (image.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Selection image must be under 12MB." }, { status: 400 });

    const bucket = "brickbook-build-images";
    const ext = image.name.includes(".") ? image.name.slice(image.name.lastIndexOf(".")) : "";
    const path = `${user.id}/${ownedSelection.build_id}/selections/${selectionId}/${crypto.randomUUID()}${ext}`;
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, Buffer.from(await image.arrayBuffer()), {
      upsert: false,
      contentType: image.type || "application/octet-stream",
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
    if (imagePath) {
      const current = parseStoragePath(imagePath);
      await admin.storage.from(current.bucket).remove([current.path]);
    }
    uploadedImagePath = `${bucket}/${path}`;
    imagePath = null;
  } else if (linkedImageId) {
    if (imagePath) {
      const current = parseStoragePath(imagePath);
      await createAdminClient().storage.from(current.bucket).remove([current.path]);
    }
    imagePath = null;
  }

  const updatePayload = {
    ...selectionPayload(formData),
    room_id: roomId,
    image_path: imagePath,
  };

  const { data, error } = await supabase
    .from("selections")
    .update(updatePayload)
    .eq("id", selectionId)
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to save selection." }, { status: 400 });

  if (uploadedImagePath) {
    const { error: imageError } = await supabase.from("build_images").insert({
      build_id: ownedSelection.build_id,
      selection_id: selectionId,
      image_kind: "selection",
      visibility: getString(formData, "visibility") || "public",
      storage_path: uploadedImagePath,
    });
    if (imageError) return NextResponse.json({ error: imageError.message }, { status: 400 });
  } else if (linkedImageId) {
    const { error: imageError } = await supabase.from("build_images").update({ selection_id: selectionId, image_kind: "selection" }).eq("id", linkedImageId);
    if (imageError) return NextResponse.json({ error: imageError.message }, { status: 400 });
  }

  return NextResponse.json({ selection: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ selectionId: string }> }) {
  const { selectionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const selection = await getOwnedSelection(supabase, selectionId, user.id);
  if (!selection) return NextResponse.json({ error: "Selection not found." }, { status: 404 });
  const { error } = await supabase.from("selections").delete().eq("id", selectionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (typeof selection.image_path === "string" && selection.image_path) {
    const { bucket, path } = parseStoragePath(selection.image_path);
    await createAdminClient().storage.from(bucket).remove([path]);
  }
  return NextResponse.json({ ok: true });
}

function selectionPayload(formData: FormData) {
  return {
    title: selectionTitle(formData),
    selection_type: normalizeSelectionType(getString(formData, "selection_type")),
    category: getStringOrNull(formData, "category"),
    subcategory: getStringOrNull(formData, "subcategory"),
    location: getStringOrNull(formData, "location"),
    item_name: getStringOrNull(formData, "item_name"),
    material_type: getStringOrNull(formData, "material_type"),
    brand: getStringOrNull(formData, "brand"),
    product_name: getStringOrNull(formData, "product_name"),
    model: getStringOrNull(formData, "model"),
    colour_name: getStringOrNull(formData, "colour_name"),
    code: getStringOrNull(formData, "code"),
    finish: getStringOrNull(formData, "finish"),
    supplier: getStringOrNull(formData, "supplier"),
    product_url: getStringOrNull(formData, "product_url"),
    notes: getStringOrNull(formData, "notes"),
    visibility: getString(formData, "visibility") || "public",
  };
}

function selectionTitle(formData: FormData) {
  return (
    getString(formData, "item_name") ||
    getString(formData, "product_name") ||
    getString(formData, "colour_name") ||
    getString(formData, "subcategory") ||
    getString(formData, "category") ||
    "Selection"
  );
}

async function roomBelongsToBuild(supabase: Awaited<ReturnType<typeof createClient>>, roomId: string, buildId: string) {
  const { data } = await supabase.from("rooms").select("id").eq("id", roomId).eq("build_id", buildId).maybeSingle();
  return Boolean(data);
}

async function imageBelongsToBuild(supabase: Awaited<ReturnType<typeof createClient>>, imageId: string, buildId: string) {
  const { data } = await supabase.from("build_images").select("id").eq("id", imageId).eq("build_id", buildId).maybeSingle();
  return Boolean(data);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringOrNull(formData: FormData, key: string) {
  return getString(formData, key) || null;
}
