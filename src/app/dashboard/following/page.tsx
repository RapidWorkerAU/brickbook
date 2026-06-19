import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedImageUrls } from "@/lib/storage";
import Nav from "@/components/Nav";

type FollowedBuild = {
  id: string;
  title: string;
  slug: string;
  suburb: string | null;
  stage: string | null;
  coverImageUrl: string | null;
  ownerUsername: string;
  ownerDisplayName: string | null;
};

const STAGE_LABELS: Record<string, string> = {
  planning: "Planning",
  pre_construction: "Pre-construction",
  construction: "Under construction",
  landscaping: "Landscaping",
  complete: "Complete",
};

export default async function FollowingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/get-started?tab=login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: follows } = await supabase
    .from("build_follows")
    .select("build_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const buildIds = ((follows ?? []) as { build_id: string }[]).map((f) => f.build_id);

  let builds: FollowedBuild[] = [];
  if (buildIds.length > 0) {
    const { data: buildRows } = await supabase
      .from("builds")
      .select("id,title,slug,suburb_name,stage,cover_image_path,owner_id")
      .in("id", buildIds);

    const ownerIds = Array.from(new Set(((buildRows ?? []) as Record<string, unknown>[]).map((b) => b.owner_id as string).filter(Boolean)));
    const { data: ownerProfiles } = ownerIds.length
      ? await supabase.from("profiles").select("id,username,display_name").in("id", ownerIds)
      : { data: [] };

    const profileMap = new Map(((ownerProfiles ?? []) as { id: string; username: string; display_name: string | null }[]).map((p) => [p.id, p]));

    const coverPaths = ((buildRows ?? []) as Record<string, unknown>[])
      .map((b) => b.cover_image_path as string)
      .filter(Boolean) as string[];
    const signedUrls = coverPaths.length ? await getSignedImageUrls(coverPaths) : new Map<string, string>();

    const buildIdOrder = new Map(buildIds.map((id, i) => [id, i]));
    builds = ((buildRows ?? []) as Record<string, unknown>[])
      .map((b) => {
        const owner = profileMap.get(b.owner_id as string);
        if (!owner) return null;
        return {
          id: b.id as string,
          title: b.title as string,
          slug: b.slug as string,
          suburb: (b.suburb_name as string | null) ?? null,
          stage: (b.stage as string | null) ?? null,
          coverImageUrl: b.cover_image_path ? (signedUrls.get(b.cover_image_path as string) ?? null) : null,
          ownerUsername: owner.username,
          ownerDisplayName: owner.display_name ?? null,
        } satisfies FollowedBuild;
      })
      .filter((item): item is FollowedBuild => item !== null)
      .sort((a, b) => (buildIdOrder.get(a.id) ?? 0) - (buildIdOrder.get(b.id) ?? 0));
  }

  const navUser = { id: user.id, username: profile.username, display_name: profile.display_name ?? undefined, avatar_path: profile.avatar_path ?? undefined };

  return (
    <div className="page-shell">
      <Nav user={navUser} />
      <div className="page-container content-section">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Following</h1>
          <p className="dashboard-subtitle">Builds you follow — you&apos;ll see their updates in your feed.</p>
        </div>

        {builds.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">Not following any builds yet</h3>
            <p className="empty-state-sub">Discover builds you love and hit Follow to get their updates here.</p>
            <Link href="/discover" className="btn btn-primary">Browse Discover</Link>
          </div>
        ) : (
          <div className="following-grid">
            {builds.map((build) => (
              <Link key={build.id} href={`/${build.ownerUsername}/${build.slug}`} className="following-card">
                <div className="following-card-image">
                  {build.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={build.coverImageUrl} alt={build.title} />
                  ) : (
                    <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" />
                  )}
                  {build.stage ? (
                    <span className={`following-card-badge badge ${build.stage === "planning" ? "badge-planning" : `badge-stage-${build.stage}`}`}>
                      {STAGE_LABELS[build.stage] ?? build.stage}
                    </span>
                  ) : null}
                </div>
                <div className="following-card-body">
                  <div className="following-card-title">{build.title}</div>
                  <div className="following-card-meta">
                    <span>@{build.ownerUsername}</span>
                    {build.suburb ? <span> · {build.suburb}</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
