import { BuildProfileClient } from "@/app/[username]/[slug]/build-profile-client";
import { getPublicBuild } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";

export type ViewerPlanningBuild = {
  id: string;
  title: string;
  alreadySaved: boolean;
  savedId: string | null;
};

export default async function PublicBuildProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; slug: string }>;
  searchParams: Promise<{ tab?: string; returnTo?: string }>;
}) {
  const [{ username, slug }, { tab: initialTab, returnTo }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [build, { data: { user } }] = await Promise.all([
    getPublicBuild(username, slug),
    supabase.auth.getUser(),
  ]);

  let viewerPlanningBuilds: ViewerPlanningBuild[] = [];
  if (user && build.ownerId !== user.id) {
    const { data: planningBuilds } = await supabase
      .from("builds")
      .select("id,title")
      .eq("owner_id", user.id)
      .eq("stage", "planning")
      .order("created_at", { ascending: false });

    if (planningBuilds && planningBuilds.length > 0) {
      const { data: existingSaves } = await supabase
        .from("planning_saved_builds")
        .select("id,planning_build_id")
        .in("planning_build_id", planningBuilds.map((b) => b.id as string))
        .eq("saved_build_id", build.id);

      const saveMap = new Map(
        ((existingSaves ?? []) as { id: string; planning_build_id: string }[]).map((s) => [s.planning_build_id, s.id]),
      );

      viewerPlanningBuilds = (planningBuilds as { id: string; title: string }[]).map((b) => ({
        id: b.id,
        title: b.title,
        alreadySaved: saveMap.has(b.id),
        savedId: saveMap.get(b.id) ?? null,
      }));
    }
  }

  return <BuildProfileClient build={build} username={username} viewerPlanningBuilds={viewerPlanningBuilds} initialTab={initialTab} returnTo={returnTo ?? null} />;
}
