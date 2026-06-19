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
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newUsers = users.filter((u) => new Date(u.created_at) >= since);

  if (newUsers.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No new signups today." });
  }

  const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const emails = newUsers.map((u) => u.email ?? "(no email)");

  await sendEmail(ADMIN_REPORT_EMAIL, "daily-signup-report", {
    date,
    count: newUsers.length,
    emails,
  });

  return NextResponse.json({ ok: true, sent: newUsers.length });
}
