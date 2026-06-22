import slugify from "slugify";
import { NextResponse } from "next/server";
import { ensureBuilderForName } from "@/lib/builders";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brickbook.com.au";

export async function PATCH(request: Request, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Snapshot is_listed before the update so we can detect the false→true transition
  const { data: currentBuild } = await supabase
    .from("builds")
    .select("is_listed, title")
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .maybeSingle();
  const wasListed = currentBuild?.is_listed ?? false;

  const contentType = request.headers.get("content-type") ?? "";
  const formData = contentType.includes("multipart/form-data") ? await request.formData().catch(() => null) : null;
  const body = formData ? formDataToBody(formData) : await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Build name is required." }, { status: 400 });
  let builder = null;
  try {
    builder = await ensureBuilderForName(body.builderName);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save builder." }, { status: 400 });
  }

  let coverImagePath: string | null | undefined;
  const coverImage = formData?.get("coverImage");
  if (coverImage instanceof File && coverImage.size > 0) {
    if (!coverImage.type.startsWith("image/")) {
      return NextResponse.json({ error: "Cover image must be an image file." }, { status: 400 });
    }
    if (coverImage.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Cover image must be under 10MB." }, { status: 400 });
    }

    const admin = createAdminClient();
    const bucket = "brickbook-build-images";
    const ext = coverImage.name.includes(".") ? coverImage.name.slice(coverImage.name.lastIndexOf(".")) : "";
    const path = `${user.id}/covers/${Date.now()}-${slugify(title, { lower: true, strict: true }) || "build"}${ext}`;
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, Buffer.from(await coverImage.arrayBuffer()), {
      upsert: false,
      contentType: coverImage.type || "application/octet-stream",
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }
    coverImagePath = `${bucket}/${path}`;
  }

  const payload = {
    title,
    slug: slugify(title, { lower: true, strict: true }),
    ...(coverImagePath ? { cover_image_path: coverImagePath } : {}),
    description: emptyToNull(body.description),
    builder_id: builder?.id ?? null,
    builder_name: builder?.name ?? emptyToNull(body.builderName),
    suburb_name: emptyToNull(body.suburbName),
    state: emptyToNull(body.state),
    estate_name: emptyToNull(body.estateName),
    style: emptyToNull(body.buildType),
    is_listed: Boolean(body.isListed),
    standard_visibility: String(body.standardVisibility ?? "public"),
    timeline_visibility: String(body.timelineVisibility ?? "public"),
    bedrooms: numberOrNull(body.bedrooms),
    bathrooms: numberOrNull(body.bathrooms),
    separate_toilets: numberOrNull(body.separateToilets),
    garage_spaces: numberOrNull(body.garageSpaces),
    land_size_m2: numberOrNull(body.landSizeM2),
    internal_size_m2: numberOrNull(body.internalSizeM2),
    alfresco_size_m2: numberOrNull(body.alfrescoSizeM2),
    home_width_m: numberOrNull(body.homeWidthM),
    home_depth_m: numberOrNull(body.homeDepthM),
    build_type: emptyToNull(body.buildTypeDetail),
    construction_type: emptyToNull(body.constructionType),
    roof_structure: emptyToNull(body.roofStructure),
    home_design_style: emptyToNull(body.homeDesignStyle),
    stage: emptyToNull(body.stage),
    ...("planningStyles" in body ? {
      planning_styles: Array.isArray(body.planningStyles) ? body.planningStyles : (body.planningStyles ? String(body.planningStyles).split(",").filter(Boolean) : []),
    } : {}),
    ...("budgetLandMin" in body ? { budget_land_min: numberOrNull(body.budgetLandMin) } : {}),
    ...("budgetLandMax" in body ? { budget_land_max: numberOrNull(body.budgetLandMax) } : {}),
    ...("budgetBuildMin" in body ? { budget_build_min: numberOrNull(body.budgetBuildMin) } : {}),
    ...("budgetBuildMax" in body ? { budget_build_max: numberOrNull(body.budgetBuildMax) } : {}),
  };

  const { data, error } = await supabase
    .from("builds")
    .update(payload)
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .select("id,slug")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to save build." }, { status: 400 });
  }

  // Send build-published email when a build goes live for the first time (fire-and-forget)
  const nowListed = Boolean(body.isListed);
  if (!wasListed && nowListed && user.email) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    void sendEmail(user.email, "build-published", {
      buildTitle: title,
      buildUrl: `${SITE_URL}/${ownerProfile?.username ?? ""}`,
    }).catch(() => null);
  }

  return NextResponse.json({ build: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: build } = await supabase
    .from("builds")
    .select("id")
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!build) return NextResponse.json({ error: "Build not found" }, { status: 404 });

  const { error } = await supabase
    .from("builds")
    .delete()
    .eq("id", buildId)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

function emptyToNull(value: unknown) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
}

function formDataToBody(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).filter((entry) => typeof entry[1] === "string"),
  );
}

function numberOrNull(value: unknown) {
  if (value === "" || value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
