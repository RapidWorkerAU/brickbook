import { NextResponse } from "next/server";
import { Resend } from "resend";
import { collectAccountExport } from "@/lib/account-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const exportData = await collectAccountExport(user.id);
  const path = `${user.id}/export-${Date.now()}.json`;
  const { error: uploadError } = await admin.storage.from("exports").upload(path, JSON.stringify(exportData, null, 2), {
    contentType: "application/json",
    upsert: false,
  });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { data: signed, error: signedError } = await admin.storage.from("exports").createSignedUrl(path, 86_400);
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: signedError?.message ?? "Unable to create export link." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (resendKey && from && user.email) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from,
      to: user.email,
      subject: "Your Brickbook data export",
      text: `Your Brickbook data export is ready. This link expires in 24 hours:\n\n${signed.signedUrl}`,
    });
  }

  return NextResponse.json({
    message: user.email && resendKey && from ? "Export requested. Check your email for the download link." : "Export created. Email is not configured, so contact support for the signed link.",
  });
}
