const AUTHOR_COLUMNS = ["profile_id", "author_id", "created_by", "owner_id", "user_id"] as const;

export type CommentAuthorColumn = (typeof AUTHOR_COLUMNS)[number];

export function getCommentAuthorId(comment: Record<string, unknown>) {
  for (const column of AUTHOR_COLUMNS) {
    const value = comment[column];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

export async function insertCommentWithAuthor<T>(
  insert: (authorColumn: CommentAuthorColumn) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
) {
  let lastError: { message: string } | null = null;

  for (const column of AUTHOR_COLUMNS) {
    const result = await insert(column);
    if (!result.error) return result;
    lastError = result.error;
    if (!isMissingColumnError(result.error.message, column)) return result;
  }

  return { data: null, error: lastError };
}

function isMissingColumnError(message: string, column: string) {
  return message.includes(`'${column}' column`) || message.includes(`column ${column}`) || message.includes(`Could not find the '${column}'`);
}
