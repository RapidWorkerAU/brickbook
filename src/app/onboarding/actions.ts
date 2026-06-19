"use server";

import slugify from "slugify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

export async function saveOnboardingProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to set up your profile." };
  }

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatarFile = formData.get("avatar_file");

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return { error: "Username must be 3-30 characters and use letters, numbers, or underscores." };
  }

  let avatarPath: string | null = null;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      return { error: "Avatar must be an image file." };
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (avatarFile.size > maxSizeBytes) {
      return { error: "Avatar must be under 5MB." };
    }

    const admin = createAdminClient();
    const safeName = slugify(avatarFile.name.replace(/\.[^/.]+$/, ""), {
      lower: true,
      strict: true,
    }) || "avatar";
    const ext = avatarFile.name.includes(".") ? avatarFile.name.slice(avatarFile.name.lastIndexOf(".")) : "";
    const path = `${user.id}/${Date.now()}-${safeName}${ext}`;
    const bucket = "brickbook-avatars";

    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
      upsert: true,
      contentType: avatarFile.type || "application/octet-stream",
    });

    if (uploadError) {
      return { error: uploadError.message };
    }

    avatarPath = `${bucket}/${path}`;
  }

  const payloadWithAvatar = {
    id: user.id,
    username,
    display_name: displayName || null,
    avatar_path: avatarPath,
  };

  const { error } = await supabase.from("profiles").upsert(payloadWithAvatar);
  if (!error) {
    if (user.email) {
      void sendEmail(user.email, "welcome", { displayName: displayName || username }).catch(() => null);
    }
    return { error: null };
  }

  if (error.message.toLowerCase().includes("avatar_path")) {
    const { error: retryError } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      display_name: displayName || null,
    });
    if (!retryError && user.email) {
      void sendEmail(user.email, "welcome", { displayName: displayName || username }).catch(() => null);
    }
    return { error: retryError?.message ?? null };
  }

  return { error: error.message };
}
