import { notFound } from "next/navigation";
import slugify from "slugify";
import { getSignedImageUrl, getSignedImageUrls } from "@/lib/storage";
import { getCommentAuthorId } from "@/lib/comment-authors";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
};

export type PublicBuildCard = {
  id: string;
  title: string;
  slug: string;
  ownerId: string;
  username: string;
  ownerName: string;
  builder: string | null;
  builderSlug: string | null;
  suburb: string | null;
  estate: string | null;
  state: string | null;
  phase: string;
  stage: string | null;
  type: string;
  followers: number;
  comments: number;
  updateCount: number;
  week: number | null;
  imageUrl: string | null;
  designStyle: string | null;
};

export type DirectoryEntry = {
  slug: string;
  name: string;
  buildCount: number;
  avgDays: number | null;
  suburbs: string[];
  states: string[];
  builders: string[];
  builderLinks: { name: string; slug: string }[];
  developer?: string | null;
};

export type PublicFloorPlan = {
  id: string;
  imageUrl: string;
  planType: string | null;
  isPdf: boolean;
  commentCount: number;
};

export type PublicBuildDetail = PublicBuildCard & {
  currentUserId: string | null;
  floorPlans: PublicFloorPlan[];
  estate: string | null;
  state: string | null;
  status: string;
  description: string | null;
  style: string | null;
  stage: string | null;
  planningStyles: string[];
  planningSuburbs: PlanningSuburb[];
  planningBuilders: PlanningBuilder[];
  planningPublicSavedBuilds: PublicSavedBuild[];
  isFollowing: boolean;
  specs: PublicBuildSpecs;
  budget: { landMin: number | null; landMax: number | null; buildMin: number | null; buildMax: number | null };
  milestones: PublicMilestone[];
  images: PublicBuildImage[];
  inspirationImages: PublicBuildImage[];
  updates: PublicBuildUpdate[];
  selections: PublicSelection[];
  buildComments: PublicComment[];
};

export type PublicBuildSpecs = {
  bedrooms: number | null;
  bathrooms: number | null;
  separateToilets: number | null;
  garageSpaces: number | null;
  landSizeM2: number | null;
  internalSizeM2: number | null;
  alfrescoSizeM2: number | null;
  homeWidthM: number | null;
  homeDepthM: number | null;
  buildType: string | null;
  constructionType: string | null;
  roofStructure: string | null;
  homeDesignStyle: string | null;
};

export type PublicMilestone = {
  id: string;
  title: string;
  status: "complete" | "active" | "pending";
  updates: number;
  startDate: string | null;
  endDate: string | null;
};

export type PublicBuildImage = {
  id: string;
  imageUrl: string | null;
  milestone: string;
  milestoneId: string | null;
  updateId: string | null;
  commentCount: number;
  notes?: string | null;
  selectionTags?: InspirationTag[];
};

export type PublicBuildUpdate = {
  id: string;
  content: string;
  milestone: string;
  createdAt: string | null;
  imageId: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  imageIds: string[];
  imageCount: number;
  commentCount: number;
  likeCount: number;
};

export type PublicSelection = {
  id: string;
  selectionType: string | null;
  category: string | null;
  subcategory: string | null;
  location: string | null;
  roomName: string | null;
  roomType: string | null;
  itemName: string | null;
  materialType: string | null;
  brand: string | null;
  productName: string | null;
  model: string | null;
  colourName: string | null;
  code: string | null;
  finish: string | null;
  supplier: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  notes: string | null;
};

export type InspirationTag = {
  selectionId: string;
  category: string | null;
  subcategory: string | null;
  itemName: string | null;
  brand: string | null;
  productName: string | null;
  colourName: string | null;
  materialType: string | null;
  roomType: string | null;
  imageUrl?: string | null;
};

export type InspirationImage = {
  id: string;
  imageUrl: string | null;
  buildId: string;
  buildTitle: string;
  buildSlug: string;
  ownerUsername: string;
  designStyle: string | null;
  notes: string | null;
  imageKind: string | null;
  tags: InspirationTag[];
};

export type PlanningSuburb = {
  id: string;
  suburb_name: string;
  notes: string | null;
};

export type PlanningBuilder = {
  id: string;
  builder_name: string;
  website: string | null;
  notes: string | null;
};

export type PublicSavedBuild = {
  id: string;
  buildId: string;
  buildTitle: string;
  buildSlug: string;
  buildSuburb: string | null;
  buildStyle: string | null;
  buildImageUrl: string | null;
  ownerUsername: string;
};

export type PublicComment = {
  id: string;
  userId: string | null;
  username: string;
  content: string;
  createdAt: string | null;
  parentCommentId: string | null;
  imageUrl: string | null;
};

type BuildRow = {
  id: string;
  title: string;
  slug: string;
  owner_id: string;
  cover_image_path: string | null;
  builder_id?: string | null;
  builder_name: string | null;
  builder?: BuilderRelation | BuilderRelation[] | null;
  suburb_name: string | null;
  estate_name?: string | null;
  style: string | null;
  created_at?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  separate_toilets?: number | null;
  garage_spaces?: number | null;
  land_size_m2?: number | null;
  internal_size_m2?: number | null;
  alfresco_size_m2?: number | null;
  home_width_m?: number | null;
  home_depth_m?: number | null;
  build_type?: string | null;
  construction_type?: string | null;
  roof_structure?: string | null;
  home_design_style?: string | null;
  stage?: string | null;
  planning_styles?: string[] | null;
  budget_land_min?: number | null;
  budget_land_max?: number | null;
  budget_build_min?: number | null;
  budget_build_max?: number | null;
  description?: string | null;
  state?: string | null;
};

type BuilderRelation = {
  id?: string | null;
  name: string | null;
  slug: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path?: string | null;
};

type MilestoneRow = {
  id: string;
  title: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort_order?: number | null;
};

type ImageRow = {
  id: string;
  storage_path: string | null;
  milestone_id?: string | null;
  update_id?: string | null;
  selection_id?: string | null;
  image_kind?: string | null;
  notes?: string | null;
  visibility?: string | null;
  plan_type?: string | null;
};

