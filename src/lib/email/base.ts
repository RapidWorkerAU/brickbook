const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brickbook.com.au";
const YEAR = new Date().getFullYear();

export function emailBase(content: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f4;width:100%;">
  <tr><td align="center" style="padding:48px 16px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <a href="${SITE_URL}" style="text-decoration:none;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#1c1917;letter-spacing:-0.3px;">Brickbook</span>
          </a>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td style="padding:40px 44px 36px;">${content}</td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:24px 0 8px;">
          <p style="margin:0 0 4px;font-size:12px;color:#a8a29e;">© ${YEAR} Brickbook &nbsp;·&nbsp; <a href="${SITE_URL}" style="color:#a8a29e;text-decoration:none;">brickbook.com.au</a></p>
          <p style="margin:0;font-size:11px;color:#c4c0bc;">You received this because you have a Brickbook account.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export const el = {
  h1: (t: string) =>
    `<h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#1c1917;line-height:1.2;letter-spacing:-0.4px;">${t}</h1>`,

  sub: (t: string) =>
    `<p style="margin:0 0 28px;font-size:14px;color:#78716c;line-height:1.55;">${t}</p>`,

  p: (t: string) =>
    `<p style="margin:0 0 16px;font-size:14px;color:#44403c;line-height:1.7;">${t}</p>`,

  muted: (t: string) =>
    `<p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.65;">${t}</p>`,

  sectionLabel: (t: string) =>
    `<p style="margin:20px 0 8px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a8a29e;">${t}</p>`,

  divider: () =>
    `<hr style="border:none;border-top:1px solid #f0efee;margin:24px 0;">`,

  btn: (text: string, url: string) =>
    `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 0;">` +
    `<tr><td style="background:#b45309;border-radius:8px;">` +
    `<a href="${url}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">${text}</a>` +
    `</td></tr></table>`,

  stats: (rows: [string, string | number][]) =>
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:4px 0 20px;">` +
    rows
      .map(
        ([label, val]) =>
          `<tr>` +
          `<td style="padding:11px 0;border-bottom:1px solid #f5f5f4;font-size:13px;color:#78716c;">${label}</td>` +
          `<td style="padding:11px 0;border-bottom:1px solid #f5f5f4;font-size:14px;font-weight:600;color:#1c1917;text-align:right;">${val}</td>` +
          `</tr>`,
      )
      .join("") +
    `</table>`,

  list: (items: string[]) =>
    `<ul style="margin:0 0 20px;padding-left:20px;">` +
    items
      .map(
        (item) =>
          `<li style="font-size:14px;color:#44403c;line-height:1.7;margin-bottom:4px;">${item}</li>`,
      )
      .join("") +
    `</ul>`,
};
