"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { createClient } from "@/lib/supabase/client";
import { IconBell, IconCheck, IconHeart, IconMessageCircle, IconPhoto, IconUsers } from "@tabler/icons-react";

type DashboardUser = {
  id: string;
  username: string;
  display_name?: string;
  avatar_path?: string;
};

type NotifType = "new_comment" | "new_like" | "new_follower" | "new_reply" | "mention";

type Notification = {
  id: string;
  type: NotifType;
  actorUsername: string;
  actorName: string;
  buildTitle: string;
  buildSlug: string | null;
  ownerUsername: string | null;
  createdAt: string;
  isRead: boolean;
};

type NotificationRow = {
  id: string;
  type: string | null;
  created_at: string | null;
  is_read: boolean | null;
  read_at?: string | null;
  actor?: { username?: string | null; display_name?: string | null; avatar_path?: string | null } | null;
  build?: { title?: string | null; slug?: string | null; owner?: { username?: string | null } | null } | null;
};

const CONFIG: Record<NotifType, { icon: React.ComponentType<{ size?: number }>; className: string }> = {
  new_comment: { icon: IconMessageCircle, className: "notification-icon" },
  new_reply: { icon: IconMessageCircle, className: "notification-icon" },
  mention: { icon: IconPhoto, className: "notification-icon" },
  new_like: { icon: IconHeart, className: "notification-icon notification-icon-like" },
  new_follower: { icon: IconUsers, className: "notification-icon notification-icon-follow" },
};

export function NotificationsClient({ user }: { user: DashboardUser }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const visible = filter === "unread" ? notifications.filter((item) => !item.isRead) : notifications;
  const paginatedVisible = pageItems(visible, currentPage);
  const grouped = useMemo(() => groupNotifications(paginatedVisible.items), [paginatedVisible.items]);

  const loadNotifications = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select(`
        id,
        type,
        created_at,
        is_read,
        read_at,
        actor:profiles!actor_id(username, display_name, avatar_path),
        build:builds!build_id(title, slug, owner:profiles!owner_id(username))
      `)
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications(((data ?? []) as unknown as NotificationRow[]).map(normalizeNotification));
    setLoading(false);
  };

  useEffect(() => {
    void loadNotifications();
    const timer = window.setTimeout(() => {
      void markAllRead();
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const markAllRead = async () => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
  };

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", user.id);
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  return (
    <div className="dashboard-page">
      <Nav user={user} />

      <main className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Notifications</h1>
            <p className="dashboard-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
          </div>
          {unreadCount > 0 ? (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <IconCheck size={13} /> Mark all read
            </button>
          ) : null}
        </div>

        <div className="tab-list mb-4">
          {(["all", "unread"] as const).map((item) => (
            <button key={item} className={`tab ${filter === item ? "tab-active" : ""}`} onClick={() => { setFilter(item); setCurrentPage(1); }}>
              {item === "all" ? "All" : "Unread"}
              {item === "unread" && unreadCount > 0 ? <span className="filter-count">{unreadCount}</span> : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">
            <IconBell size={32} />
            <h3 className="empty-state-title">Loading notifications</h3>
          </div>
        ) : visible.length > 0 ? (
          <>
            <div className="card notification-list">
              {grouped.map((group) => (
                <div key={group.label} className="notification-group">
                  <div className="notification-group-label">{group.label}</div>
                  {group.items.map((notification) => {
                    const Icon = CONFIG[notification.type].icon;
                    const href = notification.buildSlug && notification.ownerUsername ? `/${notification.ownerUsername}/${notification.buildSlug}` : "/dashboard/notifications";
                    return (
                      <Link
                        key={notification.id}
                        href={href}
                        className={`notif-item ${!notification.isRead ? "notif-item-unread" : ""}`}
                        onClick={() => void markRead(notification.id)}
                      >
                        <span className={notification.isRead ? "notif-dot notif-dot-read" : "notif-dot"} />
                        <span className="avatar avatar-sm avatar-stone">{notification.actorName.charAt(0).toUpperCase()}</span>
                        <div className={CONFIG[notification.type].className}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] leading-6 text-[var(--bb-black)]">
                            <strong>@{notification.actorUsername}</strong> {textFor(notification)}
                          </div>
                          <div className="comment-time">{relativeTime(notification.createdAt)}</div>
                        </div>
                        <span className="notification-thumb">
                          <IconPhoto size={16} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={paginatedVisible.currentPage}
              pageCount={paginatedVisible.pageCount}
              totalCount={visible.length}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <div className="empty-state">
            <IconBell size={32} />
            <h3 className="empty-state-title">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</h3>
            <p className="empty-state-sub">New comments, follows, and likes will appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function normalizeNotification(row: NotificationRow): Notification {
  const actorUsername = row.actor?.username || "user";
  return {
    id: row.id,
    type: normalizeType(row.type),
    actorUsername,
    actorName: row.actor?.display_name || actorUsername,
    buildTitle: row.build?.title || "this build",
    buildSlug: row.build?.slug || null,
    ownerUsername: row.build?.owner?.username || null,
    createdAt: row.created_at || new Date().toISOString(),
    isRead: Boolean(row.is_read || row.read_at),
  };
}

function normalizeType(value: unknown): NotifType {
  const type = String(value ?? "new_comment");
  if (type === "new_like" || type === "like") return "new_like";
  if (type === "new_follower" || type === "follow") return "new_follower";
  if (type === "new_reply" || type === "reply") return "new_reply";
  if (type === "mention") return "mention";
  return "new_comment";
}

function textFor(notification: Notification) {
  switch (notification.type) {
    case "new_comment":
      return `commented on ${notification.buildTitle}`;
    case "new_reply":
      return `replied to your comment on ${notification.buildTitle}`;
    case "new_like":
      return `liked an update on ${notification.buildTitle}`;
    case "new_follower":
      return `started following ${notification.buildTitle}`;
    case "mention":
      return `mentioned you in a comment on ${notification.buildTitle}`;
  }
}

function groupNotifications(items: Notification[]) {
  const groups = new Map<string, Notification[]>();
  for (const item of items) {
    const label = groupLabel(item.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return Array.from(groups.entries()).map(([label, groupItems]) => ({ label, items: groupItems }));
}

function groupLabel(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  const diff = now.getTime() - date.getTime();
  if (diff < 7 * 24 * 60 * 60 * 1000) return "This week";
  return "Earlier";
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
