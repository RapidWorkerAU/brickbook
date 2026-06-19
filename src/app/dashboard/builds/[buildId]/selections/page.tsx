import { SelectionsClient, type EditableRoom, type EditableSelection } from "@/app/dashboard/builds/[buildId]/selections/selections-client";
import type { LibraryImage } from "@/app/dashboard/builds/[buildId]/images/images-client";
import { getManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";
import { getSignedImageUrls } from "@/lib/storage";

export default async function BuildSelectionsPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = await params;
  const { supabase, build, user } = await getManagedBuild(buildId);
  const [{ data }, { data: rooms }, { data: imageData }] = await Promise.all([
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
      .from("build_images")
      .select("id,storage_path,milestone_id,selection_id,visibility,created_at")
      .eq("build_id", build.id)
      .order("created_at", { ascending: false }),
  ]);

  const selections = (data ?? []) as Omit<EditableSelection, "imageUrl">[];
  const images = (imageData ?? []) as Omit<LibraryImage, "imageUrl">[];
  const signedUrls = await getSignedImageUrls([
    ...images.map((image) => image.storage_path).filter(Boolean),
    ...selections.map((selection) => selection.image_path).filter(Boolean),
  ] as string[]);
  const imagesBySelectionId = new Map<string, { id: string; imageUrl: string | null }>();
  images.forEach((image) => {
    if (image.selection_id && !imagesBySelectionId.has(image.selection_id)) {
      imagesBySelectionId.set(image.selection_id, {
        id: image.id,
        imageUrl: image.storage_path ? signedUrls.get(image.storage_path) ?? null : null,
      });
    }
  });

  return (
    <SelectionsClient
      build={build}
      user={user}
      initialRooms={(rooms ?? []) as EditableRoom[]}
      imageOptions={images.map((image, index) => ({
        id: image.id,
        imageUrl: image.storage_path ? signedUrls.get(image.storage_path) ?? null : null,
        label: `Build image ${index + 1}`,
      }))}
      initialSelections={selections.map((selection) => ({
        ...selection,
        linked_image_id: imagesBySelectionId.get(selection.id)?.id ?? null,
        imageUrl: selection.image_path ? signedUrls.get(selection.image_path) ?? null : imagesBySelectionId.get(selection.id)?.imageUrl ?? null,
      }))}
    />
  );
}
