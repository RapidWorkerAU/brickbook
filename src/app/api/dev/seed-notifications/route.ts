import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// TEMPORARY — delete this file once you've previewed the notification UI
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: build } = await supabase
    .from("builds")
    .select("id,title")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!build) return NextResponse.json({ error: "No builds found — create a build first." }, { status: 400 });

  const admin = createAdminClient();

  // Delete any existing seed notifications so re-running stays clean
  await admin
    .from("notifications")
    .delete()
    .eq("recipient_id", user.id)
    .eq("actor_id", user.id);

  const seeds = [
    { type: "new_comment",  is_read: false },
    { type: "new_reply",    is_read: false },
    { type: "new_like",     is_read: false },
    { type: "new_follower", is_read: true  },
    { type: "mention",      is_read: true  },
  ];

  const rows = seeds.map((seed, i) => ({
    recipient_id: user.id,
    actor_id:     user.id,
    build_id:     build.id,
    type:         seed.type,
    is_read:      seed.is_read,
    created_at:   new Date(Date.now() - i * 3600_000).toISOString(), // stagger by 1h each
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: rows.length, build: build.title });
}
