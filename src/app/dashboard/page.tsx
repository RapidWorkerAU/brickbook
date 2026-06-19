import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { DashboardFeedList, DashboardMyBuildsList, DashboardSuggestedBuildsList } from "@/app/dashboard/dashboard-home-lists";
import { DashboardUpdateLauncher } from "@/app/dashboard/dashboard-update-launcher";
import {
  IconBell,
  IconMessageCircle,
  IconPlus,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { getSignedImageUrl, getSignedImageUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path?: string | null;
};

type Build = {
  id: string;
  title: string;
  slug: string;
  owner_id: string;
  cover_image_path: string | null;
  builder_name: string | null;
  suburb_name: string | null;
  estate_name: string | null;
  style: string | null;
  is_listed: boolean | null;
};

type ActiveMilestone = {
  build_id: string;
  title: string | null;
};

type Follow = {
  build_id: string;
};

type FeedUpdate = {
  id: string;
  build_id: string;
  milestone_id: string | null;
  content: string | null;
  created_at: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/get-started?tab=login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_path")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/onboarding");

  const [
    { data: myBuildsData },
    { data: followsData },
    { count: commentCount },
  ] = await Promise.all([
    supabase
      .from("builds")
      .select("id,title,slug,owner_id,cover_image_path,builder_name,suburb_name,estate_name,style,is_listed")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("build_follows").select("build_id").eq("follower_id", user.id),
    Promise.resolve({ count: 0 }),
  ]);

  const myBuilds = (myBuildsData ?? []) as Build[];
  const myBuildIds = myBuilds.map((build) => build.id);
  const { data: activeMilestonesData } = myBuildIds.length
    ? await supabase.from("milestones").select("build_id,title").in("build_id", myBuildIds).eq("status", "active")
    : { data: [] };
  const activeMilestoneByBuildId = new Map(
    ((activeMilestonesData ?? []) as ActiveMilestone[]).map((milestone) => [milestone.build_id, milestone.title ?? "No active phase"]),
  );
  const myBuildCoverUrls = await getSignedImageUrls(
    myBuilds.map((build) => build.cover_image_path).filter(Boolean) as string[],
  );
  const myBuildCards = myBuilds.map((build) => ({
    ...build,
    coverUrl: build.cover_image_path ? myBuildCoverUrls.get(build.cover_image_path) ?? null : null,
    currentPhase: activeMilestoneByBuildId.get(build.id) ?? "No active phase",
  }));
  const follows = (followsData ?? []) as Follow[];
  const followedBuildIds = follows.map((follow) => follow.build_id);

  const { data: followedBuildsData } = followedBuildIds.length
    ? await supabase
        .from("builds")
        .select("id,title,slug,owner_id,cover_image_path,builder_name,suburb_name,estate_name,style,is_listed")
        .in("id", followedBuildIds)
        .eq("is_listed", true)
        .limit(20)
    : { data: [] };

  const followedBuilds = (followedBuildsData ?? []) as Build[];
  const ownerIds = Array.from(new Set(followedBuilds.map((build) => build.owner_id)));
  const { data: ownersData } = ownerIds.length
    ? await supabase.from("profiles").select("id,username,display_name").in("id", ownerIds)
    : { data: [] };
  const owners = new Map(
    ((ownersData ?? []) as Profile[]).map((owner) => [
      owner.id,
      owner.display_name || owner.username,
    ]),
  );
  const ownerUsernames = new Map(
    ((ownersData ?? []) as Profile[]).map((owner) => [owner.id, owner.username]),
  );

  const { data: feedUpdatesData } = followedBuildIds.length
    ? await supabase
        .from("build_updates")
        .select("id,build_id,milestone_id,content,created_at")
        .in("build_id", followedBuildIds)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };
  const feedUpdates = (feedUpdatesData ?? []) as FeedUpdate[];
  const feedBuilds = new Map(followedBuilds.map((build) => [build.id, build]));
  const feedUpdateIds = feedUpdates.map((update) => update.id);
  const { data: feedImagesData } = feedUpdateIds.length
    ? await supabase.from("build_images").select("update_id,storage_path").in("update_id", feedUpdateIds)
    : { data: [] };
  const firstImageByUpdate = new Map<string, string>();
  const imagePathsByUpdate = new Map<string, string[]>();
  for (const image of (feedImagesData ?? []) as { update_id: string | null; storage_path: string | null }[]) {
    if (!image.update_id || !image.storage_path) continue;
    if (!firstImageByUpdate.has(image.update_id)) firstImageByUpdate.set(image.update_id, image.storage_path);
    imagePathsByUpdate.set(image.update_id, [...(imagePathsByUpdate.get(image.update_id) ?? []), image.storage_path]);
  }
  const followedCards = await Promise.all(
    feedUpdates.map(async (update) => {
      const build = feedBuilds.get(update.build_id);
      const imagePath = firstImageByUpdate.get(update.id) ?? build?.cover_image_path ?? null;
      const imagePaths = imagePathsByUpdate.get(update.id) ?? (imagePath ? [imagePath] : []);
      return {
        ...update,
        build: build ?? null,
        ownerName: build ? owners.get(build.owner_id) ?? "Builder" : "Builder",
        ownerUsername: build ? ownerUsernames.get(build.owner_id) ?? "user" : "user",
        imageUrl: imagePath ? await getSignedImageUrl(imagePath) : null,
        imageUrls: (await Promise.all(imagePaths.map((path) => getSignedImageUrl(path)))).filter((url): url is string => Boolean(url)),
      };
    }),
  );

  // Collect styles from the user's own builds for matching
  const myStyles = [...new Set(myBuilds.map((b) => b.style).filter(Boolean) as string[])];
  const excludedIds = [user.id];

  // Fetch a pool of public builds matching the user's styles (fallback: any public builds)
  const styleMatchQuery = supabase
    .from("builds")
    .select("id,title,slug,owner_id,suburb_name,style")
    .eq("is_listed", true)
    .neq("owner_id", user.id)
    .limit(60);

  const { data: styleMatchData } = myStyles.length
    ? await styleMatchQuery.in("style", myStyles)
    : await styleMatchQuery;

  let suggestedPool = (styleMatchData ?? []) as Pick<Build, "id" | "title" | "slug" | "owner_id" | "suburb_name" | "style">[];

  // If style matching returned fewer than 3, top up with any public builds
  if (suggestedPool.length < 3) {
    const existingIds = new Set(suggestedPool.map((b) => b.id));
    const { data: fallbackData } = await supabase
      .from("builds")
      .select("id,title,slug,owner_id,suburb_name,style")
      .eq("is_listed", true)
      .neq("owner_id", user.id)
      .limit(60);
    for (const b of (fallbackData ?? []) as typeof suggestedPool) {
      if (!existingIds.has(b.id)) suggestedPool.push(b);
      if (suggestedPool.length >= 60) break;
    }
  }

  // Deterministic daily rotation — offset advances by 1 each day
  const dayNumber = Math.floor(Date.now() / 86400000);
  const offset = suggestedPool.length > 3 ? dayNumber % (suggestedPool.length - 2) : 0;
  const rotated = [...suggestedPool.slice(offset), ...suggestedPool.slice(0, offset)];
  const suggestedBuilds = rotated.slice(0, 3);

  // Fetch owner usernames so we can link to each build profile
  const suggestedOwnerIds = [...new Set(suggestedBuilds.map((b) => b.owner_id))];
  const { data: suggestedOwnersData } = suggestedOwnerIds.length
    ? await supabase.from("profiles").select("id,username").in("id", suggestedOwnerIds)
    : { data: [] };
  const suggestedOwnerUsernames = new Map(
    ((suggestedOwnersData ?? []) as Pick<Profile, "id" | "username">[]).map((p) => [p.id, p.username]),
  );
  const suggestedBuildCards = suggestedBuilds.map((b) => ({
    ...b,
    ownerUsername: suggestedOwnerUsernames.get(b.owner_id) ?? null,
  }));

  const { count: followerCount } = myBuilds.length
    ? await supabase.from("build_follows").select("*", { head: true, count: "exact" }).in(
        "build_id",
        myBuilds.map((build) => build.id),
      )
    : { count: 0 };

  return (
    <div className="dashboard-page">
      <Nav user={{ username: profile.username, display_name: profile.display_name ?? undefined, avatar_path: profile.avatar_path ?? undefined }} />

      <div className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="min-w-0">
            <DashboardUpdateLauncher builds={myBuilds.map((build) => ({ id: build.id, title: build.title }))} />

            <div className="flex items-center justify-between mb-4">
              <h1 className="text-[15px] font-semibold text-bb-black">Following</h1>
              <Link href="/discover" className="text-[12px] text-bb-amber hover:opacity-80">
                Discover more builds
              </Link>
            </div>

            <DashboardFeedList followedCards={followedCards} />
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="card-body pb-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[13px] font-semibold text-bb-black">My builds</h2>
                  <Link href="/dashboard/builds" className="text-[11px] text-[var(--bb-amber)] font-medium hover:underline">View all</Link>
                </div>
                <DashboardMyBuildsList builds={myBuildCards} username={profile.username} />
              </div>
              <div className="card-footer">
                <Link href="/dashboard/builds/new" className="add-btn">
                  <IconPlus size={13} /> Add a build
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 className="text-[13px] font-semibold text-bb-black mb-3">Your activity</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="stat-card bg-stone-50 border-0 p-3">
                    <div className="stat-value text-[20px]">{followerCount ?? 0}</div>
                    <div className="stat-label">Followers</div>
                  </div>
                  <div className="stat-card bg-stone-50 border-0 p-3">
                    <div className="stat-value text-[20px]">0</div>
                    <div className="stat-label">Updates</div>
                  </div>
                  <div className="stat-card bg-stone-50 border-0 p-3">
                    <div className="stat-value text-[20px]">{follows.length}</div>
                    <div className="stat-label">Following</div>
                  </div>
                  <div className="stat-card bg-stone-50 border-0 p-3">
                    <div className="stat-value text-[20px]">{commentCount ?? 0}</div>
                    <div className="stat-label">Comments</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <IconTrendingUp size={14} className="text-stone-400" />
                  <h2 className="text-[13px] font-semibold text-bb-black">Suggested builds</h2>
                </div>
                <DashboardSuggestedBuildsList builds={suggestedBuildCards} />
              </div>
              <div className="card-footer">
                <Link href="/discover" className="btn btn-ghost btn-sm w-full justify-center gap-1 text-stone-400">
                  <IconUsers size={13} /> Browse all builds
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="card-body pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconBell size={14} className="text-stone-400" />
                    <h2 className="text-[13px] font-semibold text-bb-black">Notifications</h2>
                  </div>
                  <span className="badge badge-private">Soon</span>
                </div>
                <div className="notif-item -mx-4 px-4">
                  <div className="notif-dot notif-dot-read" />
                  <div className="avatar avatar-sm avatar-stone flex-shrink-0"><IconMessageCircle size={13} /></div>
                  <div>
                    <div className="text-[11px]">Notifications will appear here once live notification reads are wired.</div>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <Link href="/dashboard/notifications" className="btn btn-ghost btn-sm w-full justify-center text-stone-400">
                  View all notifications
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


