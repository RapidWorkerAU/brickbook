import { redirect } from "next/navigation";
import { NotificationsClient } from "@/app/dashboard/notifications/notifications-client";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
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

  return (
    <NotificationsClient
      user={{
        id: user.id,
        username: profile.username,
        display_name: profile.display_name ?? undefined,
        avatar_path: profile.avatar_path ?? undefined,
      }}
    />
  );
}
