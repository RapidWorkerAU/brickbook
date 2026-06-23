import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "brickbook-build-images";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.buildId || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "buildId and files are required." }, { status: 400 });
  }

  const { buildId, files, planType } = body as {
    buildId: string;
    files: { name: string; type: string }[];
    planType?: string;
  };

  // Verify the user owns this build
  const { data: build } = await supabase.from("builds").select("id").eq("id", buildId).eq("owner_id", user.id).maybeSingle();
  if (!build) return NextResponse.json({ error: "Build not found." }, { status: 404 });

  const admin = createAdminClient();
  const subfolder = planType ? `plans/${planType}` : "library";

  const uploads = await Promise.all(
    files.slice(0, 20).map(async (file) => {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      const relativePath = `${user.id}/${buildId}/${subfolder}/${crypto.randomUUID()}${ext}`;
      const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(relativePath);
      if (error || !data) return null;
      return {
        signedUrl: data.signedUrl,
        path: `${BUCKET}/${relativePath}`,
      };
    }),
  );

  if (uploads.some((u) => u === null)) {
    return NextResponse.json({ error: "Failed to generate upload URLs." }, { status: 500 });
  }

  return NextResponse.json({ uploads });
}
