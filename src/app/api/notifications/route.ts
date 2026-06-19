import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const readAt = new Date().toISOString();
  const query = supabase.from("notifications").update({ is_read: true, read_at: readAt });
  const { error } = id ? await query.eq("id", id).eq("recipient_id", user.id) : await query.eq("recipient_id", user.id);

  if (!error) return NextResponse.json({ ok: true });

  const fallbackQuery = supabase.from("notifications").update({ is_read: true });
  const { error: fallbackError } = id ? await fallbackQuery.eq("id", id).eq("recipient_id", user.id) : await fallbackQuery.eq("recipient_id", user.id);
  if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
