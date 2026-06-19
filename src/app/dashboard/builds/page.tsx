import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { IconPlus } from "@tabler/icons-react";
import { DashboardBuildsList } from "@/app/dashboard/builds/dashboard-builds-list";
import { getSignedImageUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  username: string;
  display_name: string | null;
  avatar_path?: string | null;
};

type Build = {
  id: string;
  title: string;
  slug: string;
  cover_image_path: string | null;
  builder_name: string | null;
  suburb_name: string | null;
  style: string | null;
  is_listed: boolean | null;
  created_at?: string | null;
};

export default async function DashboardBuildsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/get-started?tab=login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name,avatar_path")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/onboarding");

  const { data: buildsData } = await supabase
    .from("builds")
    .select("id,title,slug,cover_image_path,builder_name,suburb_name,style,is_listed,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const builds = (buildsData ?? []) as Build[];
  const signedUrls = await getSignedImageUrls(builds.map((build) => build.cover_image_path).filter(Boolean) as string[]);

  return (
    <div className="dashboard-page">
      <Nav user={{ username: profile.username, display_name: profile.display_name ?? undefined, avatar_path: profile.avatar_path ?? undefined }} />

      <main className="dashboard-container-wide">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">My builds</h1>
            <p className="dashboard-subtitle">Manage your build profiles and post updates</p>
          </div>
          <Link href="/dashboard/builds/new" className="btn btn-primary">
            <IconPlus size={15} /> New build
          </Link>
        </div>

        <DashboardBuildsList
          username={profile.username}
          builds={builds.map((build) => ({
            ...build,
            imageUrl: build.cover_image_path ? signedUrls.get(build.cover_image_path) ?? null : null,
          }))}
        />
      </main>
    </div>
  );
}
