import { redirect } from "next/navigation";
import { NewUpdateClient } from "@/app/dashboard/builds/[buildId]/updates/new/update-client";
import { createClient } from "@/lib/supabase/server";

export type UpdateBuildContext = {
  id: string;
  title: string;
};

export type UpdateMilestone = {
  id: string;
  title: string;
  status: string | null;
  visibility: string | null;
  sort_order: number | null;
  start_date: string | null;
  end_date: string | null;
};

export type UpdateRoom = {
  id: string;
  name: string;
  room_type: string | null;
};

export default async function NewBuildUpdatePage({
  params,
  searchParams,
}: {
  params: Promise<{ buildId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { buildId } = await params;
  const { returnTo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/get-started?tab=login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const { data: build } = await supabase
    .from("builds")
    .select("id,title")
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .maybeSingle<UpdateBuildContext>();

  if (!build) redirect("/dashboard/builds");

  const [{ data: milestones }, { data: rooms }] = await Promise.all([
    supabase
      .from("milestones")
      .select("id,title,status,visibility,sort_order,start_date,end_date")
      .eq("build_id", buildId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("rooms")
      .select("id,name,room_type")
      .eq("build_id", buildId)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <NewUpdateClient
      build={build}
      milestones={(milestones ?? []) as UpdateMilestone[]}
      rooms={(rooms ?? []) as UpdateRoom[]}
      returnTo={safeReturnTo(returnTo, `/dashboard/builds/${build.id}`)}
      user={{ username: profile.username, display_name: profile.display_name ?? undefined, avatar_path: profile.avatar_path ?? undefined }}
    />
  );
}

function safeReturnTo(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
