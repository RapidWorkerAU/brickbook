import { emailBase, el } from "./base";
import type { EmailTemplateId } from "./registry";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brickbook.com.au";

function renderConfirmEmail(data: Record<string, unknown>) {
  const newEmail = (data.newEmail as string | undefined) ?? "new@example.com";
  const confirmUrl = (data.confirmUrl as string | undefined) ?? `${SITE_URL}/auth/callback`;
  return {
    subject: "Confirm your new email address",
    html: emailBase(
      el.h1("Confirm your new email") +
        el.sub("You requested to change your Brickbook email address.") +
        el.p(
          `We received a request to update your email to <strong style="color:#1c1917;">${newEmail}</strong>. Click below to confirm this change.`,
        ) +
        el.btn("Confirm new email", confirmUrl) +
        el.divider() +
        el.muted(
          "If you didn't request this change, you can safely ignore this email — your current address will remain unchanged.",
        ),
    ),
  };
}

function renderConfirmSignup(data: Record<string, unknown>) {
  const confirmUrl = (data.confirmUrl as string | undefined) ?? `${SITE_URL}/auth/callback`;
  return {
    subject: "Confirm your Brickbook account",
    html: emailBase(
      el.h1("Almost there") +
        el.sub("Confirm your email address to activate your account.") +
        el.p(
          "Thanks for signing up to Brickbook. Click the button below to confirm your email address and get started documenting your build.",
        ) +
        el.btn("Confirm email address", confirmUrl) +
        el.divider() +
        el.muted(
          "This link expires in 24 hours. If you didn't create a Brickbook account, you can safely ignore this email.",
        ),
    ),
  };
}

function renderWelcome(data: Record<string, unknown>) {
  const displayName = (data.displayName as string | undefined) ?? "there";
  return {
    subject: "Welcome to Brickbook",
    html: emailBase(
      el.h1(`Welcome, ${displayName}`) +
        el.sub("Your account is confirmed and ready to go.") +
        el.p(
          "Brickbook is your place to document every step of your home build — milestones, updates, photos, and all the little decisions that go into making a house a home.",
        ) +
        el.divider() +
        el.sectionLabel("Get started") +
        el.list([
          "Create your first build and add the basics — suburb, builder, and lot size",
          "Log your first milestone to mark where you're at in the journey",
          "Add photos and selections to start building your project diary",
          "Share your build link with family and friends",
        ]) +
        el.btn("Create your first build", `${SITE_URL}/dashboard/builds/new`),
    ),
  };
}

function renderForgotPassword(data: Record<string, unknown>) {
  const resetUrl = (data.resetUrl as string | undefined) ?? `${SITE_URL}/reset-password`;
  return {
    subject: "Reset your Brickbook password",
    html: emailBase(
      el.h1("Reset your password") +
        el.sub("We received a request to reset the password on your Brickbook account.") +
        el.p("Click the button below to choose a new password. This link is valid for 1 hour.") +
        el.btn("Reset password", resetUrl) +
        el.divider() +
        el.muted(
          "If you didn't request a password reset, you can safely ignore this email — your password will not be changed.",
        ),
    ),
  };
}

function renderPasswordChanged(_data: Record<string, unknown>) {
  return {
    subject: "Your Brickbook password has been changed",
    html: emailBase(
      el.h1("Password changed") +
        el.sub("Your password was successfully updated.") +
        el.p(
          "This is a confirmation that the password on your Brickbook account has been changed. If you made this change, no further action is needed.",
        ) +
        el.divider() +
        el.muted(
          "If you didn't change your password, please reset it immediately or contact us at support@brickbook.com.au.",
        ),
    ),
  };
}

function renderNewComment(data: Record<string, unknown>) {
  const commenterName = (data.commenterName as string | undefined) ?? "Someone";
  const buildTitle = (data.buildTitle as string | undefined) ?? "your build";
  const commentText = (data.commentText as string | undefined) ?? "Great progress on the frame stage!";
  const buildUrl = (data.buildUrl as string | undefined) ?? `${SITE_URL}/dashboard`;

  return {
    subject: `New comment on ${buildTitle}`,
    html: emailBase(
      el.h1("New comment") +
        el.sub(`${commenterName} commented on ${buildTitle}.`) +
        `<blockquote style="margin:0 0 24px;padding:14px 18px;background:#f9f8f7;border-left:3px solid #e7e5e4;border-radius:0 6px 6px 0;">` +
        `<p style="margin:0;font-size:14px;color:#44403c;line-height:1.65;font-style:italic;">"${commentText}"</p>` +
        `</blockquote>` +
        el.btn("View comment", buildUrl),
    ),
  };
}

