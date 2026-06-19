import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brickbook.com.au";

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
  const buildId = getString(formData, "build_id");
  if (!buildId) {
    return NextResponse.json({ error: "Missing build_id." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("build_follows")
    .select("build_id")
    .eq("build_id", buildId)
    .eq("follower_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("build_follows").delete().eq("build_id", buildId).eq("follower_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("build_follows").insert({
      build_id: buildId,
      follower_id: user.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Send new-follower notification to the build owner (fire-and-forget)
    void (async () => {
      try {
        const { data: build } = await supabase
          .from("builds")
          .select("owner_id, title")
          .eq("id", buildId)
          .maybeSingle();
        if (!build || build.owner_id === user.id) return;

        const { data: pref } = await supabase
          .from("notification_preferences")
          .select("new_follower")
          .eq("user_id", build.owner_id)
          .maybeSingle();
        if (pref && pref.new_follower === false) return;

        const admin = createAdminClient();
        const { data: ownerAuth } = await admin.auth.admin.getUserById(build.owner_id);
        const ownerEmail = ownerAuth?.user?.email;
        if (!ownerEmail) return;

        const [{ data: followerProfile }, { data: ownerProfile }] = await Promise.all([
          supabase.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle(),
          supabase.from("profiles").select("username").eq("id", build.owner_id).maybeSingle(),
        ]);

        await sendEmail(ownerEmail, "new-follower", {
          followerName: followerProfile?.display_name || followerProfile?.username || "Someone",
          followerUsername: followerProfile?.username ?? "",
          buildTitle: build.title ?? "your build",
          buildUrl: `${SITE_URL}/${ownerProfile?.username ?? ""}`,
        });
      } catch {}
    })();
  }

  const { count } = await supabase
    .from("build_follows")
    .select("*", { head: true, count: "exact" })
    .eq("build_id", buildId);

  return NextResponse.json({
    following: !existing,
    followerCount: count ?? 0,
  });
}
