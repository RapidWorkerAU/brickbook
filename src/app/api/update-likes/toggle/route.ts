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

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const updateId = getString(formData, "update_id");
  if (!updateId) return NextResponse.json({ error: "Missing update_id." }, { status: 400 });

  const { data: existing } = await supabase
    .from("update_likes")
    .select("update_id")
    .eq("update_id", updateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("update_likes").delete().eq("update_id", updateId).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("update_likes").insert({ update_id: updateId, user_id: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { count } = await supabase.from("update_likes").select("*", { head: true, count: "exact" }).eq("update_id", updateId);
  return NextResponse.json({ liked: !existing, likeCount: count ?? 0 });
}
