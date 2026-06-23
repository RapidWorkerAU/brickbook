"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { LoadingButton } from "@/components/action-buttons";
import { createClient } from "@/lib/supabase/client";
import {
  IconAlertTriangle,
  IconBan,
  IconBell,
  IconCamera,
  IconCheck,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconLock,
  IconLogout,
  IconMail,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import type { AccountProfile } from "@/app/dashboard/account/page";
import { EMAIL_TEMPLATES } from "@/lib/email/registry";
import type { EmailTemplateMeta } from "@/lib/email/registry";

type Section = "profile" | "email" | "password" | "notifications" | "blocked" | "download" | "danger" | "admin-emails";

const ADMIN_EMAIL = "ashleigh.s.phillips@hotmail.com";

const ADMIN_NAV_ITEMS: { section: Section; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { section: "admin-emails", label: "Admin Emails", icon: IconMail },
];
type SaveState = "idle" | "saving" | "saved";

type NotificationPrefs = {
  new_follower: boolean;
  new_comment: boolean;
  new_reply: boolean;
  new_like: boolean;
  mention: boolean;
  email_digest: boolean;
};

type BlockedUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  blocked_at: string;
};

const DEFAULT_PREFS: NotificationPrefs = {
  new_follower: true,
  new_comment: true,
  new_reply: true,
  new_like: false,
  mention: true,
  email_digest: false,
};

const NAV_ITEMS: { section: Section; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { section: "profile", label: "Profile", icon: IconUser },
  { section: "email", label: "Email", icon: IconMail },
  { section: "password", label: "Password", icon: IconLock },
  { section: "notifications", label: "Notifications", icon: IconBell },
  { section: "blocked", label: "Blocked users", icon: IconBan },
  { section: "download", label: "Download data", icon: IconDownload },
  { section: "danger", label: "Danger zone", icon: IconAlertTriangle },
];

