import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const username = getString(formData, "username").toLowerCase();
  const displayName = getString(formData, "display_name");
  const bio = getString(formData, "bio");
  const location = getString(formData, "location");
  const website = getString(formData, "website");
  const avatarFile = formData.get("avatar");

  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }

  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores." }, { status: 400 });
  }

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (taken) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });

  const payload: {
    username: string;
    display_name: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    avatar_path?: string;
  } = {
    username,
    display_name: displayName || null,
    bio: bio || null,
    location: location || null,
    website: website || null,
  };

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Avatar must be an image." }, { status: 400 });
    }
    if (avatarFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Avatar must be under 5MB." }, { status: 400 });
    }

    const path = `${user.id}/avatar.jpg`;
    const bucket = "brickbook-avatars";
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, Buffer.from(await avatarFile.arrayBuffer()), {
      upsert: true,
      contentType: avatarFile.type || "application/octet-stream",
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
    payload.avatar_path = path;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id,username,display_name,bio,location,website,avatar_path")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to save profile." }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}
