import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSignedImageUrls } from "@/lib/storage";

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
  const roomType = getString(formData, "room_type");
  const visibility = getString(formData, "visibility") || "public";
  const imageKind = getString(formData, "image_kind") || "build";
  const planType = getString(formData, "plan_type");
  const notes = getString(formData, "notes");
  const files = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (!buildId || files.length === 0) return NextResponse.json({ error: "Build and images are required." }, { status: 400 });

  const { data: build } = await supabase.from("builds").select("id").eq("id", buildId).eq("owner_id", user.id).maybeSingle();
  if (!build) return NextResponse.json({ error: "Build not found." }, { status: 404 });
  if (roomId) {
    const { data: room } = await supabase.from("rooms").select("id").eq("id", roomId).eq("build_id", buildId).maybeSingle();
    if (!room) return NextResponse.json({ error: "Room does not belong to this build." }, { status: 400 });
  }

  const admin = createAdminClient();
  const bucket = "brickbook-build-images";
  const inserted = [];

  for (const file of files.slice(0, 20)) {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isImage && !isPdf) continue;

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const subfolder = planType ? `plans/${planType}` : "library";
    const path = `${user.id}/${buildId}/${subfolder}/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

    const insertPayload = {
      build_id: buildId,
      milestone_id: milestoneId || null,
      ...(roomId ? { room_id: roomId } : {}),
      ...(roomType ? { room_type: roomType } : {}),
      image_kind: imageKind,
      plan_type: planType || null,
      notes: notes || null,
      visibility,
      storage_path: `${bucket}/${path}`,
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
        .eq("storage_path", `${bucket}/${path}`)
        .single();
      if (fallbackError || !fallbackData) return NextResponse.json({ error: fallbackError?.message ?? "Failed to save image." }, { status: 400 });
      inserted.push({ ...fallbackData, room_id: null });
      continue;
    }
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to save image." }, { status: 400 });
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