function initials(name: string) {
  return name.charAt(0).toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function getAvatarUrl(path: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const cleanPath = path.replace(/^brickbook-avatars\//, "");
  return createClient().storage.from("brickbook-avatars").getPublicUrl(cleanPath).data.publicUrl;
}

function normalizeProfile(profile: Partial<AccountProfile>) {
  return {
    username: profile.username ?? "",
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    website: profile.website ?? "",
    avatar_path: profile.avatar_path ?? null,
  };
}

export function AccountClient({ profile: initialProfile, email: initialEmail }: { profile: AccountProfile; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<Section>("profile");
  const [userId] = useState(initialProfile.id);
  const [profile, setProfile] = useState(normalizeProfile(initialProfile));
  const [avatarPreview, setAvatarPreview] = useState(getAvatarUrl(initialProfile.avatar_path));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<"data" | "account" | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const [{ data: prefData }, { data: blockedData }] = await Promise.all([
        supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("blocked_users")
          .select("blocked_id,created_at,blocked:profiles!blocked_id(username,display_name,avatar_path)")
          .eq("blocker_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (prefData) {
        setPrefs({
          new_follower: Boolean(prefData.new_follower),
          new_comment: Boolean(prefData.new_comment),
          new_reply: Boolean(prefData.new_reply),
          new_like: Boolean(prefData.new_like),
          mention: Boolean(prefData.mention),
          email_digest: Boolean(prefData.email_digest),
        });
      }

      setBlocked(
        ((blockedData ?? []) as unknown as Array<{
          blocked_id: string;
          created_at: string;
          blocked:
            | { username: string; display_name: string | null; avatar_path: string | null }
            | Array<{ username: string; display_name: string | null; avatar_path: string | null }>
            | null;
        }>).map((row) => ({
          id: row.blocked_id,
          username: (Array.isArray(row.blocked) ? row.blocked[0] : row.blocked)?.username ?? "user",
          display_name: (Array.isArray(row.blocked) ? row.blocked[0] : row.blocked)?.display_name ?? null,
          avatar_path: (Array.isArray(row.blocked) ? row.blocked[0] : row.blocked)?.avatar_path ?? null,
          blocked_at: row.created_at,
        })),
      );
    }

    void loadSettings();
  }, [supabase, userId]);

  const flashSaved = (text: string) => {
    setMessage(text);
    setSaveState("saved");
    window.setTimeout(() => {
      setMessage("");
      setSaveState("idle");
    }, 3000);
  };

  const saveProfile = async () => {
    setError("");
    setMessage("");
    if (!profile.username.trim()) {
      setError("Username is required.");
      return;
    }
    setSaveState("saving");
    const formData = new FormData();
    formData.set("username", profile.username ?? "");
    formData.set("display_name", profile.display_name ?? "");
    formData.set("bio", profile.bio ?? "");
    formData.set("location", profile.location ?? "");
    formData.set("website", profile.website ?? "");
    if (avatarFile) formData.set("avatar", avatarFile);

    const response = await fetch("/api/account/profile", { method: "PATCH", body: formData });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setSaveState("idle");
      setError(payload?.error ?? "Unable to save profile.");
      return;
    }

    setProfile((current) => ({ ...current, ...normalizeProfile(payload.profile ?? {}) }));
    if (payload.profile?.avatar_path) setAvatarPreview(getAvatarUrl(payload.profile.avatar_path));
    setAvatarFile(null);
    flashSaved("Profile saved.");
  };

  const saveEmail = async () => {
    setError("");
    setMessage("");
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSaveState("saving");
    const { error: updateError } = await supabase.auth.updateUser({ email });
    if (updateError) {
      setSaveState("idle");
      setError(updateError.message);
      return;
    }
    flashSaved(`A confirmation link has been sent to ${email}.`);
  };

  const savePassword = async () => {
    setError("");
    setMessage("");
    if (!passwordForm.current) {
      setError("Current password is required.");
      return;
    }
    if (passwordForm.next.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaveState("saving");
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: initialEmail, password: passwordForm.current });
    if (reauthError) {
      setSaveState("idle");
      setError("Current password is incorrect.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.next });
    if (updateError) {
      setSaveState("idle");
      setError(updateError.message);
      return;
    }
    setPasswordForm({ current: "", next: "", confirm: "" });
    flashSaved("Password updated.");
  };

  const savePrefs = async () => {
    setError("");
    setMessage("");
    setSaveState("saving");
    const { error: prefError } = await supabase.from("notification_preferences").upsert({
      user_id: userId,
      ...prefs,
      updated_at: new Date().toISOString(),
    });
    if (prefError) {
      setSaveState("idle");
      setError(prefError.message);
      return;
    }
    flashSaved("Notification preferences saved.");
  };

  const unblock = async (targetUserId: string) => {
    setBusyId(targetUserId);
    const { error: unblockError } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", targetUserId);
    setBusyId(null);
    if (unblockError) {
      setError(unblockError.message);
      return;
    }
    setBlocked((items) => items.filter((item) => item.id !== targetUserId));
  };

  const requestExport = async () => {
    setError("");
    setMessage("");
    setSaveState("saving");
    const response = await fetch("/api/account/request-data-export", { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setSaveState("idle");
      setError(payload?.error ?? "Unable to request export.");
      return;
    }
    flashSaved(payload?.message ?? "Export requested.");
  };

  const runDangerAction = async () => {
    if (!confirmDelete) return;
    setError("");
    setSaveState("saving");
    const response = await fetch(confirmDelete === "data" ? "/api/account/delete-data" : "/api/account/delete-account", { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setSaveState("idle");
      setError(payload?.error ?? "Unable to complete request.");
      return;
    }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const signOut = async () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      return;
    }

    setSaveState("saving");
    await supabase.auth.signOut();
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const navUser = {
    id: userId,
    username: profile.username,
    display_name: profile.display_name || undefined,
    avatar_path: profile.avatar_path || undefined,
  };
  const displayName = profile.display_name || profile.username;

  return (
    <div className="dashboard-page">
      <Nav user={navUser} />

      <main className="page-container account-settings-page">
        <div className="account-settings-layout">
          <aside className="card account-settings-sidebar">
            <div className="account-settings-user">
              {avatarPreview ? (
                // Public Supabase avatar URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img className="account-settings-avatar" src={avatarPreview} alt="" />
              ) : (
                <div className="avatar avatar-lg avatar-amber">{initials(displayName)}</div>
              )}
              <div className="account-settings-name">{displayName}</div>
              <div className="account-settings-handle">@{profile.username}</div>
            </div>
            <div className="account-settings-nav">
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const active = section === item.section;
                return (
                  <button
                    key={item.section}
                    className={`account-settings-nav-item ${active ? "account-settings-nav-item-active" : ""} ${item.section === "danger" ? "account-settings-nav-item-danger" : ""} ${index === 4 ? "account-settings-nav-item-divided" : ""}`}
                    onClick={() => {
                      setSection(item.section);
                      setError("");
                      setMessage("");
                      setConfirmSignOut(false);
                    }}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
              {initialEmail === ADMIN_EMAIL ? (
                <>
                  <div className="account-settings-nav-section-label">Admin</div>
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.section;
                    return (
                      <button
                        key={item.section}
                        className={`account-settings-nav-item ${active ? "account-settings-nav-item-active" : ""}`}
                        onClick={() => { setSection(item.section); setError(""); setMessage(""); setConfirmSignOut(false); }}
                      >
                        <Icon size={15} />
                        {item.label}
                      </button>
                    );
                  })}
                </>
              ) : null}
              <button
                className={`account-settings-nav-item account-settings-nav-item-divided ${confirmSignOut ? "account-settings-nav-item-danger" : ""}`}
                disabled={saveState === "saving"}
                onBlur={() => {
                  if (saveState !== "saving") setConfirmSignOut(false);
                }}
                onClick={signOut}
              >
                {confirmSignOut ? <IconCheck size={15} /> : <IconLogout size={15} />}
                {saveState === "saving" && confirmSignOut ? "Signing out..." : confirmSignOut ? "Confirm sign out" : "Sign out"}
              </button>
            </div>
          </aside>

          <section className="account-settings-content">
            {error ? <div className="alert alert-error mb-4">{error}</div> : null}
            {message ? <div className="alert alert-success mb-4"><IconCheck size={15} /> {message}</div> : null}

            {section === "profile" ? (
              <Panel title="Profile" subtitle="How you appear on Brickbook to other members">
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="section-label">Photo</div>
                    <div className="account-avatar-row">
                      {avatarPreview ? (
                        // Object URLs and public avatar URLs should render directly.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="account-settings-avatar-lg" src={avatarPreview} alt="Avatar preview" />
                      ) : (
                        <div className="avatar avatar-xl avatar-amber">{initials(displayName)}</div>
                      )}
                      <div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setAvatarFile(file);
                            setAvatarPreview(URL.createObjectURL(file));
                          }}
                        />
                        <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                          <IconCamera size={13} /> {avatarPreview ? "Change photo" : "Upload photo"}
                        </button>
                        {avatarFile ? (
                          <button className="btn btn-ghost btn-sm ml-2" onClick={() => { setAvatarFile(null); setAvatarPreview(getAvatarUrl(profile.avatar_path)); }}>
                            <IconX size={12} /> Remove
                          </button>
                        ) : null}
                        <p className="form-hint">JPG or PNG. Max 5 MB.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <div className="section-label">Public info</div>
                    <Input label="Display name" value={profile.display_name} onChange={(value) => setProfile((current) => ({ ...current, display_name: value }))} />
                    <Input label="Username *" value={profile.username} prefix="@" onChange={(value) => setProfile((current) => ({ ...current, username: value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} hint={`brickbook.com.au/${profile.username}`} />
                    <div className="form-group">
                      <label className="form-label">Bio</label>
                      <textarea className="form-textarea" value={profile.bio ?? ""} maxLength={200} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} />
                      <p className="form-hint text-right">{(profile.bio ?? "").length} / 200</p>
                    </div>
                    <div className="form-grid-2">
                      <Input label="Location" value={profile.location} onChange={(value) => setProfile((current) => ({ ...current, location: value }))} />
                      <Input label="Website" value={profile.website} onChange={(value) => setProfile((current) => ({ ...current, website: value }))} />
                    </div>
                  </div>
                  <SaveBar state={saveState} onSave={saveProfile} />
                </div>
              </Panel>
            ) : null}

            {section === "email" ? (
              <Panel title="Email address" subtitle="Used for sign in and notifications. Not shown publicly.">
                <div className="card">
                  <div className="card-body">
                    <div className="section-label">Email</div>
                    <Input label="Email address *" type="email" value={email} onChange={setEmail} hint="A confirmation link will be sent to the new address before the change takes effect." />
                  </div>
                  <SaveBar state={saveState} onSave={saveEmail} />
                </div>
              </Panel>
            ) : null}

            {section === "password" ? (
              <Panel title="Password" subtitle="Choose a strong password to keep your account secure.">
                <div className="card">
                  <div className="card-body">
                    <div className="section-label">Change password</div>
                    <PasswordInput label="Current password *" value={passwordForm.current} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={(value) => setPasswordForm((current) => ({ ...current, current: value }))} />
                    <PasswordInput label="New password *" value={passwordForm.next} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={(value) => setPasswordForm((current) => ({ ...current, next: value }))} />
                    <PasswordInput label="Confirm new password *" value={passwordForm.confirm} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={(value) => setPasswordForm((current) => ({ ...current, confirm: value }))} />
                  </div>
                  <SaveBar state={saveState} onSave={savePassword} />
                </div>
              </Panel>
            ) : null}

            {section === "notifications" ? (
              <Panel title="Notifications" subtitle="Choose which account activity you want to hear about.">
                <div className="card">
                  <div className="card-body">
                    <div className="section-label">Activity</div>
                    {[
                      ["new_follower", "New followers"],
                      ["new_comment", "New comments"],
                      ["new_reply", "Replies to your comments"],
                      ["new_like", "Likes on your updates"],
                      ["mention", "Mentions"],
                      ["email_digest", "Email digest"],
                    ].map(([key, label]) => (
                      <label className="settings-toggle-row" key={key}>
                        <span>{label}</span>
                        <input type="checkbox" checked={prefs[key as keyof NotificationPrefs]} onChange={(event) => setPrefs((current) => ({ ...current, [key]: event.target.checked }))} />
                      </label>
                    ))}
                  </div>
                  <SaveBar state={saveState} onSave={savePrefs} />
                </div>
              </Panel>
            ) : null}

            {section === "blocked" ? (
              <Panel title="Blocked users" subtitle="Blocked users cannot interact with your builds.">
                <div className="card">
                  <div className="card-body">
                    <div className="section-label">Blocked ({blocked.length})</div>
                    {blocked.length ? blocked.map((item, index) => (
                      <div className="blocked-user-row" key={item.id}>
                        <div className="avatar avatar-md avatar-stone">{initials(item.display_name || item.username)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="blocked-user-name">@{item.username}</div>
                          <div className="blocked-user-meta">Blocked {formatDate(item.blocked_at)}</div>
                        </div>
                        <LoadingButton className="btn btn-secondary btn-sm" loading={busyId === item.id} onClick={() => unblock(item.id)}>
                          Unblock
                        </LoadingButton>
                        {index < blocked.length - 1 ? null : null}
                      </div>
                    )) : (
                      <div className="empty-state">
                        <IconBan size={28} />
                        <h3 className="empty-state-title">No blocked users</h3>
                        <p className="empty-state-sub">You can block users from profiles or comments.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            ) : null}

            {section === "download" ? (
              <Panel title="Download your data" subtitle="Export a copy of everything you've posted to Brickbook.">
                <div className="card">
                  <div className="card-body">
                    <div className="section-label">Data export</div>
                    <p className="landing-copy mb-4">Your export includes builds, milestones, updates, images, comments, selections, rooms, and account profile data in JSON format. The link expires after 24 hours.</p>
                    {["Build profiles and specs", "Milestones and timeline", "Updates and captions", "Image references", "Comments you have posted", "Selections and materials"].map((item) => (
                      <div className="muted-row mb-2" key={item}><IconCheck size={13} className="text-[var(--bb-green)]" /> {item}</div>
                    ))}
                  </div>
                  <div className="card-footer flex justify-end">
                    <LoadingButton className="btn btn-secondary btn-sm" loading={saveState === "saving"} onClick={requestExport}>
                      <IconDownload size={13} /> Request export
                    </LoadingButton>
                  </div>
                </div>
              </Panel>
            ) : null}

            {section === "admin-emails" ? (
              <Panel title="Admin Emails" subtitle="Preview and send test versions of all Brickbook system emails.">
                <AdminEmailsTable />
              </Panel>
            ) : null}

            {section === "danger" ? (
              <Panel title="Danger zone" subtitle="These actions are permanent and cannot be undone.">
                <div className="card danger-card">
                  <DangerRow title="Delete all build data" copy="Permanently removes all your builds, updates, images, milestones, comments, and selections. Your account remains active." onClick={() => setConfirmDelete("data")} />
                  <DangerRow title="Delete account" copy="Permanently deletes your account and all associated data. You will be signed out immediately." onClick={() => setConfirmDelete("account")} strong />
                </div>
                {confirmDelete ? (
                  <div className="card danger-confirm-card">
                    <div className="card-body">
                      <div className="muted-row text-[var(--bb-red)] mb-3"><IconAlertTriangle size={18} /> Are you sure?</div>
                      <p className="landing-copy mb-4">{confirmDelete === "data" ? "This will permanently delete all of your build content." : "This will permanently delete your account and all of your build content."}</p>
                      <Input label="Type DELETE to confirm" value={confirmInput} onChange={setConfirmInput} />
                      <div className="dashboard-actions justify-end">
                        <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmDelete(null); setConfirmInput(""); }}>Cancel</button>
                        <LoadingButton className="btn btn-danger btn-sm" loading={saveState === "saving"} disabled={confirmInput !== "DELETE"} onClick={runDangerAction}>
                          <IconTrash size={13} /> {confirmDelete === "data" ? "Delete all data" : "Delete account"}
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                ) : null}
              </Panel>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="dashboard-header mb-5">
        <div>
          <h1 className="dashboard-title">{title}</h1>
          <p className="dashboard-subtitle">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SaveBar({ state, onSave }: { state: SaveState; onSave: () => void }) {
  return (
    <div className="card-footer flex items-center justify-end gap-2">
      {state === "saved" ? <span className="muted-row mr-auto text-[var(--bb-green)]"><IconCheck size={13} /> Saved</span> : null}
      <LoadingButton className="btn btn-primary btn-sm" loading={state === "saving"} onClick={onSave}>
        Save changes
      </LoadingButton>
    </div>
  );
}

function Input({ label, value, onChange, hint, prefix, type = "text" }: { label: string; value: string; onChange?: (value: string) => void; hint?: string; prefix?: string; type?: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className={prefix ? "settings-input-prefix-wrap" : undefined}>
        {prefix ? <span>{prefix}</span> : null}
        <input className="form-input" type={type} value={value} onChange={(event) => onChange?.(event.target.value)} style={prefix ? { paddingLeft: 26 } : undefined} />
      </div>
      {hint ? <p className="form-hint">{hint}</p> : null}
    </div>
  );
}

function PasswordInput({ label, value, show, onToggle, onChange }: { label: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="settings-password-wrap">
        <input className="form-input" type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" />
        <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={onToggle}>
          {show ? <IconEyeOff size={15} /> : <IconEye size={15} />}
        </button>
      </div>
    </div>
  );
}

function AdminEmailsTable() {
  const [modalTemplate, setModalTemplate] = useState<EmailTemplateMeta | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const openModal = (template: EmailTemplateMeta) => {
    setModalTemplate(template);
    setTestEmail("");
    setState("idle");
    setError("");
  };

  const closeModal = () => {
    if (state === "sending") return;
    setModalTemplate(null);
  };

  const sendTest = async () => {
    if (!testEmail.trim() || !modalTemplate) return;
    setState("sending");
    setError("");
    const response = await fetch("/api/admin/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: modalTemplate.id, toEmail: testEmail }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setState("error");
      setError((data?.error as string | undefined) ?? "Failed to send.");
    } else {
      setState("sent");
      window.setTimeout(() => {
        setModalTemplate(null);
        setState("idle");
      }, 1500);
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-body">
          <EmailTable templates={EMAIL_TEMPLATES} onSendTest={openModal} />
        </div>
      </div>

      {modalTemplate && (
        <div className="bb-modal">
          <button className="bb-modal-backdrop" onClick={closeModal} />
          <div className="bb-modal-panel" style={{ width: "min(100%, 400px)" }}>
            <div className="bb-modal-header">
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bb-black)" }}>Send test email</div>
                <div style={{ fontSize: 12, color: "var(--bb-stone-500)", marginTop: 2 }}>{modalTemplate.name}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeModal} disabled={state === "sending"}>
                <IconX size={14} />
              </button>
            </div>
            <div className="bb-modal-body">
              {error && <div className="alert alert-error mb-3">{error}</div>}
              {state === "sent" && (
                <div className="alert alert-success mb-3">
                  <IconCheck size={13} /> Sent successfully.
                </div>
              )}
              <div className="form-group mb-0">
                <label className="form-label">Send to</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="email@example.com"
                  value={testEmail}
                  autoFocus
                  onChange={(ev) => setTestEmail(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === "Enter") void sendTest(); }}
                />
              </div>
            </div>
            <div className="bb-modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={closeModal} disabled={state === "sending"}>
                Cancel
              </button>
              <LoadingButton
                className="btn btn-primary btn-sm"
                loading={state === "sending"}
                disabled={!testEmail.trim() || state === "sent"}
                onClick={sendTest}
              >
                Send test
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PAGE_SIZE = 10;

function EmailTable({ templates, onSendTest }: { templates: EmailTemplateMeta[]; onSendTest: (t: EmailTemplateMeta) => void }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(templates.length / PAGE_SIZE);
  const visible = templates.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="admin-email-list">
        {visible.map((t) => (
          <div key={t.id} className="admin-email-row">
            <div className="admin-email-row-left">
              <div className="admin-email-name">
                {t.name}
                {t.supabaseManaged && <span className="admin-email-badge-supabase">Supabase</span>}
                <span className={`admin-email-type-badge ${t.recipient === "admin" ? "admin-email-type-admin" : ""}`}>
                  {t.recipient === "admin" ? "Admin" : "User"}
                </span>
              </div>
              <div className="admin-email-sub">{t.description}</div>
              <div className="admin-email-trigger">{t.trigger}</div>
            </div>
            <div className="admin-email-row-right">
              <button className="btn btn-secondary btn-sm" onClick={() => onSendTest(t)}>
                Send test
              </button>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="admin-email-pagination">
          <span className="admin-email-pagination-count">
            {page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + PAGE_SIZE, templates.length)} of {templates.length}
          </span>
          <div className="admin-email-pagination-btns">
            <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DangerRow({ title, copy, onClick, strong }: { title: string; copy: string; onClick: () => void; strong?: boolean }) {
  return (
    <div className="danger-row">
      <div>
        <div className="danger-row-title">{title}</div>
        <p>{copy}</p>
      </div>
      <button className={`btn btn-sm ${strong ? "btn-danger-confirm" : "btn-danger"}`} onClick={onClick}>
        <IconTrash size={13} /> {title}
      </button>
    </div>
  );
}
