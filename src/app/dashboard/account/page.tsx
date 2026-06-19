import { redirect } from "next/navigation";
import { AccountClient } from "@/app/dashboard/account/account-client";
import { createClient } from "@/lib/supabase/server";

export type AccountProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_path: string | null;
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/get-started?tab=login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,bio,location,website,avatar_path")
    .eq("id", user.id)
    .maybeSingle<AccountProfile>();

  if (!profile) redirect("/onboarding");

  return <AccountClient profile={profile} email={user.email ?? ""} />;
}
