import { NextResponse } from "next/server";
import slugify from "slugify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCommentAuthorId, insertCommentWithAuthor } from "@/lib/comment-authors";
import { deleteOwnComment, updateOwnComment, type SupabaseCommentsClient } from "@/lib/comment-mutations";
import { getSignedImageUrl } from "@/lib/storage";
import { sendEmail } from "@/lib/email/send";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brickbook.com.au";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const buildId = getString(formData, "build_id");
  const content = getString(formData, "content");
  const parentCommentId = getString(formData, "parent_comment_id");
  const file = formData.get("comment_image_file");

  if (!buildId || !content) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (parentCommentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id")
      .eq("id", parentCommentId)
      .eq("build_id", buildId)
      .is("update_id", null)
      .is("image_id", null)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found." }, { status: 400 });
    }
  }

  const mentionMatches = Array.from(content.matchAll(/@([a-zA-Z0-9_.-]{2,30})/g));
  const mentions = Array.from(new Set(mentionMatches.map((match) => match[1].toLowerCase())));

  let imagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: "Comment image must be under 10MB." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Attachment must be an image file." }, { status: 400 });
    }

    const admin = createAdminClient();
    const safeName = slugify(file.name.replace(/\.[^/.]+$/, ""), { lower: true, strict: true }) || "comment";
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const path = `${user.id}/${buildId}/comments/${Date.now()}-${safeName}${ext}`;
    const bucket = "brickbook-build-images";

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }
    imagePath = `${bucket}/${path}`;
  }

  const { data: inserted, error } = await insertCommentWithAuthor<Record<string, unknown>>((authorColumn) =>
    supabase
      .from("comments")
      .insert({
        build_id: buildId,
        update_id: null,
        image_id: null,
        [authorColumn]: user.id,
        content,
        parent_comment_id: parentCommentId || null,
        image_path: imagePath,
        mentions,
      })
      .select("*")
      .single(),
  );

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Failed to add comment." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  const insertedImagePath = typeof inserted.image_path === "string" ? inserted.image_path : null;
  const imageUrl = insertedImagePath ? await getSignedImageUrl(insertedImagePath).catch(() => null) : null;

  // Send new-comment notification to the build owner (fire-and-forget)
  void (async () => {
    try {
      const { data: build } = await supabase
        .from("builds")
        .select("owner_id, title")
        .eq("id", buildId)
        .maybeSingle();
      if (!build || build.owner_id === user.id) return;

      const { data: pref } = await supabase
        .from("notification_preferences")
        .select("new_comment")
        .eq("user_id", build.owner_id)
        .maybeSingle();
      if (pref && pref.new_comment === false) return;

      const admin = createAdminClient();
      const { data: ownerAuth } = await admin.auth.admin.getUserById(build.owner_id);
      const ownerEmail = ownerAuth?.user?.email;
      if (!ownerEmail) return;

      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", build.owner_id)
        .maybeSingle();

      await sendEmail(ownerEmail, "new-comment", {
        commenterName: profile?.username ?? "Someone",
        buildTitle: build.title ?? "your build",
        commentText: content.slice(0, 200),
        buildUrl: `${SITE_URL}/${ownerProfile?.username ?? ""}`,
      });
    } catch {}
  })();

  return NextResponse.json({
    comment: {
      id: inserted.id,
      userId: getCommentAuthorId(inserted) ?? user.id,
      username: profile?.username ?? "user",
      content: typeof inserted.content === "string" ? inserted.content : content,
      createdAt: typeof inserted.created_at === "string" ? inserted.created_at : null,
      parentCommentId: typeof inserted.parent_comment_id === "string" ? inserted.parent_comment_id : null,
      imageUrl,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get("buildId")?.trim() ?? "";
  const offset = Number(searchParams.get("offset") ?? "0");
  const limitRaw = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 20;

  if (!buildId) {
    return NextResponse.json({ error: "Missing buildId." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("build_id", buildId)
    .is("update_id", null)
    .is("image_id", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const comments = data ?? [];
  const userIds = Array.from(new Set(comments.map((comment) => getCommentAuthorId(comment)).filter(Boolean) as string[]));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,username").in("id", userIds)
    : { data: [] };
  const usernameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));

  const normalized = await Promise.all(
    comments.map(async (comment) => {
      const imageUrl = comment.image_path ? await getSignedImageUrl(comment.image_path).catch(() => null) : null;
      return {
        id: comment.id,
        userId: getCommentAuthorId(comment),
        username: usernameById.get(getCommentAuthorId(comment) ?? "") ?? "user",
        content: comment.content,
        createdAt: comment.created_at,
        parentCommentId: comment.parent_comment_id,
        imageUrl,
      };
    }),
  );

  return NextResponse.json({ comments: normalized });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const commentId = typeof payload?.comment_id === "string" ? payload.comment_id.trim() : "";
  const content = typeof payload?.content === "string" ? payload.content.trim() : "";

  if (!commentId || !content) {
    return NextResponse.json({ error: "Comment and content are required." }, { status: 400 });
  }

  const commentsClient = supabase as unknown as SupabaseCommentsClient;
  const result = await updateOwnComment(commentsClient, commentId, user.id, content);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ comment: { id: commentId, content } });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("commentId")?.trim() ?? "";
  if (!commentId) return NextResponse.json({ error: "Missing commentId." }, { status: 400 });

  const commentsClient = supabase as unknown as SupabaseCommentsClient;
  const result = await deleteOwnComment(commentsClient, commentId, user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ deleted: true });
}
