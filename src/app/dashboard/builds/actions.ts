"use server";

import slugify from "slugify";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureBuilderForName } from "@/lib/builders";

export type CreateBuildState = {
  error?: string;
};

export async function createBuild(_state: CreateBuildState, formData: FormData): Promise<CreateBuildState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to sign in before creating a build." };

  const title = String(formData.get("title") ?? "").trim();
  const suburbName = String(formData.get("suburbName") ?? "").trim();
  const buildType = String(formData.get("buildType") ?? "").trim();
  const builderName = emptyToNull(formData.get("builderName"));
  const coverImage = formData.get("coverImage");

  if (!title || !suburbName || !buildType) {
    return { error: "Build name, suburb, and build type are required." };
  }

  const slug = slugify(title, { lower: true, strict: true });
  let builder = null;
  try {
    builder = await ensureBuilderForName(builderName);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save builder." };
  }
  let coverImagePath: string | null = null;

  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) {
      return { error: "Cover image must be an image file." };
    }
    if (coverImage.size > 10 * 1024 * 1024) {
      return { error: "Cover image must be under 10MB." };
    }

    const admin = createAdminClient();
    const bucket = "brickbook-build-images";
    const ext = coverImage.name.includes(".") ? coverImage.name.slice(coverImage.name.lastIndexOf(".")) : "";
    const path = `${user.id}/covers/${Date.now()}-${slug || "build"}${ext}`;
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, Buffer.from(await coverImage.arrayBuffer()), {
      upsert: false,
      contentType: coverImage.type || "application/octet-stream",
    });

    if (uploadError) return { error: uploadError.message };
    coverImagePath = `${bucket}/${path}`;
  }

  const payload = {
    owner_id: user.id,
    title,
    slug,
    cover_image_path: coverImagePath,
    suburb_name: suburbName,
    estate_name: emptyToNull(formData.get("estateName")),
    builder_id: builder?.id ?? null,
    builder_name: builder?.name ?? builderName,
    style: buildType,
    is_listed: formData.get("isListed") === "true",
    standard_visibility: String(formData.get("standardVisibility") ?? "public"),
    timeline_visibility: String(formData.get("timelineVisibility") ?? "public"),
  };

  const { data: build, error } = await supabase.from("builds").insert(payload).select("id").single();
  if (error || !build) return { error: error?.message ?? "Unable to create build." };

  redirect(`/dashboard/builds/${build.id}`);
}

function emptyToNull(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
}
