import { redirect } from "next/navigation";
import { NewBuildClient } from "@/app/dashboard/builds/new/new-build-client";
import { getBuilderOptions } from "@/lib/builders";
import { createClient } from "@/lib/supabase/server";

export default async function NewBuildPage() {
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
  const builderOptions = await getBuilderOptions();

  return (
    <NewBuildClient
      user={{
        username: profile.username,
        display_name: profile.display_name ?? undefined,
        avatar_path: profile.avatar_path ?? undefined,
      }}
      builderOptions={builderOptions}
    />
  );
}
