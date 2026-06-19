import { redirect } from "next/navigation";
import { BuildEditorClient } from "@/app/dashboard/builds/[buildId]/build-editor-client";
import type { LibraryImage } from "@/app/dashboard/builds/[buildId]/images/images-client";
import type { EditableMilestone } from "@/app/dashboard/builds/[buildId]/milestones/milestones-client";
import type { EditableRoom, EditableSelection } from "@/app/dashboard/builds/[buildId]/selections/selections-client";

export type PlanningSuburb = { id: string; build_id: string; suburb_name: string; notes: string | null; sort_order: number; created_at: string };
export type PlanningBuilder = { id: string; build_id: string; builder_name: string; website: string | null; notes: string | null; sort_order: number; created_at: string };
import { getBuilderOptions } from "@/lib/builders";
import { getSignedImageUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type EditableBuild = {
  id: string;
  title: string;
  slug: string;
  cover_image_path: string | null;
  coverImageUrl?: string | null;
  builder_id: string | null;
  builder_name: string | null;
  suburb_name: string | null;
  estate_name: string | null;
  style: string | null;
  is_listed: boolean | null;
  standard_visibility: string | null;
  timeline_visibility: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  separate_toilets: number | null;
  garage_spaces: number | null;
  land_size_m2: number | null;
  internal_size_m2: number | null;
  alfresco_size_m2: number | null;
  home_width_m: number | null;
  home_depth_m: number | null;
  build_type: string | null;
  construction_type: string | null;
  roof_structure: string | null;
  home_design_style: string | null;
  stage: string | null;
  state: string | null;
  planning_styles: string[] | null;
  budget_land_min: number | null;
  budget_land_max: number | null;
  budget_build_min: number | null;
  budget_build_max: number | null;
  description: string | null;
};

async function getBuildImages(supabase: Awaited<ReturnType<typeof createClient>>, buildId: string) {
  const withRoom = await supabase
    .from("build_images")
    .select("id,storage_path,milestone_id,room_id,room_type,update_id,selection_id,visibility,image_kind,plan_type,is_primary,notes,created_at")
    .eq("build_id", buildId)
    .order("created_at", { ascending: false });

  if (!withRoom.error) return withRoom.data ?? [];

  const fallback = await supabase
    .from("build_images")
    .select("id,storage_path,milestone_id,update_id,selection_id,visibility,image_kind,plan_type,is_primary,notes,created_at")
    .eq("build_id", buildId)
    .order("created_at", { ascending: false });

  return (fallback.data ?? []).map((image) => ({ ...image, room_id: null }));
}

export default async function BuildEditorPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/get-started?tab=login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const { data: build } = await supabase
    .from("builds")
    .select("id,title,slug,cover_image_path,builder_id,builder_name,suburb_name,estate_name,style,is_listed,standard_visibility,timeline_visibility,bedrooms,bathrooms,separate_toilets,garage_spaces,land_size_m2,internal_size_m2,alfresco_size_m2,home_width_m,home_depth_m,build_type,construction_type,roof_structure,home_design_style,stage,state,planning_styles,budget_land_min,budget_land_max,budget_build_min,budget_build_max,description")
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .maybeSingle<EditableBuild>();

  if (!build) redirect("/dashboard/builds");

  const [imageData, { data: milestoneData }, { data: selectionData }, { data: roomData }, { data: planningSuburbData }, { data: planningBuilderData }] = await Promise.all([
    getBuildImages(supabase, build.id),
    supabase
      .from("milestones")
      .select("id,title,status,start_date,end_date,visibility,sort_order")
      .eq("build_id", build.id)
      .order("sort_order"),
    supabase
      .from("selections")
      .select("id,selection_type,category,subcategory,location,room_id,item_name,material_type,brand,product_name,model,colour_name,code,finish,supplier,product_url,image_path,notes,visibility")
      .eq("build_id", build.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("rooms")
      .select("id,build_id,name,room_type,level,notes,created_at")
      .eq("build_id", build.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("planning_suburbs")
      .select("id,build_id,suburb_name,notes,sort_order,created_at")
      .eq("build_id", build.id)
      .order("sort_order"),
    supabase
      .from("planning_builders")
      .select("id,build_id,builder_name,website,notes,sort_order,created_at")
      .eq("build_id", build.id)
      .order("sort_order"),
  ]);
  const builderOptions = await getBuilderOptions();

  const images = imageData as Omit<LibraryImage, "imageUrl">[];
  const selections = (selectionData ?? []) as Omit<EditableSelection, "imageUrl">[];
  const signedUrls = await getSignedImageUrls([
    build.cover_image_path,
    ...images.map((image) => image.storage_path).filter(Boolean),
    ...selections.map((selection) => selection.image_path).filter(Boolean),
  ].filter(Boolean) as string[]);
  const imagesBySelectionId = new Map<string, { id: string; imageUrl: string | null }>();
  images.forEach((image) => {
    if (image.selection_id && !imagesBySelectionId.has(image.selection_id)) {
      imagesBySelectionId.set(image.selection_id, {
        id: image.id,
        imageUrl: image.storage_path ? signedUrls.get(image.storage_path) ?? null : null,
      });
    }
  });
  const userContext = {
    username: profile.username,
    display_name: profile.display_name ?? undefined,
    avatar_path: profile.avatar_path ?? undefined,
  };

  return (
    <BuildEditorClient
      build={{
        ...build,
        coverImageUrl: build.cover_image_path ? signedUrls.get(build.cover_image_path) ?? null : null,
      }}
      user={userContext}
      builderOptions={builderOptions}
      initialMilestones={(milestoneData ?? []) as EditableMilestone[]}
      initialImages={images.map((image) => ({
        ...image,
        imageUrl: image.storage_path ? signedUrls.get(image.storage_path) ?? null : null,
      }))}
      initialSelections={selections.map((selection) => ({
        ...selection,
        linked_image_id: imagesBySelectionId.get(selection.id)?.id ?? null,
        imageUrl: selection.image_path ? signedUrls.get(selection.image_path) ?? null : imagesBySelectionId.get(selection.id)?.imageUrl ?? null,
      }))}
      initialRooms={(roomData ?? []) as EditableRoom[]}
      initialPlanningSuburbs={(planningSuburbData ?? []) as PlanningSuburb[]}
      initialPlanningBuilders={(planningBuilderData ?? []) as PlanningBuilder[]}
    />
  );
}
