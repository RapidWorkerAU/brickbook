import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getOwnedMilestone(supabase: Awaited<ReturnType<typeof createClient>>, milestoneId: string, userId: string) {
  const { data } = await supabase
    .from("milestones")
    .select("id,build_id,builds!inner(owner_id)")
    .eq("id", milestoneId)
    .eq("builds.owner_id", userId)
    .maybeSingle();
  return data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  const { milestoneId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getOwnedMilestone(supabase, milestoneId, user.id))) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("milestones")
    .update({
      title,
      status: String(body?.status ?? "pending"),
      visibility: String(body?.visibility ?? "public"),
      sort_order: Number(body?.sort_order ?? 0),
      start_date: body?.start_date || null,
      end_date: body?.end_date || null,
    })
    .eq("id", milestoneId)
    .select("id,title,status,start_date,end_date,visibility,sort_order")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to save milestone." }, { status: 400 });
  return NextResponse.json({ milestone: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  const { milestoneId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await getOwnedMilestone(supabase, milestoneId, user.id))) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });

  const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