function renderNewFollower(data: Record<string, unknown>) {
  const followerName = (data.followerName as string | undefined) ?? "Someone";
  const followerUsername = (data.followerUsername as string | undefined) ?? "user";
  const buildTitle = (data.buildTitle as string | undefined) ?? "your build";
  const buildUrl = (data.buildUrl as string | undefined) ?? `${SITE_URL}/dashboard`;

  return {
    subject: `${followerName} is now following ${buildTitle}`,
    html: emailBase(
      el.h1("New follower") +
        el.sub(`${followerName} (@${followerUsername}) started following ${buildTitle}.`) +
        el.p("They'll be notified when you post new updates, milestones, and photos.") +
        el.btn("View your build", buildUrl),
    ),
  };
}

function renderBuildPublished(data: Record<string, unknown>) {
  const buildTitle = (data.buildTitle as string | undefined) ?? "Your build";
  const buildUrl = (data.buildUrl as string | undefined) ?? `${SITE_URL}/dashboard`;

  return {
    subject: `${buildTitle} is now live on Brickbook`,
    html: emailBase(
      el.h1("Your build is live") +
        el.sub(`${buildTitle} is now publicly listed on Brickbook.`) +
        el.p(
          "Others can now discover, follow, and draw inspiration from your build. Share the link below with family and friends.",
        ) +
        el.btn("View your build", buildUrl) +
        el.divider() +
        el.muted("You can change your build visibility at any time from your build settings."),
    ),
  };
}

function renderAccountDeleted(data: Record<string, unknown>) {
  const displayName = (data.displayName as string | undefined) ?? "there";

  return {
    subject: "Your Brickbook account has been deleted",
    html: emailBase(
      el.h1("Account deleted") +
        el.sub(`Goodbye, ${displayName}.`) +
        el.p(
          "Your Brickbook account and all associated data has been permanently deleted as requested. This action cannot be undone.",
        ) +
        el.p("We're sorry to see you go. If you have any feedback or if this was a mistake, please reach out to us at support@brickbook.com.au.") +
        el.divider() +
        el.muted("This email was sent as confirmation of your account deletion request."),
    ),
  };
}

function renderDataExportReady(data: Record<string, unknown>) {
  const exportUrl = (data.exportUrl as string | undefined) ?? "#";

  return {
    subject: "Your Brickbook data export is ready",
    html: emailBase(
      el.h1("Your export is ready") +
        el.sub("Your data has been packaged and is ready to download.") +
        el.p(
          "Your Brickbook export includes your builds, milestones, updates, images, comments, selections, and account profile in JSON format.",
        ) +
        el.btn("Download export", exportUrl) +
        el.divider() +
        el.muted("This link expires in 24 hours. If you need a new export after that, you can request one from your account settings."),
    ),
  };
}

function renderWeeklyDigest(data: Record<string, unknown>) {
  const displayName = (data.displayName as string | undefined) ?? "there";
  const username = (data.username as string | undefined) ?? "your-build";
  const stats = (data.stats as { newFollowers: number; newComments: number; newLikes: number; newSaves: number } | undefined) ?? {
    newFollowers: 3,
    newComments: 7,
    newLikes: 14,
    newSaves: 2,
  };
  const hasActivity = Object.values(stats).some((v) => v > 0);

  return {
    subject: "Your Brickbook week in review",
    html: emailBase(
      el.h1(`Your week, ${displayName}`) +
        el.sub("Here's what happened across your builds this week.") +
        (hasActivity
          ? el.stats([
              ["New followers", stats.newFollowers],
              ["Comments on your builds", stats.newComments],
              ["Likes on your updates", stats.newLikes],
              ["Saves to inspiration lists", stats.newSaves],
            ])
          : el.p("No new activity this week — keep sharing your build to grow your audience.")) +
        el.divider() +
        el.btn("View your build", `${SITE_URL}/${username}`),
    ),
  };
}