type UpdateRow = {
  id: string;
  content?: string | null;
  milestone_id?: string | null;
  created_at?: string | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string | null;
  parent_comment_id?: string | null;
  image_path?: string | null;
  [key: string]: unknown;
};

type RoomRow = {
  id: string;
  name: string;
  room_type: string | null;
};

type SelectionRow = {
  id: string;
  selection_type: string | null;
  category: string | null;
  subcategory: string | null;
  location: string | null;
  room_id: string | null;
  item_name: string | null;
  material_type: string | null;
  brand: string | null;
  product_name: string | null;
  model: string | null;
  colour_name: string | null;
  code: string | null;
  finish: string | null;
  supplier: string | null;
  product_url: string | null;
  image_path: string | null;
  notes: string | null;
};

function displayName(profile?: ProfileRow) {
  if (!profile) return "Builder";
  return profile.display_name || profile.username;
}

function phaseFromStyle(style: string | null) {
  return style || "Build";
}

function builderRelation(build: BuildRow) {
  return Array.isArray(build.builder) ? build.builder[0] ?? null : build.builder ?? null;
}

function builderNameFor(build: BuildRow) {
  return builderRelation(build)?.name || build.builder_name || "Owner builder";
}

function builderSlugFor(build: BuildRow) {
  return builderRelation(build)?.slug || slugFor(build.builder_name || "Owner builder");
}

function countByBuild(rows: { build_id: string }[] | null | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.build_id, (counts.get(row.build_id) ?? 0) + 1);
  }
  return counts;
}

function countByMilestone(rows: { milestone_id: string | null }[] | null | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    if (!row.milestone_id) continue;
    counts.set(row.milestone_id, (counts.get(row.milestone_id) ?? 0) + 1);
  }
  return counts;
}

function weeksSince(value: string | null | undefined) {
  if (!value) return null;
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return null;
  const diff = Date.now() - created;
  if (diff < 0) return 1;
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1);
}

async function getOwners(builds: BuildRow[]) {
  const supabase = createAdminClient();
  const ownerIds = Array.from(new Set(builds.map((build) => build.owner_id)));
  if (ownerIds.length === 0) return new Map<string, ProfileRow>();

  const { data } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_path")
    .in("id", ownerIds);

  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
}

async function enrichBuildCards(builds: BuildRow[]): Promise<PublicBuildCard[]> {
  if (builds.length === 0) return [];

  const supabase = createAdminClient();
  const buildIds = builds.map((build) => build.id);
  const [owners, { data: follows }, { data: comments }, { data: updates }] = await Promise.all([
    getOwners(builds),
    supabase.from("build_follows").select("build_id").in("build_id", buildIds),
    supabase
      .from("comments")
      .select("build_id")
      .in("build_id", buildIds)
      .is("update_id", null)
      .is("image_id", null),
    supabase.from("build_updates").select("build_id").in("build_id", buildIds),
  ]);

  const followCounts = countByBuild(follows as { build_id: string }[] | null);
  const commentCounts = countByBuild(comments as { build_id: string }[] | null);
  const updateCounts = countByBuild(updates as { build_id: string }[] | null);
  const signedUrls = await getSignedImageUrls(builds.map((build) => build.cover_image_path).filter(Boolean) as string[]);

  return builds.map((build) => {
    const owner = owners.get(build.owner_id);
    const imageUrl = build.cover_image_path ? signedUrls.get(build.cover_image_path) ?? null : null;

    return {
      id: build.id,
      title: build.title,
      slug: build.slug,
      ownerId: build.owner_id,
      username: owner?.username ?? "user",
      ownerName: displayName(owner),
      builder: builderNameFor(build),
      builderSlug: builderSlugFor(build),
      suburb: build.suburb_name,
      estate: build.estate_name ?? null,
      phase: phaseFromStyle(build.style),
      stage: build.stage ?? null,
      type: build.style || "Build",
      followers: followCounts.get(build.id) ?? 0,
      comments: commentCounts.get(build.id) ?? 0,
      updateCount: updateCounts.get(build.id) ?? 0,
      week: weeksSince(build.created_at),
      imageUrl,
      designStyle: build.home_design_style ?? null,
      state: build.state ?? null,
    };
  });
}

export async function getPublicBuilds() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("builds")
    .select("id,title,slug,owner_id,cover_image_path,builder_id,builder_name,builder:builders!builder_id(id,name,slug),suburb_name,estate_name,style,home_design_style,stage,state,created_at")
    .eq("is_listed", true)
    .order("created_at", { ascending: false })
    .limit(60);

  return enrichBuildCards((data ?? []) as BuildRow[]);
}

export async function getPublicProfile(username: string, viewerId?: string | null) {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_path")
    .eq("username", username)
    .maybeSingle<ProfileRow>();

  if (!profile) notFound();

  // Owners can see their own private builds; everyone else only sees listed ones
  const buildsQuery = supabase
    .from("builds")
    .select("id,title,slug,owner_id,cover_image_path,builder_id,builder_name,builder:builders!builder_id(id,name,slug),suburb_name,estate_name,style,home_design_style,stage,state,created_at")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: builds } = viewerId === profile.id
    ? await buildsQuery
    : await buildsQuery.eq("is_listed", true);

  const cards = await enrichBuildCards((builds ?? []) as BuildRow[]);

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: displayName(profile),
      avatarPath: profile.avatar_path ?? null,
    },
    builds: cards,
  };
}

export async function getBuilderDirectory() {
  const builds = await getDirectoryBuilds();
  return groupDirectory(builds, builderNameFor, builderSlugFor);
}

export async function getBuilderDetail(slug: string) {
  const builds = await getDirectoryBuilds();
  const matching = builds.filter((build) => builderSlugFor(build) === slug);
  if (matching.length === 0) notFound();

  const cards = await enrichBuildCards(matching);
  const name = builderNameFor(matching[0]);
  return {
    entry: directoryEntry(name, matching, slug),
    builds: cards,
  };
}

export async function getSuburbDirectory() {
  const builds = await getDirectoryBuilds();
  return groupDirectory(builds, (build) => build.suburb_name || "Unknown suburb");
}

