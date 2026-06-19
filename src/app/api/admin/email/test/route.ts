import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/email/registry";
import { renderTemplate } from "@/lib/email/templates";

const ADMIN_EMAIL = "ashleigh.s.phillips@hotmail.com";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { templateId, toEmail } = (body ?? {}) as { templateId?: string; toEmail?: string };

  if (!templateId || !toEmail) {
    return NextResponse.json({ error: "templateId and toEmail are required." }, { status: 400 });
  }

  if (!EMAIL_TEMPLATES.find((t) => t.id === templateId)) {
    return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !from) {
    return NextResponse.json({ error: "Resend is not configured." }, { status: 500 });
  }

  const { subject, html } = renderTemplate(templateId as EmailTemplateId);
  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({ from, to: toEmail, subject: `[TEST] ${subject}`, html });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: `Test email sent to ${toEmail}.` });
}
