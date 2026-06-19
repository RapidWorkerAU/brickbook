import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";

const ADMIN_REPORT_EMAIL = "enquiries@brickbook.com.au";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // New users
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const newUsers = users.filter((u) => u.created_at >= since).length;

  // Aggregate engagement from the last 7 days
  const [
    { count: totalLikes },
    { count: totalFollows },
    { count: totalComments },
    { count: activeBuilds },
  ] = await Promise.all([
    admin.from("update_likes").select("*", { head: true, count: "exact" }).gte("created_at", since),
    admin.from("build_follows").select("*", { head: true, count: "exact" }).gte("created_at", since),
    admin.from("comments").select("*", { head: true, count: "exact" }).gte("created_at", since),
    admin.from("builds").select("*", { head: true, count: "exact" }).eq("is_listed", true),
  ]);

  const weekOf = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  await sendEmail(ADMIN_REPORT_EMAIL, "weekly-site-summary", {
    weekOf,
    newUsers,
    totalLikes: totalLikes ?? 0,
    totalFollows: totalFollows ?? 0,
    totalComments: totalComments ?? 0,
    activeBuilds: activeBuilds ?? 0,
  });

  return NextResponse.json({ ok: true });
}
