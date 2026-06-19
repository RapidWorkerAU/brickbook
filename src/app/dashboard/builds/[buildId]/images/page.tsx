import { ImagesClient, type LibraryImage } from "@/app/dashboard/builds/[buildId]/images/images-client";
import { getManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";
import { getSignedImageUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

async function getBuildImages(supabase: Awaited<ReturnType<typeof createClient>>, buildId: string) {
  const withRoom = await supabase
    .from("build_images")
    .select("id,storage_path,milestone_id,room_id,update_id,selection_id,visibility,image_kind,notes,created_at")
    .eq("build_id", buildId)
    .order("created_at", { ascending: false });

  if (!withRoom.error) return withRoom.data ?? [];

  const fallback = await supabase
    .from("build_images")
    .select("id,storage_path,milestone_id,update_id,selection_id,visibility,image_kind,notes,created_at")
    .eq("build_id", buildId)
    .order("created_at", { ascending: false });

  return (fallback.data ?? []).map((image) => ({ ...image, room_id: null }));
}

export default async function BuildImagesPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = await params;
  const { supabase, build, user } = await getManagedBuild(buildId);

  const [imageData, { data: milestoneData }, { data: roomData }] = await Promise.all([
    getBuildImages(supabase, build.id),
    supabase.from("milestones").select("id,title").eq("build_id", build.id).order("sort_order"),
    supabase.from("rooms").select("id,name").eq("build_id", build.id).order("created_at", { ascending: true }),
  ]);

  const images = imageData as Omit<LibraryImage, "imageUrl">[];
  const signedUrls = await getSignedImageUrls(images.map((image) => image.storage_path).filter(Boolean) as string[]);

  return (
    <ImagesClient
      build={build}
      user={user}
      milestones={(milestoneData ?? []) as { id: string; title: string }[]}
      rooms={(roomData ?? []) as { id: string; name: string }[]}
      initialImages={images.map((image) => ({
        ...image,
        imageUrl: image.storage_path ? signedUrls.get(image.storage_path) ?? null : null,
      }))}
    />
  );
}
