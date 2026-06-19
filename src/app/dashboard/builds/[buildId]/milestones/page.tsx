import { MilestonesClient, type EditableMilestone } from "@/app/dashboard/builds/[buildId]/milestones/milestones-client";
import { getManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";

export default async function BuildMilestonesPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = await params;
  const { supabase, build, user } = await getManagedBuild(buildId);

  const { data } = await supabase
    .from("milestones")
    .select("id,title,status,start_date,end_date,visibility,sort_order")
    .eq("build_id", build.id)
    .order("sort_order");

  return <MilestonesClient build={build} user={user} initialMilestones={(data ?? []) as EditableMilestone[]} />;
}
