import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function assertOwnsBuild(supabase: Awaited<ReturnType<typeof createClient>>, buildId: string, userId: string) {
  const { data } = await supabase.from("builds").select("id").eq("id", buildId).eq("owner_id", userId).maybeSingle();
  return Boolean(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const buildId = String(body?.build_id ?? "").trim();
  const title = String(body?.title ?? "").trim();
  if (!buildId || !title) return NextResponse.json({ error: "Build and title are required." }, { status: 400 });
  if (!(await assertOwnsBuild(supabase, buildId, user.id))) return NextResponse.json({ error: "Build not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("milestones")
    .insert({
      build_id: buildId,
      title,
      status: String(body?.status ?? "pending"),
      visibility: String(body?.visibility ?? "public"),
      sort_order: Number(body?.sort_order ?? 0),
      start_date: body?.start_date || null,
      end_date: body?.end_date || null,
    })
    .select("id,title,status,start_date,end_date,visibility,sort_order")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create milestone." }, { status: 400 });
  return NextResponse.json({ milestone: data });
}
