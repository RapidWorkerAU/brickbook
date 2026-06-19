import Link from "next/link";
import Nav from "@/components/Nav";
import { IconFileText, IconPlus } from "@tabler/icons-react";
import { getManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";
import { UpdatesList } from "@/app/dashboard/builds/[buildId]/updates/updates-list";

type BuildUpdate = {
  id: string;
  content: string | null;
  milestone_id: string | null;
  created_at: string | null;
};

type Milestone = {
  id: string;
  title: string;
};

export default async function BuildUpdatesPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = await params;
  const { supabase, build, user } = await getManagedBuild(buildId);

  const [{ data: updateData }, { data: milestoneData }, { data: imageData }] = await Promise.all([
    supabase.from("build_updates").select("id,content,milestone_id,created_at").eq("build_id", build.id).order("created_at", { ascending: false }),
    supabase.from("milestones").select("id,title").eq("build_id", build.id),
    supabase.from("build_images").select("update_id").eq("build_id", build.id),
  ]);

  const updates = (updateData ?? []) as BuildUpdate[];
  const milestoneNames = new Map(((milestoneData ?? []) as Milestone[]).map((milestone) => [milestone.id, milestone.title]));
  const imageCounts = new Map<string, number>();
  for (const image of (imageData ?? []) as { update_id: string | null }[]) {
    if (!image.update_id) continue;
    imageCounts.set(image.update_id, (imageCounts.get(image.update_id) ?? 0) + 1);
  }

  return (
    <div className="dashboard-page">
      <Nav user={user} />

      <main className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Updates</h1>
            <p className="dashboard-subtitle">{build.title}</p>
          </div>
          <Link href={`/dashboard/builds/${build.id}/updates/new`} className="btn btn-primary">
            <IconPlus size={14} /> New update
          </Link>
        </div>

        <div className="management-summary">
          <div className="stat-card">
            <div className="stat-value">{updates.length}</div>
            <div className="stat-label">Updates</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{milestoneNames.size}</div>
            <div className="stat-label">Milestones</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">0</div>
            <div className="stat-label">Post records</div>
          </div>
        </div>

        {updates.length > 0 ? (
          <UpdatesList
            updates={updates.map((update) => ({
              id: update.id,
              content: update.content,
              milestoneName: update.milestone_id ? milestoneNames.get(update.milestone_id) ?? "Milestone update" : "General update",
              createdAtLabel: update.created_at ? formatDate(update.created_at) : "No date",
              imageCount: imageCounts.get(update.id) ?? 0,
            }))}
          />
        ) : (
          <div className="empty-state">
            <IconFileText size={32} />
            <h3 className="empty-state-title">No update activity yet</h3>
            <p className="empty-state-sub">Post your first update to start building the timeline.</p>
            <Link href={`/dashboard/builds/${build.id}/updates/new`} className="btn btn-primary btn-sm">
              <IconPlus size={13} /> Compose update
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