export async function getSuburbDetail(slug: string) {
  const builds = await getDirectoryBuilds();
  const matching = builds.filter((build) => slugFor(build.suburb_name || "Unknown suburb") === slug);
  if (matching.length === 0) notFound();

  const cards = await enrichBuildCards(matching);
  const name = matching[0].suburb_name || "Unknown suburb";
  return {
    entry: directoryEntry(name, matching),
    builds: cards,
  };
}

export async function getEstateDirectory() {
  const builds = await getDirectoryBuilds();
  return groupDirectory(
    builds.filter((build) => build.estate_name),
    (build) => build.estate_name || "Unknown estate",
  );
}

export async function getEstateDetail(slug: string) {
  const builds = await getDirectoryBuilds();
  const matching = builds.filter((build) => build.estate_name && slugFor(build.estate_name) === slug);
  if (matching.length === 0) notFound();

  const cards = await enrichBuildCards(matching);
  const name = matching[0].estate_name || "Unknown estate";
  return {
    entry: directoryEntry(name, matching),
    builds: cards,
  };
}

async function getDirectoryBuilds() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("builds")
    .select("id,title,slug,owner_id,cover_image_path,builder_id,builder_name,builder:builders!builder_id(id,name,slug),suburb_name,estate_name,style,state,created_at")
    .eq("is_listed", true)
    .order("created_at", { ascending: false })
    .limit(500);

  return (data ?? []) as BuildRow[];
}

function groupDirectory(builds: BuildRow[], nameFor: (build: BuildRow) => string, slugForBuild?: (build: BuildRow) => string) {
  const groups = new Map<string, BuildRow[]>();
  for (const build of builds) {
    const name = nameFor(build);
    const slug = slugForBuild?.(build) ?? slugFor(name);
    groups.set(slug, [...(groups.get(slug) ?? []), build]);
  }

  return Array.from(groups.values())
    .map((group) => directoryEntry(nameFor(group[0]), group, slugForBuild?.(group[0])))
    .sort((a, b) => b.buildCount - a.buildCount || a.name.localeCompare(b.name));
}

function directoryEntry(name: string, builds: BuildRow[], slug?: string): DirectoryEntry {
  const builderLinks = new Map<string, { name: string; slug: string }>();
  for (const build of builds) {
    const builderName = builderNameFor(build);
    const builderSlug = builderSlugFor(build);
    if (!builderLinks.has(builderSlug)) builderLinks.set(builderSlug, { name: builderName, slug: builderSlug });
  }

  return {
    slug: slug ?? slugFor(name),
    name,
    buildCount: builds.length,
    avgDays: null,
    suburbs: Array.from(new Set(builds.map((build) => build.suburb_name).filter(Boolean) as string[])),
    states: Array.from(new Set(builds.map((build) => build.state).filter(Boolean) as string[])).sort(),
    builders: Array.from(builderLinks.values()).map((builder) => builder.name),
    builderLinks: Array.from(builderLinks.values()),
    developer: null,
  };
}

function slugFor(value: string) {
  return slugify(value, { lower: true, strict: true });
}

