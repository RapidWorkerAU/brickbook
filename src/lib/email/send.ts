import { Resend } from "resend";
import { renderTemplate } from "./templates";
import type { EmailTemplateId } from "./registry";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail(
  to: string,
  templateId: EmailTemplateId,
  data?: Record<string, unknown>,
): Promise<void> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) return;
  const { subject, html } = renderTemplate(templateId, data);
  await resend.emails.send({ from, to, subject, html });
}
