import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Users who have opted into the weekly digest
  const { data: optedIn } = await admin
    .from("notification_preferences")
    .select("user_id")
    .eq("email_digest", true);

  if (!optedIn?.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: "No opted-in users." });
  }

  const userIds = optedIn.map((row) => row.user_id as string);
  let sent = 0;

  for (const userId of userIds) {
    try {
      // Get all build IDs owned by this user
      const { data: builds } = await admin
        .from("builds")
        .select("id, title")
        .eq("owner_id", userId);

      if (!builds?.length) continue;
      const buildIds = builds.map((b) => b.id as string);

      // Aggregate weekly stats across all their builds
      const [
        { count: newFollowers },
        { count: newComments },
        { count: newLikes },
      ] = await Promise.all([
        admin.from("build_follows").select("*", { head: true, count: "exact" }).in("build_id", buildIds).gte("created_at", since),
        admin.from("comments").select("*", { head: true, count: "exact" }).in("build_id", buildIds).gte("created_at", since),
        admin.from("update_likes").select("*", { head: true, count: "exact" }).in("build_id", buildIds).gte("created_at", since),
      ]);

      const stats = {
        newFollowers: newFollowers ?? 0,
        newComments: newComments ?? 0,
        newLikes: newLikes ?? 0,
        newSaves: 0,
      };

      // Skip users with zero activity
      if (Object.values(stats).every((v) => v === 0)) continue;

      // Get email + profile
      const [{ data: authUser }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(userId),
        admin.from("profiles").select("username, display_name").eq("id", userId).maybeSingle(),
      ]);

      const email = authUser?.user?.email;
      if (!email) continue;

      await sendEmail(email, "weekly-digest", {
        displayName: profile?.display_name || profile?.username || "there",
        username: profile?.username ?? "",
        stats,
      });

      sent++;
    } catch {
      // Skip individual failures — don't abort the whole batch
    }
  }

  return NextResponse.json({ ok: true, sent });
}
