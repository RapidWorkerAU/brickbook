import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditUpdateClient } from "./edit-update-client";

export default async function EditUpdatePage({
  params,
}: {
  params: Promise<{ buildId: string; updateId: string }>;
}) {
  const { buildId, updateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/get-started?tab=login");

  const { data: build } = await supabase
    .from("builds")
    .select("id")
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!build) redirect("/dashboard/builds");

  const [{ data: update }, { data: milestones }] = await Promise.all([
    supabase
      .from("build_updates")
      .select("id,content,milestone_id")
      .eq("id", updateId)
      .eq("build_id", buildId)
      .maybeSingle(),
    supabase
      .from("milestones")
      .select("id,title")
      .eq("build_id", buildId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!update) redirect(`/dashboard/builds/${buildId}`);

  const returnTo = `/dashboard/builds/${buildId}?tab=Updates`;

  return (
    <EditUpdateClient
      buildId={buildId}
      update={update as { id: string; content: string | null; milestone_id: string | null }}
      milestones={(milestones ?? []) as { id: string; title: string }[]}
      returnTo={returnTo}
    />
  );
}
