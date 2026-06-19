import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("image_selection_tags")
    .select("id,selection_id,selections(id,category,subcategory,item_name,brand,product_name,colour_name,material_type)")
    .eq("image_id", imageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tags: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.selectionId) return NextResponse.json({ error: "selectionId required." }, { status: 400 });

  const { data: imageRow } = await supabase
    .from("build_images")
    .select("build_id")
    .eq("id", imageId)
    .maybeSingle();

  if (!imageRow) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  const { data: buildRow } = await supabase
    .from("builds")
    .select("id")
    .eq("id", imageRow.build_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!buildRow) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: tag, error } = await supabase
    .from("image_selection_tags")
    .upsert({ image_id: imageId, selection_id: body.selectionId }, { onConflict: "image_id,selection_id" })
    .select("id,selection_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tag });
}