function renderDailySignupReport(data: Record<string, unknown>) {
  const date =
    (data.date as string | undefined) ??
    new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const count = (data.count as number | undefined) ?? 3;
  const emails = (data.emails as string[] | undefined) ?? [
    "jane@example.com",
    "tom@example.com",
    "alex@example.com",
  ];

  return {
    subject: `New Brickbook signups · ${date}`,
    html: emailBase(
      el.h1(`${count} new signup${count === 1 ? "" : "s"} today`) +
        el.sub(date) +
        el.list(emails) +
        el.divider() +
        el.muted("This is an automated daily report sent only on days with new signups."),
    ),
  };
}

function renderWeeklySiteSummary(data: Record<string, unknown>) {
  const weekOf =
    (data.weekOf as string | undefined) ??
    new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const newUsers = (data.newUsers as number | undefined) ?? 12;
  const totalLikes = (data.totalLikes as number | undefined) ?? 84;
  const totalFollows = (data.totalFollows as number | undefined) ?? 31;
  const totalComments = (data.totalComments as number | undefined) ?? 47;
  const activeBuilds = (data.activeBuilds as number | undefined) ?? 28;

  return {
    subject: `Brickbook weekly summary · week of ${weekOf}`,
    html: emailBase(
      el.h1("Weekly summary") +
        el.sub(`Platform activity for the week ending ${weekOf}.`) +
        el.sectionLabel("Growth") +
        el.stats([
          ["New users", newUsers],
          ["Active builds", activeBuilds],
        ]) +
        el.sectionLabel("Engagement") +
        el.stats([
          ["Total likes", totalLikes],
          ["Build follows", totalFollows],
          ["Comments", totalComments],
        ]) +
        el.divider() +
        el.muted("This is an automated weekly summary sent every Monday."),
    ),
  };
}

const MOCK_DATA: Record<EmailTemplateId, Record<string, unknown>> = {
  "confirm-email": { newEmail: "new@example.com", confirmUrl: "#" },
  "confirm-signup": { confirmUrl: "#" },
  welcome: { displayName: "Sarah" },
  "forgot-password": { resetUrl: "#" },
  "password-changed": {},
  "new-comment": {
    commenterName: "Tom",
    buildTitle: "Our Metricon Journey",
    commentText: "Great progress on the frame stage! The double storey is looking amazing.",
    buildUrl: "#",
  },
  "new-follower": {
    followerName: "Jane",
    followerUsername: "jane_builds",
    buildTitle: "Our Metricon Journey",
    buildUrl: "#",
  },
  "build-published": {
    buildTitle: "Our Metricon Journey",
    buildUrl: "#",
  },
  "account-deleted": { displayName: "Sarah" },
  "data-export-ready": { exportUrl: "#" },
  "weekly-digest": {
    displayName: "Sarah",
    username: "sarah-builds-23",
    stats: { newFollowers: 3, newComments: 7, newLikes: 14, newSaves: 2 },
  },
  "daily-signup-report": {
    date: "19 June 2026",
    count: 3,
    emails: ["jane@example.com", "tom@example.com", "alex@example.com"],
  },
  "weekly-site-summary": {
    weekOf: "19 June 2026",
    newUsers: 12,
    totalLikes: 84,
    totalFollows: 31,
    totalComments: 47,
    activeBuilds: 28,
  },
};

export function renderTemplate(
  id: EmailTemplateId,
  overrides?: Record<string, unknown>,
): { subject: string; html: string } {
  const data = { ...MOCK_DATA[id], ...overrides };
  switch (id) {
    case "confirm-email":        return renderConfirmEmail(data);
    case "confirm-signup":       return renderConfirmSignup(data);
    case "welcome":              return renderWelcome(data);
    case "forgot-password":      return renderForgotPassword(data);
    case "password-changed":     return renderPasswordChanged(data);
    case "new-comment":          return renderNewComment(data);
    case "new-follower":         return renderNewFollower(data);
    case "build-published":      return renderBuildPublished(data);
    case "account-deleted":      return renderAccountDeleted(data);
    case "data-export-ready":    return renderDataExportReady(data);
    case "weekly-digest":        return renderWeeklyDigest(data);
    case "daily-signup-report":  return renderDailySignupReport(data);
    case "weekly-site-summary":  return renderWeeklySiteSummary(data);
  }
}
