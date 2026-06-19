import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/account-admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Capture email + display name before deleting — auth record won't exist after
  const userEmail = user.email;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.display_name || profile?.username || undefined;

  try {
    await deleteAccount(user.id);

    if (userEmail) {
      void sendEmail(userEmail, "account-deleted", { displayName }).catch(() => null);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete account." }, { status: 400 });
  }
}
