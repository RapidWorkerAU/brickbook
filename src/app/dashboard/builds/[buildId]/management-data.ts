import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DashboardUser = {
  username: string;
  display_name?: string;
  avatar_path?: string;
};

export type ManagedBuild = {
  id: string;
  title: string;
  slug: string;
  builder_name: string | null;
  suburb_name: string | null;
  estate_name: string | null;
  style: string | null;
};

export async function getManagedBuild(buildId: string) {
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
    .select("id,title,slug,builder_name,suburb_name,estate_name,style")
    .eq("id", buildId)
    .eq("owner_id", user.id)
    .maybeSingle<ManagedBuild>();

  if (!build) redirect("/dashboard/builds");

  return {
    supabase,
    build,
    user: {
      username: profile.username,
      display_name: profile.display_name ?? undefined,
      avatar_path: profile.avatar_path ?? undefined,
    } satisfies DashboardUser,
  };
}