export async function getPublicBuild(username: string, slug: string): Promise<PublicBuildDetail> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const supabase = createAdminClient();
  const { profile, builds } = await getPublicProfile(username, user?.id);
  const card = builds.find((build) => build.slug === slug);

  if (!card) notFound();

  const { data: buildRow } = await supabase
    .from("builds")
    .select("id,title,slug,owner_id,cover_image_path,builder_id,builder_name,suburb_name,estate_name,style,created_at,bedrooms,bathrooms,separate_toilets,garage_spaces,land_size_m2,internal_size_m2,alfresco_size_m2,home_width_m,home_depth_m,build_type,construction_type,roof_structure,home_design_style,stage,state,planning_styles,budget_land_min,budget_land_max,budget_build_min,budget_build_max,description")
    .eq("id", card.id)
    .maybeSingle<BuildRow>();

  if (!buildRow) notFound();

  const [
    { data: milestonesData },
    { data: imagesData },
    { data: updateData },
    { data: updateCommentsData },
    { data: updateLikesData },
    { data: commentsData },
    { data: imageCommentsData },
    { data: followingData },
    { data: selectionsData },
    { data: roomsData },
    { data: planningSuburbsData },
    { data: planningBuildersData },
    { data: planningSavedBuildsData },
  ] = await Promise.all([
    supabase.from("milestones").select("id,title,status,start_date,end_date,sort_order").eq("build_id", card.id).order("sort_order", { ascending: true }),
    supabase.from("build_images").select("id,storage_path,milestone_id,update_id,selection_id,image_kind,notes,visibility,plan_type").eq("build_id", card.id).not("storage_path", "is", null).order("created_at", { ascending: false }).limit(120),
    supabase.from("build_updates").select("id,content,milestone_id,created_at").eq("build_id", card.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("comments").select("update_id").eq("build_id", card.id).not("update_id", "is", null),
    supabase.from("update_likes").select("update_id"),
    supabase
      .from("comments")
      .select("*")
      .eq("build_id", card.id)
      .is("update_id", null)
      .is("image_id", null)
      .order("created_at", { ascending: true })
      .limit(30),
    supabase.from("comments").select("image_id").eq("build_id", card.id).not("image_id", "is", null),
    user
      ? supabase.from("build_follows").select("build_id").eq("build_id", card.id).eq("follower_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("selections")
      .select("id,selection_type,category,subcategory,location,room_id,item_name,material_type,brand,product_name,model,colour_name,code,finish,supplier,product_url,image_path,notes")
      .eq("build_id", card.id)
      .order("created_at", { ascending: false }),
    supabase.from("rooms").select("id,name,room_type").eq("build_id", card.id).order("created_at", { ascending: true }),
    supabase.from("planning_suburbs").select("id,suburb_name,notes").eq("build_id", card.id).order("sort_order", { ascending: true }),
    supabase.from("planning_builders").select("id,builder_name,website,notes").eq("build_id", card.id).order("sort_order", { ascending: true }),
    supabase.from("planning_saved_builds").select("id,saved_build_id").eq("planning_build_id", card.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const updateCounts = countByMilestone(updateData as { milestone_id: string | null }[] | null);
  const milestones = ((milestonesData ?? []) as MilestoneRow[]).map((milestone, index) => ({
    id: milestone.id,
    title: milestone.title,
    status: normalizeMilestoneStatus(milestone.status, index),
    updates: updateCounts.get(milestone.id) ?? 0,
    startDate: milestone.start_date ?? null,
    endDate: milestone.end_date ?? null,
  }));
  const milestoneNames = new Map(milestones.map((milestone) => [milestone.id, milestone.title]));

  const imageRows = (imagesData ?? []) as ImageRow[];
  const selectionImageRows = imageRows.filter((image) => image.selection_id);
  const inspirationImageRows = imageRows.filter((image) => image.image_kind === "inspiration");
  const galleryImageRows = imageRows.filter((image) => !image.selection_id && image.image_kind !== "inspiration" && image.image_kind !== "plan");
  const floorPlanRows = imageRows.filter((image) => image.image_kind === "plan" && image.plan_type === "floorplan" && image.visibility === "public");
  const selectionRows = (selectionsData ?? []) as SelectionRow[];
  const imagePaths = [
    ...imageRows.map((image) => image.storage_path).filter(Boolean),
    ...selectionRows.map((selection) => selection.image_path).filter(Boolean),
  ] as string[];
  const signedImageUrls = await getSignedImageUrls(imagePaths);
  const roomsById = new Map(((roomsData ?? []) as RoomRow[]).map((room) => [room.id, room]));
  const imagesBySelectionId = new Map<string, ImageRow>();
  for (const image of selectionImageRows) {
    if (!image.selection_id || imagesBySelectionId.has(image.selection_id)) continue;
    imagesBySelectionId.set(image.selection_id, image);
  }
  const updateRows = (updateData ?? []) as UpdateRow[];
  const imagesByUpdate = new Map<string, ImageRow[]>();
  for (const image of galleryImageRows) {
    if (!image.update_id) continue;
    imagesByUpdate.set(image.update_id, [...(imagesByUpdate.get(image.update_id) ?? []), image]);
  }
  const commentCountsByUpdate = new Map<string, number>();
  for (const comment of (updateCommentsData ?? []) as { update_id: string | null }[]) {
    if (!comment.update_id) continue;
    commentCountsByUpdate.set(comment.update_id, (commentCountsByUpdate.get(comment.update_id) ?? 0) + 1);
  }
  const likeCountsByUpdate = new Map<string, number>();
  for (const like of (updateLikesData ?? []) as { update_id: string | null }[]) {
    if (!like.update_id) continue;
    likeCountsByUpdate.set(like.update_id, (likeCountsByUpdate.get(like.update_id) ?? 0) + 1);
  }
  const galleryImageIds = galleryImageRows.map((img) => img.id);
  const galleryTagsByImageId = new Map<string, InspirationTag[]>();
  if (galleryImageIds.length > 0) {
    type GalleryTagRow = {
      image_id: string;
      selections: { id: string; category: string | null; subcategory: string | null; item_name: string | null; brand: string | null; product_name: string | null; colour_name: string | null; material_type: string | null; image_path: string | null; rooms: { room_type: string | null } | null } | null;
    };
    const { data: galleryTagsData } = await supabase
      .from("image_selection_tags")
      .select("image_id,selections(id,category,subcategory,item_name,brand,product_name,colour_name,material_type,image_path,rooms(room_type))")
      .in("image_id", galleryImageIds);
    const tagRows = (galleryTagsData ?? []) as unknown as GalleryTagRow[];
    const selectionImagePaths = [...new Set(tagRows.map((t) => t.selections?.image_path).filter(Boolean) as string[])];
    const selectionImageUrls = selectionImagePaths.length > 0 ? await getSignedImageUrls(selectionImagePaths) : new Map<string, string>();
    for (const tag of tagRows) {
      const s = tag.selections;
      if (!s) continue;
      const existing = galleryTagsByImageId.get(tag.image_id) ?? [];
      const selImgUrl = s.image_path
        ? (selectionImageUrls.get(s.image_path) ?? null)
        : (() => { const li = imagesBySelectionId.get(s.id); return li?.storage_path ? (signedImageUrls.get(li.storage_path) ?? null) : null; })();
      existing.push({ selectionId: s.id, category: s.category, subcategory: s.subcategory, itemName: s.item_name, brand: s.brand, productName: s.product_name, colourName: s.colour_name, materialType: s.material_type, roomType: s.rooms?.room_type ?? null, imageUrl: selImgUrl });
      galleryTagsByImageId.set(tag.image_id, existing);
    }
  }

  const commentRows = (commentsData ?? []) as CommentRow[];
  const imageCommentCounts = new Map<string, number>();
  for (const comment of (imageCommentsData ?? []) as { image_id: string | null }[]) {
    if (!comment.image_id) continue;
    imageCommentCounts.set(comment.image_id, (imageCommentCounts.get(comment.image_id) ?? 0) + 1);
  }
  const commentUserIds = Array.from(new Set(commentRows.map((comment) => getCommentAuthorId(comment)).filter(Boolean) as string[]));
  const { data: commentProfiles } = commentUserIds.length
    ? await supabase.from("profiles").select("id,username").in("id", commentUserIds)
    : { data: [] };
  const commentUsernames = new Map(((commentProfiles ?? []) as Pick<ProfileRow, "id" | "username">[]).map((commentProfile) => [commentProfile.id, commentProfile.username]));
  const signedCommentImages = await getSignedImageUrls(commentRows.map((comment) => comment.image_path).filter(Boolean) as string[]);
  const fallbackImage = card.imageUrl ?? (buildRow.cover_image_path ? await getSignedImageUrl(buildRow.cover_image_path) : null);

  // Resolve saved build details for the public "Saved Builds" tab
  const savedBuildRows = (planningSavedBuildsData ?? []) as { id: string; saved_build_id: string }[];
  let planningPublicSavedBuilds: PublicSavedBuild[] = [];
  if (savedBuildRows.length > 0) {
    const savedIds = savedBuildRows.map((r) => r.saved_build_id);
    const { data: savedBuildsDetail } = await supabase
      .from("builds")
      .select("id,title,slug,suburb_name,style,cover_image_path,owner_id")
      .in("id", savedIds);
    const savedOwnerIds = Array.from(new Set((savedBuildsDetail ?? []).map((b: Record<string, unknown>) => b.owner_id as string).filter(Boolean)));
    const { data: savedOwnerProfiles } = savedOwnerIds.length
      ? await supabase.from("profiles").select("id,username").in("id", savedOwnerIds)
      : { data: [] };
    const savedOwnerMap = new Map(((savedOwnerProfiles ?? []) as Pick<ProfileRow, "id" | "username">[]).map((p) => [p.id, p.username]));
    const savedCoverPaths = (savedBuildsDetail ?? []).map((b: Record<string, unknown>) => b.cover_image_path as string).filter(Boolean) as string[];
    const savedCoverUrls = await getSignedImageUrls(savedCoverPaths);
    const savedDetailMap = new Map((savedBuildsDetail ?? []).map((b: Record<string, unknown>) => [b.id as string, b]));
    planningPublicSavedBuilds = savedBuildRows
      .map((row) => {
        const b = savedDetailMap.get(row.saved_build_id);
        if (!b) return null;
        const ownerUsername = savedOwnerMap.get(b.owner_id as string) ?? "";
        const coverPath = b.cover_image_path as string | null;
        return {
          id: row.id,
          buildId: row.saved_build_id,
          buildTitle: b.title as string,
          buildSlug: b.slug as string,
          buildSuburb: (b.suburb_name as string | null) ?? null,
          buildStyle: (b.style as string | null) ?? null,
          buildImageUrl: coverPath ? (savedCoverUrls.get(coverPath) ?? null) : null,
          ownerUsername,
        } satisfies PublicSavedBuild;
      })
      .filter((item): item is PublicSavedBuild => item !== null);
  }

  return {
    ...card,
    currentUserId: user?.id ?? null,
    floorPlans: floorPlanRows
      .map((image) => {
        const url = image.storage_path ? (signedImageUrls.get(image.storage_path) ?? null) : null;
        if (!url) return null;
        const isPdf = (image.storage_path ?? '').toLowerCase().endsWith('.pdf')
        return { id: image.id, imageUrl: url, planType: image.plan_type ?? null, isPdf, commentCount: imageCommentCounts.get(image.id) ?? 0 } satisfies PublicFloorPlan;
      })
      .filter((p): p is PublicFloorPlan => p !== null),
    ownerName: profile.displayName,
    estate: buildRow.estate_name ?? null,
    state: buildRow.state ?? null,
    status: "In progress",
    description: buildRow.description ?? null,
    style: buildRow.style,
    stage: buildRow.stage ?? null,
    planningStyles: (buildRow.planning_styles as string[] | null) ?? [],
    planningSuburbs: (planningSuburbsData ?? []) as PlanningSuburb[],
    planningBuilders: (planningBuildersData ?? []) as PlanningBuilder[],
    planningPublicSavedBuilds,
    isFollowing: Boolean(followingData),
    budget: {
      landMin: buildRow.budget_land_min ?? null,
      landMax: buildRow.budget_land_max ?? null,
      buildMin: buildRow.budget_build_min ?? null,
      buildMax: buildRow.budget_build_max ?? null,
    },
    specs: {
      bedrooms: buildRow.bedrooms ?? null,
      bathrooms: buildRow.bathrooms ?? null,
      separateToilets: buildRow.separate_toilets ?? null,
      garageSpaces: buildRow.garage_spaces ?? null,
      landSizeM2: buildRow.land_size_m2 ?? null,
      internalSizeM2: buildRow.internal_size_m2 ?? null,
      alfrescoSizeM2: buildRow.alfresco_size_m2 ?? null,
      homeWidthM: buildRow.home_width_m ?? null,
      homeDepthM: buildRow.home_depth_m ?? null,
      buildType: buildRow.build_type ?? null,
      constructionType: buildRow.construction_type ?? null,
      roofStructure: buildRow.roof_structure ?? null,
      homeDesignStyle: buildRow.home_design_style ?? null,
    },
    imageUrl: fallbackImage,
    milestones,
    images: galleryImageRows
      .map((image) => {
        const path = image.storage_path ?? "";
        const imageUrl = path ? (signedImageUrls.get(path) ?? null) : null;
        if (!imageUrl) return null;
        return {
          id: image.id,
          imageUrl,
          milestone: image.milestone_id ? milestoneNames.get(image.milestone_id) ?? "Build" : "Build",
          milestoneId: image.milestone_id ?? null,
          updateId: image.update_id ?? null,
          commentCount: imageCommentCounts.get(image.id) ?? 0,
          notes: image.notes ?? null,
          selectionTags: galleryTagsByImageId.get(image.id) ?? [],
        };
      })
      .filter((img): img is NonNullable<typeof img> => img !== null),
    inspirationImages: inspirationImageRows.map((image) => {
      const path = image.storage_path ?? "";
      return {
        id: image.id,
        imageUrl: signedImageUrls.get(path) ?? null,
        milestone: "Inspiration",
        milestoneId: null,
        updateId: null,
        commentCount: imageCommentCounts.get(image.id) ?? 0,
        notes: image.notes ?? null,
      };
    }),
    updates: updateRows.map((update) => {
      const updateImages = imagesByUpdate.get(update.id) ?? [];
      const firstImage = updateImages[0] ?? null;
      const path = firstImage?.storage_path ?? "";
      const imageUrls = updateImages
        .map((image) => {
          return image.storage_path ? signedImageUrls.get(image.storage_path) ?? null : null;
        })
        .filter((url): url is string => Boolean(url));
      return {
        id: update.id,
        content: update.content ?? "",
        milestone: update.milestone_id ? milestoneNames.get(update.milestone_id) ?? "Build" : "Build",
        createdAt: update.created_at ?? null,
        imageId: firstImage?.id ?? null,
        imageUrl: path ? signedImageUrls.get(path) ?? fallbackImage : null,
        imageUrls,
        imageIds: updateImages.map((image) => image.id),
        imageCount: updateImages.length,
        commentCount: commentCountsByUpdate.get(update.id) ?? 0,
        likeCount: likeCountsByUpdate.get(update.id) ?? 0,
      };
    }),
    selections: selectionRows.map((selection) => {
      const linkedImage = imagesBySelectionId.get(selection.id);
      const linkedImageUrl = linkedImage?.storage_path ? signedImageUrls.get(linkedImage.storage_path) ?? null : null;
      return {
        id: selection.id,
        selectionType: selection.selection_type,
        category: selection.category,
        subcategory: selection.subcategory,
        location: selection.location,
        roomName: selection.room_id ? roomsById.get(selection.room_id)?.name ?? null : null,
        roomType: selection.room_id ? roomsById.get(selection.room_id)?.room_type ?? null : null,
        itemName: selection.item_name,
        materialType: selection.material_type,
        brand: selection.brand,
        productName: selection.product_name,
        model: selection.model,
        colourName: selection.colour_name,
        code: selection.code,
        finish: selection.finish,
        supplier: selection.supplier,
        productUrl: selection.product_url,
        imageUrl: selection.image_path ? signedImageUrls.get(selection.image_path) ?? linkedImageUrl : linkedImageUrl,
        notes: selection.notes,
      };
    }),
    buildComments: commentRows.map((comment) => ({
      id: comment.id,
      userId: getCommentAuthorId(comment),
      username: commentUsernames.get(getCommentAuthorId(comment) ?? "") ?? "user",
      content: comment.content,
      createdAt: comment.created_at,
      parentCommentId: comment.parent_comment_id ?? null,
      imageUrl: comment.image_path ? signedCommentImages.get(comment.image_path) ?? null : null,
    })),
  };
}

export async function getInspirationImages(): Promise<InspirationImage[]> {
  const supabase = createAdminClient();

  const { data: buildsData } = await supabase
    .from("builds")
    .select("id,title,slug,owner_id,home_design_style")
    .eq("is_listed", true)
    .limit(100);

  const builds = (buildsData ?? []) as { id: string; title: string; slug: string; owner_id: string; home_design_style: string | null }[];
  if (builds.length === 0) return [];

  const buildIds = builds.map((b) => b.id);
  const ownerIds = Array.from(new Set(builds.map((b) => b.owner_id)));

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id,username")
    .in("id", ownerIds);

  const profileMap = new Map(((profilesData ?? []) as { id: string; username: string }[]).map((p) => [p.id, p.username]));
  const buildMap = new Map(builds.map((b) => [b.id, b]));

  const { data: imagesData } = await supabase
    .from("build_images")
    .select("id,storage_path,build_id,notes,image_kind")
    .in("build_id", buildIds)
    .not("image_kind", "in", '("plan","selection")')
    .not("storage_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(400);

  const images = (imagesData ?? []) as { id: string; storage_path: string; build_id: string; notes: string | null; image_kind: string | null; }[];
  if (images.length === 0) return [];

  const imageIds = images.map((i) => i.id);

  type SelectionTagRow = {
    image_id: string;
    selection_id: string;
    selections: {
      id: string;
      category: string | null;
      subcategory: string | null;
      item_name: string | null;
      brand: string | null;
      product_name: string | null;
      colour_name: string | null;
      material_type: string | null;
      image_path: string | null;
      rooms: { room_type: string | null } | null;
    } | null;
  };

  const { data: tagsData } = await supabase
    .from("image_selection_tags")
    .select("image_id,selection_id,selections(id,category,subcategory,item_name,brand,product_name,colour_name,material_type,image_path,rooms(room_type))")
    .in("image_id", imageIds);

  const tagRows = (tagsData ?? []) as unknown as SelectionTagRow[];

  // Selections without their own image_path need a build_images fallback
  const selectionIdsWithoutImage = Array.from(new Set(
    tagRows.filter((t) => t.selections && !t.selections.image_path).map((t) => t.selection_id)
  ));

  // Fetch one linked build image per selection as fallback thumbnail
  const linkedImagePathBySelectionId = new Map<string, string>();
  if (selectionIdsWithoutImage.length > 0) {
    const { data: linkedRows } = await supabase
      .from("build_images")
      .select("selection_id,storage_path")
      .in("selection_id", selectionIdsWithoutImage)
      .not("storage_path", "is", null);
    for (const row of (linkedRows ?? []) as { selection_id: string | null; storage_path: string | null }[]) {
      if (row.selection_id && row.storage_path && !linkedImagePathBySelectionId.has(row.selection_id)) {
        linkedImagePathBySelectionId.set(row.selection_id, row.storage_path);
      }
    }
  }

  const directPaths = tagRows.map((t) => t.selections?.image_path).filter(Boolean) as string[];
  const fallbackPaths = Array.from(linkedImagePathBySelectionId.values());
  const selectionImageUrls = await getSignedImageUrls([...directPaths, ...fallbackPaths]);

  const tagsByImageId = new Map<string, InspirationTag[]>();
  for (const tag of tagRows) {
    const s = tag.selections;
    if (!s) continue;
    const existing = tagsByImageId.get(tag.image_id) ?? [];
    const imageUrl = s.image_path
      ? (selectionImageUrls.get(s.image_path) ?? null)
      : (() => { const fp = linkedImagePathBySelectionId.get(s.id); return fp ? (selectionImageUrls.get(fp) ?? null) : null; })();
    existing.push({
      selectionId: s.id,
      category: s.category,
      subcategory: s.subcategory,
      itemName: s.item_name,
      brand: s.brand,
      productName: s.product_name,
      colourName: s.colour_name,
      materialType: s.material_type,
      roomType: s.rooms?.room_type ?? null,
      imageUrl,
    });
    tagsByImageId.set(tag.image_id, existing);
  }

  const paths = images.map((i) => i.storage_path).filter(Boolean) as string[];
  const signedUrls = await getSignedImageUrls(paths);

  const result: InspirationImage[] = [];
  for (const image of images) {
    const build = buildMap.get(image.build_id);
    if (!build) continue;
    const imageUrl = signedUrls.get(image.storage_path) ?? null;
    if (!imageUrl) continue;
    result.push({
      id: image.id,
      imageUrl,
      buildId: image.build_id,
      buildTitle: build.title,
      buildSlug: build.slug,
      ownerUsername: profileMap.get(build.owner_id) ?? "user",
      designStyle: build.home_design_style,
      notes: image.notes,
      imageKind: image.image_kind,
      tags: tagsByImageId.get(image.id) ?? [],
    });
  }
  return result;
}

// ── Paginated discovery ────────────────────────────────────────────────────

export async function getPaginatedPublicBuilds({
  offset = 0,
  search = "",
  phases = [] as string[],
  types = [] as string[],
  states = [] as string[],
  milestoneCategories = [] as string[],
  sort = "recent",
  limit = 24,
}: {
  offset?: number;
  search?: string;
  phases?: string[];
  types?: string[];
  states?: string[];
  milestoneCategories?: string[];
  sort?: string;
  limit?: number;
} = {}): Promise<{ builds: PublicBuildCard[]; hasMore: boolean }> {
  const supabase = createAdminClient();
  const buildSelect =
    "id,title,slug,owner_id,cover_image_path,builder_id,builder_name,builder:builders!builder_id(id,name,slug),suburb_name,estate_name,style,home_design_style,stage,state,created_at";
  const styleFilter = [...phases, ...types];

  // When milestone categories are selected, pre-fetch the build IDs that have a matching milestone tag
  let categoryBuildIds: Set<string> | null = null;
  if (milestoneCategories.length > 0) {
    const { data: milestoneRows } = await supabase
      .from("milestones")
      .select("build_id")
      .overlaps("milestone_categories", milestoneCategories);
    const ids = ((milestoneRows ?? []) as { build_id: string }[]).map((r) => r.build_id);
    if (ids.length === 0) return { builds: [], hasMore: false };
    categoryBuildIds = new Set(ids);
  }

  if (sort === "followers" || sort === "updates") {
    let idQ = supabase.from("builds").select("id").eq("is_listed", true).order("created_at", { ascending: false }).limit(500);
    if (search) idQ = idQ.or(`title.ilike.%${search}%,builder_name.ilike.%${search}%,suburb_name.ilike.%${search}%`);
    if (styleFilter.length > 0) idQ = idQ.in("style", styleFilter);
    if (states.length > 0) idQ = idQ.in("state", states);
    const { data: idRows } = await idQ;
    let ids = ((idRows ?? []) as { id: string }[]).map((r) => r.id);
    if (categoryBuildIds) ids = ids.filter((id) => categoryBuildIds!.has(id));
    if (ids.length === 0) return { builds: [], hasMore: false };

    const countTable = sort === "followers" ? "build_follows" : "build_updates";
    const { data: countRows } = await supabase.from(countTable).select("build_id").in("build_id", ids);
    const countMap = new Map<string, number>();
    for (const row of (countRows ?? []) as { build_id: string }[])
      countMap.set(row.build_id, (countMap.get(row.build_id) ?? 0) + 1);

    const sorted = [...ids].sort((a, b) => (countMap.get(b) ?? 0) - (countMap.get(a) ?? 0));
    const pageIds = sorted.slice(offset, offset + limit);
    if (pageIds.length === 0) return { builds: [], hasMore: false };

    const { data: pageData } = await supabase.from("builds").select(buildSelect).in("id", pageIds);
    const byId = new Map(((pageData ?? []) as BuildRow[]).map((b) => [b.id, b]));
    const ordered = pageIds.map((id) => byId.get(id)).filter(Boolean) as BuildRow[];
    return { builds: await enrichBuildCards(ordered), hasMore: offset + limit < sorted.length };
  }

  let q = supabase.from("builds").select(buildSelect).eq("is_listed", true).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (search) q = q.or(`title.ilike.%${search}%,builder_name.ilike.%${search}%,suburb_name.ilike.%${search}%`);
  if (styleFilter.length > 0) q = q.in("style", styleFilter);
  if (states.length > 0) q = q.in("state", states);
  if (categoryBuildIds) q = q.in("id", [...categoryBuildIds]);

  const { data, error: qError } = await q;
  if (qError) console.error("[getPaginatedPublicBuilds] query error:", qError.message, qError.details);
  const rows = (data ?? []) as BuildRow[];
  return { builds: await enrichBuildCards(rows), hasMore: rows.length === limit };
}

type InspirationImageRow = {
  id: string;
  storage_path: string;
  build_id: string;
  notes: string | null;
  image_kind: string | null;
  image_selection_tags: {
    selection_id: string;
    selections: {
      category: string | null;
      subcategory: string | null;
      item_name: string | null;
      brand: string | null;
      product_name: string | null;
      colour_name: string | null;
      material_type: string | null;
      image_path: string | null;
      rooms: { room_type: string | null } | null;
    } | null;
  }[];
};

type RawInspoTag = InspirationImageRow["image_selection_tags"][number];

function parseInspoTags(raw: RawInspoTag[], imageUrlById?: Map<string, string | null>): InspirationTag[] {
  return raw.flatMap((t) => {
    const s = t.selections;
    if (!s) return [];
    return [{ selectionId: t.selection_id, category: s.category, subcategory: s.subcategory, itemName: s.item_name, brand: s.brand, productName: s.product_name, colourName: s.colour_name, materialType: s.material_type, roomType: s.rooms?.room_type ?? null, imageUrl: imageUrlById?.get(t.selection_id) ?? null }];
  });
}

export async function getPaginatedInspirationImages({
  rawOffset = 0,
  search = "",
  categories = [] as string[],
  rooms = [] as string[],
  styles = [] as string[],
  limit = 24,
}: {
  rawOffset?: number;
  search?: string;
  categories?: string[];
  rooms?: string[];
  styles?: string[];
  limit?: number;
} = {}): Promise<{ images: InspirationImage[]; nextRawOffset: number; hasMore: boolean }> {
  const supabase = createAdminClient();

  const { data: buildsData } = await supabase.from("builds").select("id,title,slug,owner_id,home_design_style").eq("is_listed", true);
  const allBuilds = (buildsData ?? []) as { id: string; title: string; slug: string; owner_id: string; home_design_style: string | null }[];
  if (allBuilds.length === 0) return { images: [], nextRawOffset: rawOffset, hasMore: false };

  const filteredBuilds = styles.length > 0 ? allBuilds.filter((b) => b.home_design_style && styles.includes(b.home_design_style)) : allBuilds;
  if (filteredBuilds.length === 0) return { images: [], nextRawOffset: rawOffset, hasMore: false };

  const buildIds = filteredBuilds.map((b) => b.id);
  const ownerIds = [...new Set(filteredBuilds.map((b) => b.owner_id))];
  const { data: profilesData } = await supabase.from("profiles").select("id,username").in("id", ownerIds);
  const profileMap = new Map(((profilesData ?? []) as { id: string; username: string }[]).map((p) => [p.id, p.username]));
  const buildMap = new Map(filteredBuilds.map((b) => [b.id, b]));

  const q = search.length >= 3 ? search.toLowerCase() : "";
  const BATCH = 80;
  const MAX_BATCHES = 6;
  const collected: { img: InspirationImageRow; rawTags: RawInspoTag[] }[] = [];
  let cur = rawOffset;
  let fetched = 0;
  let exhausted = false;

  while (collected.length < limit && fetched < MAX_BATCHES && !exhausted) {
    const { data } = await supabase
      .from("build_images")
      .select("id,storage_path,build_id,notes,image_kind,image_selection_tags(selection_id,selections(category,subcategory,item_name,brand,product_name,colour_name,material_type,image_path,rooms(room_type)))")
      .in("build_id", buildIds)
      .not("image_kind", "in", '("plan","selection")')
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .range(cur, cur + BATCH - 1);

    const batch = (data ?? []) as unknown as InspirationImageRow[];
    if (batch.length < BATCH) exhausted = true;
    cur += BATCH;
    fetched++;

    for (const img of batch) {
      const rawTags = img.image_selection_tags ?? [];
      const tags = parseInspoTags(rawTags);
      if (q) {
        const inTags = tags.some((t) =>
          [t.itemName, t.brand, t.colourName, t.productName, t.materialType, t.category, t.subcategory].some((f) => f?.toLowerCase().includes(q)),
        );
        const build = buildMap.get(img.build_id);
        if (!inTags && !build?.title.toLowerCase().includes(q) && !img.notes?.toLowerCase().includes(q)) continue;
      }
      if (categories.length > 0 && !tags.some((t) => t.category && categories.some((c) => t.category!.toLowerCase().includes(c.toLowerCase())))) continue;
      if (rooms.length > 0 && !tags.some((t) => t.roomType && rooms.includes(t.roomType))) continue;
      collected.push({ img, rawTags });
      if (collected.length >= limit) break;
    }
  }

  const page = collected.slice(0, limit);

  // Resolve selection thumbnail URLs (direct image_path + build_images.selection_id fallback)
  const selectionImagePathById = new Map<string, string | null>();
  for (const { rawTags } of page) {
    for (const t of rawTags) {
      if (!selectionImagePathById.has(t.selection_id)) {
        selectionImagePathById.set(t.selection_id, t.selections?.image_path ?? null);
      }
    }
  }
  const selectionIdsNeedingFallback = [...selectionImagePathById.entries()]
    .filter(([, p]) => !p).map(([id]) => id);
  const linkedImagePathBySelId = new Map<string, string>();
  if (selectionIdsNeedingFallback.length > 0) {
    const { data: linkedRows } = await supabase
      .from("build_images")
      .select("selection_id,storage_path")
      .in("selection_id", selectionIdsNeedingFallback)
      .not("storage_path", "is", null);
    for (const row of (linkedRows ?? []) as { selection_id: string | null; storage_path: string | null }[]) {
      if (row.selection_id && row.storage_path && !linkedImagePathBySelId.has(row.selection_id)) {
        linkedImagePathBySelId.set(row.selection_id, row.storage_path);
      }
    }
  }
  const selectionUrlPaths = [
    ...[...selectionImagePathById.values()].filter(Boolean) as string[],
    ...[...linkedImagePathBySelId.values()],
  ];
  const selectionSignedUrls = selectionUrlPaths.length > 0 ? await getSignedImageUrls(selectionUrlPaths) : new Map<string, string | null>();
  const selectionImageUrlById = new Map<string, string | null>();
  for (const [selId, imgPath] of selectionImagePathById) {
    const url = imgPath
      ? (selectionSignedUrls.get(imgPath) ?? null)
      : (() => { const fp = linkedImagePathBySelId.get(selId); return fp ? (selectionSignedUrls.get(fp) ?? null) : null; })();
    selectionImageUrlById.set(selId, url);
  }

  const paths = page.map((p) => p.img.storage_path).filter(Boolean) as string[];
  const signedUrls = await getSignedImageUrls(paths);

  const images: InspirationImage[] = page
    .map(({ img, rawTags }) => {
      const build = buildMap.get(img.build_id);
      if (!build) return null;
      const imageUrl = signedUrls.get(img.storage_path) ?? null;
      if (!imageUrl) return null;
      const tags = parseInspoTags(rawTags, selectionImageUrlById);
      return { id: img.id, imageUrl, buildId: img.build_id, buildTitle: build.title, buildSlug: build.slug, ownerUsername: profileMap.get(build.owner_id) ?? "user", designStyle: build.home_design_style, notes: img.notes, imageKind: img.image_kind, tags };
    })
    .filter(Boolean) as InspirationImage[];

  return { images, nextRawOffset: cur, hasMore: !exhausted };
}

export async function getInspirationFilterMeta(): Promise<{ rooms: string[]; styles: string[] }> {
  const supabase = createAdminClient();
  const [{ data: roomData }, { data: styleData }] = await Promise.all([
    supabase.from("rooms").select("room_type").not("room_type", "is", null),
    supabase.from("builds").select("home_design_style").eq("is_listed", true).not("home_design_style", "is", null),
  ]);
  const rooms = [...new Set((roomData ?? []).map((r: { room_type: string }) => r.room_type))].sort();
  const styles = [...new Set((styleData ?? []).map((b: { home_design_style: string }) => b.home_design_style))].sort();
  return { rooms, styles };
}

function normalizeMilestoneStatus(status: string | null | undefined, index: number): PublicMilestone["status"] {
  if (status === "complete" || status === "completed" || status === "done") return "complete";
  if (status === "active" || status === "in_progress" || status === "in-progress") return "active";
  if (status === "pending" || status === "not_started" || status === "not-started") return "pending";
  if (index === 0) return "active";
  return "pending";
}
