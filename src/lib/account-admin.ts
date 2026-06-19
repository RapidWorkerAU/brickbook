import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
const COMMENT_AUTHOR_COLUMNS = ["profile_id", "author_id", "created_by", "owner_id", "user_id"] as const;

function splitStoragePath(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/^\/+/, "");
  const [bucket, ...rest] = normalized.split("/");
  if (!bucket || rest.length === 0) return { bucket: "brickbook-build-images", path: normalized };
  return { bucket, path: rest.join("/") };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isMissingColumnError(message: string, column: string) {
  return message.includes(`'${column}' column`) || message.includes(`column ${column}`) || message.includes(`Could not find the '${column}'`);
}

async function selectOwnComments(admin: AdminClient, userId: string) {
  for (const column of COMMENT_AUTHOR_COLUMNS) {
    const { data, error } = await admin.from("comments").select("*").eq(column, userId);
    if (!error) return data ?? [];
    if (!isMissingColumnError(error.message, column)) throw new Error(error.message);
  }

  return [];
}

async function deleteOwnComments(admin: AdminClient, userId: string) {
  for (const column of COMMENT_AUTHOR_COLUMNS) {
    const { error } = await admin.from("comments").delete().eq(column, userId);
    if (!error) return;
    if (!isMissingColumnError(error.message, column)) throw new Error(error.message);
  }
}

export async function collectAccountExport(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  const { data: builds } = await admin.from("builds").select("*").eq("owner_id", userId);
  const buildIds = (builds ?? []).map((build) => build.id as string);

  const [
    { data: milestones },
    { data: updates },
    { data: images },
    { data: selections },
    { data: rooms },
    { data: follows },
    { data: commentsOnBuilds },
    { data: notificationPreferences },
    { data: blockedUsers },
    ownComments,
  ] = await Promise.all([
    buildIds.length ? admin.from("milestones").select("*").in("build_id", buildIds) : Promise.resolve({ data: [] }),
    buildIds.length ? admin.from("build_updates").select("*").in("build_id", buildIds) : Promise.resolve({ data: [] }),
    buildIds.length ? admin.from("build_images").select("*").in("build_id", buildIds) : Promise.resolve({ data: [] }),
    buildIds.length ? admin.from("selections").select("*").in("build_id", buildIds) : Promise.resolve({ data: [] }),
    buildIds.length ? admin.from("rooms").select("*").in("build_id", buildIds) : Promise.resolve({ data: [] }),
    buildIds.length ? admin.from("build_follows").select("*").in("build_id", buildIds) : Promise.resolve({ data: [] }),
    buildIds.length ? admin.from("comments").select("*").in("build_id", buildIds) : Promise.resolve({ data: [] }),
    admin.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("blocked_users").select("*").eq("blocker_id", userId),
    selectOwnComments(admin, userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile,
    builds: builds ?? [],
    milestones: milestones ?? [],
    updates: updates ?? [],
    images: images ?? [],
    selections: selections ?? [],
    rooms: rooms ?? [],
    follows: follows ?? [],
    commentsOnBuilds: commentsOnBuilds ?? [],
    commentsPostedByUser: ownComments ?? [],
    notificationPreferences,
    blockedUsers: blockedUsers ?? [],
  };
}

async function removeStorageObjects(admin: AdminClient, paths: Array<string | null | undefined>) {
  const byBucket = new Map<string, string[]>();
  for (const value of paths) {
    const parsed = splitStoragePath(value);
    if (!parsed) continue;
    byBucket.set(parsed.bucket, [...(byBucket.get(parsed.bucket) ?? []), parsed.path]);
  }

  await Promise.all(
    Array.from(byBucket.entries()).map(([bucket, objectPaths]) =>
      admin.storage.from(bucket).remove(unique(objectPaths)),
    ),
  );
}

export async function deleteUserBuildData(userId: string) {
  const admin = createAdminClient();
  const { data: builds } = await admin.from("builds").select("id,cover_image_path").eq("owner_id", userId);
  const buildIds = (builds ?? []).map((build) => build.id as string);
  if (!buildIds.length) return { deletedBuilds: 0 };

  const [{ data: images }, { data: selections }, { data: updates }] = await Promise.all([
    admin.from("build_images").select("id,storage_path").in("build_id", buildIds),
    admin.from("selections").select("id,image_path").in("build_id", buildIds),
    admin.from("build_updates").select("id").in("build_id", buildIds),
  ]);
  const updateIds = (updates ?? []).map((update) => update.id as string);
  const imageIds = (images ?? []).map((image) => image.id as string);

  if (updateIds.length) await admin.from("update_likes").delete().in("update_id", updateIds);
  if (imageIds.length) await admin.from("image_likes").delete().in("image_id", imageIds);
  await admin.from("comments").delete().in("build_id", buildIds);
  await admin.from("notifications").delete().in("build_id", buildIds);
  await admin.from("build_follows").delete().in("build_id", buildIds);
  await admin.from("build_updates").delete().in("build_id", buildIds);
  await admin.from("build_images").delete().in("build_id", buildIds);
  await admin.from("milestones").delete().in("build_id", buildIds);
  await admin.from("selections").delete().in("build_id", buildIds);
  await admin.from("rooms").delete().in("build_id", buildIds);
  await admin.from("builds").delete().eq("owner_id", userId);

  await removeStorageObjects(admin, [
    ...(builds ?? []).map((build) => build.cover_image_path as string | null),
    ...(images ?? []).map((image) => image.storage_path as string | null),
    ...(selections ?? []).map((selection) => selection.image_path as string | null),
  ]);

  return { deletedBuilds: buildIds.length };
}

export async function deleteAccount(userId: string) {
  const admin = createAdminClient();
  await deleteUserBuildData(userId);
  await deleteOwnComments(admin, userId);

  const { data: profile } = await admin.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
  await Promise.all([
    admin.from("blocked_users").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    admin.from("notification_preferences").delete().eq("user_id", userId),
    admin.from("notifications").delete().or(`recipient_id.eq.${userId},actor_id.eq.${userId}`),
    admin.from("profiles").delete().eq("id", userId),
  ]);

  await removeStorageObjects(admin, [profile?.avatar_path ? `brickbook-avatars/${profile.avatar_path}` : null]);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  return { success: true };
}
