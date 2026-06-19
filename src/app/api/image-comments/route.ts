import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCommentAuthorId, insertCommentWithAuthor } from "@/lib/comment-authors";
import { deleteOwnComment, updateOwnComment, type SupabaseCommentsClient } from "@/lib/comment-mutations";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get("imageId")?.trim() ?? "";
  const offset = Number(searchParams.get("offset") ?? "0");
  const limitRaw = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 20;

  if (!imageId) {
    return NextResponse.json({ error: "Missing imageId." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("image_id", imageId)
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

  const normalized = comments.map((comment) => ({
    id: comment.id,
    imageId: comment.image_id,
    userId: getCommentAuthorId(comment),
    username: usernameById.get(getCommentAuthorId(comment) ?? "") ?? "user",
    content: comment.content,
    createdAt: comment.created_at,
    parentCommentId: comment.parent_comment_id,
  }));

  return NextResponse.json({ comments: normalized });
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
  const imageId = getString(formData, "image_id");
  const content = getString(formData, "content");
  const parentCommentId = getString(formData, "parent_comment_id");
  if (!imageId || !content) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { data: image } = await supabase
    .from("build_images")
    .select("build_id")
    .eq("id", imageId)
    .maybeSingle();

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  if (parentCommentId) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id")
      .eq("id", parentCommentId)
      .eq("image_id", imageId)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ error: "Parent comment not found." }, { status: 400 });
    }
  }

  const { data: inserted, error } = await insertCommentWithAuthor<Record<string, unknown>>((authorColumn) =>
    supabase
      .from("comments")
      .insert({
        build_id: image.build_id,
        image_id: imageId,
        update_id: null,
        [authorColumn]: user.id,
        content,
        parent_comment_id: parentCommentId || null,
      })
      .select("*")
      .single(),
  );

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Failed to add comment." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  const { count } = await supabase
    .from("comments")
    .select("*", { head: true, count: "exact" })
    .eq("image_id", imageId);

  return NextResponse.json({
    comment: {
      id: inserted.id,
      imageId: typeof inserted.image_id === "string" ? inserted.image_id : imageId,
      userId: getCommentAuthorId(inserted) ?? user.id,
      username: profile?.username ?? "user",
      content: typeof inserted.content === "string" ? inserted.content : content,
      createdAt: typeof inserted.created_at === "string" ? inserted.created_at : null,
      parentCommentId: typeof inserted.parent_comment_id === "string" ? inserted.parent_comment_id : null,
    },
    commentCount: count ?? 0,
  });
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
