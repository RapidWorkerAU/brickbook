import { getCommentAuthorId } from "@/lib/comment-authors";

type CommentRecord = Record<string, unknown>;
export type SupabaseCommentsClient = {
  from: (table: "comments") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: CommentRecord | null; error: { message: string } | null }>;
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => PromiseLike<{ error: { message: string } | null }>;
    };
    delete: () => {
      eq: (column: string, value: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

export async function updateOwnComment(
  supabase: SupabaseCommentsClient,
  commentId: string,
  userId: string,
  content: string,
) {
  const existing = await getOwnComment(supabase, commentId, userId);
  if ("error" in existing) return existing;

  const { error } = await supabase.from("comments").update({ content }).eq("id", commentId);
  if (error) return { error: error.message, status: 400 };

  return { comment: existing.comment };
}

export async function deleteOwnComment(supabase: SupabaseCommentsClient, commentId: string, userId: string) {
  const existing = await getOwnComment(supabase, commentId, userId);
  if ("error" in existing) return existing;

  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: error.message, status: 400 };

  return { deleted: true };
}

async function getOwnComment(supabase: SupabaseCommentsClient, commentId: string, userId: string) {
  const { data, error } = await supabase.from("comments").select("*").eq("id", commentId).maybeSingle();
  if (error) return { error: error.message, status: 400 };
  if (!data) return { error: "Comment not found.", status: 404 };
  if (getCommentAuthorId(data) !== userId) return { error: "You can only edit your own comments.", status: 403 };

  return { comment: data };
}
