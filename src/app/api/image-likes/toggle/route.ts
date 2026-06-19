import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const imageId = getString(formData, "image_id");
  if (!imageId) {
    return NextResponse.json({ error: "Missing image_id." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("image_likes")
    .select("image_id")
    .eq("image_id", imageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("image_likes").delete().eq("image_id", imageId).eq("user_id", user.id);
  } else {
    await supabase.from("image_likes").insert({
      image_id: imageId,
      user_id: user.id,
    });
  }

  const { count } = await supabase
    .from("image_likes")
    .select("*", { head: true, count: "exact" })
    .eq("image_id", imageId);

  return NextResponse.json({
    liked: !existing,
    likeCount: count ?? 0,
  });
}
