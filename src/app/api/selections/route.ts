import { NextResponse } from "next/server";
import { normalizeSelectionType } from "@/lib/selection-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const buildId = getString(formData, "build_id");
  if (!buildId) return NextResponse.json({ error: "Build is required." }, { status: 400 });
  const { data: build } = await supabase.from("builds").select("id").eq("id", buildId).eq("owner_id", user.id).maybeSingle();
  if (!build) return NextResponse.json({ error: "Build not found." }, { status: 404 });

  const roomId = getString(formData, "room_id") || null;
  if (roomId && !(await roomBelongsToBuild(supabase, roomId, buildId))) {
    return NextResponse.json({ error: "Room does not belong to this build." }, { status: 400 });
  }

  const linkedImageId = getString(formData, "image_id") || null;
  if (linkedImageId && !(await imageBelongsToBuild(supabase, linkedImageId, buildId))) {
    return NextResponse.json({ error: "Image does not belong to this build." }, { status: 400 });
  }

  const image = formData.get("image");
  if (image instanceof File && image.size > 0 && !image.type.startsWith("image/")) return NextResponse.json({ error: "Selection image must be an image." }, { status: 400 });
  if (image instanceof File && image.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Selection image must be under 12MB." }, { status: 400 });

  const { data, error } = await supabase
    .from("selections")
    .insert({
      build_id: buildId,
      ...selectionPayload(formData),
      room_id: roomId,
      image_path: null,
    })
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create selection." }, { status: 400 });

  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) return NextResponse.json({ error: "Selection image must be an image." }, { status: 400 });
    if (image.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Selection image must be under 12MB." }, { status: 400 });

    const bucket = "brickbook-build-images";
    const ext = image.name.includes(".") ? image.name.slice(image.name.lastIndexOf(".")) : "";
    const path = `${user.id}/${buildId}/selections/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await createAdminClient().storage.from(bucket).upload(path, Buffer.from(await image.arrayBuffer()), {
      upsert: false,
      contentType: image.type || "application/octet-stream",
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
    const { error: imageError } = await supabase.from("build_images").insert({
      build_id: buildId,
      selection_id: data.id,
      image_kind: "selection",
      visibility: getString(formData, "visibility") || "public",
      storage_path: `${bucket}/${path}`,
    });
    if (imageError) return NextResponse.json({ error: imageError.message }, { status: 400 });
  } else if (linkedImageId) {
    const { error: imageError } = await supabase.from("build_images").update({ selection_id: data.id, image_kind: "selection" }).eq("id", linkedImageId);
    if (imageError) return NextResponse.json({ error: imageError.message }, { status: 400 });
  }

  return NextResponse.json({ selection: data });
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
