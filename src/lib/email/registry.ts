export type EmailTemplateId =
  | "confirm-email"
  | "confirm-signup"
  | "welcome"
  | "forgot-password"
  | "password-changed"
  | "new-comment"
  | "new-follower"
  | "build-published"
  | "account-deleted"
  | "data-export-ready"
  | "weekly-digest"
  | "daily-signup-report"
  | "weekly-site-summary";

export type EmailTemplateMeta = {
  id: EmailTemplateId;
  name: string;
  description: string;
  recipient: "user" | "admin";
  trigger: string;
  supabaseManaged?: boolean;
};

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    id: "confirm-email",
    name: "Confirm Email Change",
    description: "Sent when a user requests to change their email address.",
    recipient: "user",
    trigger: "Email address update",
    supabaseManaged: true,
  },
  {
    id: "confirm-signup",
    name: "Confirm Signup",
    description: "Sent to verify a new user's email address on registration.",
    recipient: "user",
    trigger: "New account registration",
    supabaseManaged: true,
  },
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Sent after account confirmation with a quick-start guide and CTA to create their first build.",
    recipient: "user",
    trigger: "Account verified",
  },
  {
    id: "forgot-password",
    name: "Forgot Password",
    description: "Sent when a user requests a password reset link.",
    recipient: "user",
    trigger: "Password reset request",
    supabaseManaged: true,
  },
  {
    id: "password-changed",
    name: "Password Changed",
    description: "Security confirmation sent after a password has been successfully reset.",
    recipient: "user",
    trigger: "Successful password reset",
  },
  {
    id: "new-comment",
    name: "New Comment",
    description: "Sent when someone comments on or replies to a user's build or update.",
    recipient: "user",
    trigger: "Comment or reply posted",
  },
  {
    id: "new-follower",
    name: "New Follower",
    description: "Sent when someone starts following a user's build.",
    recipient: "user",
    trigger: "Build followed",
  },
  {
    id: "build-published",
    name: "Build Published",
    description: "Confirmation sent when a user first lists their build publicly.",
    recipient: "user",
    trigger: "Build set to listed",
  },
  {
    id: "account-deleted",
    name: "Account Deleted",
    description: "Sent before account deletion completes, confirming the action and providing a reference.",
    recipient: "user",
    trigger: "Account deletion requested",
  },
  {
    id: "data-export-ready",
    name: "Data Export Ready",
    description: "Sent when a requested data export is ready, with a 24-hour download link.",
    recipient: "user",
    trigger: "Data export completed",
  },
  {
    id: "weekly-digest",
    name: "Weekly Activity Digest",
    description: "Weekly summary of a user's build activity — followers, comments, likes, and saves to inspiration lists.",
    recipient: "user",
    trigger: "Weekly cron · user opt-in",
  },
  {
    id: "daily-signup-report",
    name: "Daily Signup Report",
    description: "Lists new user signups for the day. Only sent when at least one signup occurred.",
    recipient: "admin",
    trigger: "Daily cron · only if new signups",
  },
  {
    id: "weekly-site-summary",
    name: "Weekly Site Summary",
    description: "Platform-wide activity overview — likes, follows, comments, and new users across all builds.",
    recipient: "admin",
    trigger: "Weekly cron · Mondays",
  },
];
