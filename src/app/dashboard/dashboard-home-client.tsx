"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  IconBell,
  IconChevronDown,
  IconHeart,
  IconHome,
  IconMessageCircle,
  IconPlus,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { DashboardFeedList, DashboardMyBuildsList, DashboardSuggestedBuildsList } from "@/app/dashboard/dashboard-home-lists";
import { DashboardUpdateLauncher } from "@/app/dashboard/dashboard-update-launcher";
import type { RecentNotification } from "@/app/dashboard/page";

type MobileTab = "Feed" | "Suggested" | "Activity" | "Notifications";

const MOBILE_TABS: { id: MobileTab; icon: React.ReactNode }[] = [
  { id: "Feed",          icon: <IconHome size={15} /> },
  { id: "Suggested",     icon: <IconTrendingUp size={15} /> },
  { id: "Activity",      icon: <IconUsers size={15} /> },
  { id: "Notifications", icon: <IconBell size={15} /> },
];

type LauncherBuild = { id: string; title: string };
type FeedCard = Parameters<typeof DashboardFeedList>[0]["followedCards"][number];
type MyBuild  = Parameters<typeof DashboardMyBuildsList>[0]["builds"][number];
type SuggestedBuild = Parameters<typeof DashboardSuggestedBuildsList>[0]["builds"][number];

function notifText(type: string | null, buildTitle: string) {
  if (type === "new_like" || type === "like") return `liked an update on ${buildTitle}`;
  if (type === "new_follower" || type === "follow") return `started following ${buildTitle}`;
  if (type === "new_reply" || type === "reply") return `replied to your comment on ${buildTitle}`;
  return `commented on ${buildTitle}`;
}

function NotifIcon({ type }: { type: string | null }) {
  if (type === "new_like" || type === "like") return <IconHeart size={13} />;
  if (type === "new_follower" || type === "follow") return <IconUsers size={13} />;
  return <IconMessageCircle size={13} />;
}

function NotifList({ notifications }: { notifications: RecentNotification[] }) {
  if (!notifications.length) {
    return <p className="text-[12px] text-stone-400 py-2">No notifications yet.</p>;
  }
  return (
    <>
      {notifications.map((n) => {
        const actor = n.actor?.display_name || n.actor?.username || "Someone";
        const buildTitle = n.build?.title || "a build";
        const slug = n.build?.slug;
        const ownerUsername = n.build?.owner?.username;
        const href = slug && ownerUsername ? `/${ownerUsername}/${slug}` : "/dashboard/notifications";
        return (
          <Link key={n.id} href={href} className={`notif-item -mx-4 px-4 ${!n.is_read ? "notif-item-unread" : ""}`}>
            <span className={n.is_read ? "notif-dot notif-dot-read" : "notif-dot"} />
            <span className="avatar avatar-sm avatar-stone flex-shrink-0">{actor.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] leading-5 text-[var(--bb-black)]">
                <strong>@{n.actor?.username ?? "user"}</strong> {notifText(n.type, buildTitle)}
              </div>
            </div>
            <NotifIcon type={n.type} />
          </Link>
        );
      })}
    </>
  );
}

export function DashboardHomeClient({
  launcherBuilds,
  followedCards,
  myBuildCards,
  username,
  suggestedBuildCards,
  followerCount,
  followingCount,
  commentCount,
  recentNotifications,
}: {
  launcherBuilds: LauncherBuild[];
  followedCards: FeedCard[];
  myBuildCards: MyBuild[];
  username: string;
  suggestedBuildCards: SuggestedBuild[];
  followerCount: number;
  followingCount: number;
  commentCount: number;
  recentNotifications: RecentNotification[];
}) {
  const [mobileTab, setMobileTab] = useState<MobileTab>("Feed");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const currentTab = MOBILE_TABS.find((t) => t.id === mobileTab)!;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* ── Main column ── */}
        <div className="min-w-0">

          {/* Post update launcher — desktop only */}
          <div className="dashboard-update-launcher-wrap">
            <DashboardUpdateLauncher builds={launcherBuilds} />
          </div>

          {/* Mobile-only section dropdown */}
          <div className="dashboard-mobile-filter" ref={dropdownRef}>
            <button
              type="button"
              className="editor-details-dropdown-trigger"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <span className="editor-details-dropdown-icon">{currentTab.icon}</span>
              <span className="editor-details-dropdown-label">{mobileTab}</span>
              <IconChevronDown
                size={14}
                style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}
              />
            </button>
            {dropdownOpen && (
              <div className="editor-details-dropdown-menu">
                {MOBILE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`editor-details-nav-item${mobileTab === tab.id ? " editor-details-nav-item-active" : ""}`}
                    onClick={() => { setMobileTab(tab.id); setDropdownOpen(false); }}
                  >
                    {tab.icon}
                    <span>{tab.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile content pane */}
          <div className="dashboard-mobile-content">
            {mobileTab === "Feed" && (
              <DashboardFeedList followedCards={followedCards} />
            )}
            {mobileTab === "Suggested" && (
              <>
                <DashboardSuggestedBuildsList builds={suggestedBuildCards} />
                <div className="mt-3">
                  <Link href="/discover" className="btn btn-ghost btn-sm w-full justify-center gap-1 text-stone-400">
                    <IconUsers size={13} /> Browse all builds
                  </Link>
                </div>
              </>
            )}
            {mobileTab === "Activity" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">{followerCount}</div>
                  <div className="stat-label">Followers</div>
                </div>
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">0</div>
                  <div className="stat-label">Updates</div>
                </div>
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">{followingCount}</div>
                  <div className="stat-label">Following</div>
                </div>
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">{commentCount}</div>
                  <div className="stat-label">Comments</div>
                </div>
              </div>
            )}
            {mobileTab === "Notifications" && (
              <div className="card mt-2">
                <div className="card-body pb-0">
                  <NotifList notifications={recentNotifications} />
                </div>
                <div className="card-footer">
                  <Link href="/dashboard/notifications" className="btn btn-ghost btn-sm w-full justify-center text-stone-400">
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Desktop feed — hidden on mobile */}
          <div className="dashboard-desktop-feed">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-[15px] font-semibold text-bb-black">Following</h1>
              <Link href="/discover" className="text-[12px] text-bb-amber hover:opacity-80">
                Discover more builds
              </Link>
            </div>
            <DashboardFeedList followedCards={followedCards} />
          </div>
        </div>

        {/* ── Sidebar (desktop only) ── */}
        <div className="space-y-4 dashboard-desktop-sidebar">
          <div className="card">
            <div className="card-body pb-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-bb-black">My builds</h2>
                <Link href="/dashboard/builds" className="text-[11px] text-[var(--bb-amber)] font-medium hover:underline">View all</Link>
              </div>
              <DashboardMyBuildsList builds={myBuildCards} username={username} />
            </div>
            <div className="card-footer">
              <Link href="/dashboard/builds/new" className="add-btn">
                <IconPlus size={13} /> Add a build
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="text-[13px] font-semibold text-bb-black mb-3">Your activity</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">{followerCount}</div>
                  <div className="stat-label">Followers</div>
                </div>
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">0</div>
                  <div className="stat-label">Updates</div>
                </div>
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">{followingCount}</div>
                  <div className="stat-label">Following</div>
                </div>
                <div className="stat-card bg-stone-50 border-0 p-3">
                  <div className="stat-value text-[20px]">{commentCount}</div>
                  <div className="stat-label">Comments</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body pb-3">
              <div className="flex items-center gap-2 mb-3">
                <IconTrendingUp size={14} className="text-stone-400" />
                <h2 className="text-[13px] font-semibold text-bb-black">Suggested builds</h2>
              </div>
              <DashboardSuggestedBuildsList builds={suggestedBuildCards} />
            </div>
            <div className="card-footer">
              <Link href="/discover" className="btn btn-ghost btn-sm w-full justify-center gap-1 text-stone-400">
                <IconUsers size={13} /> Browse all builds
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-body pb-0">
              <div className="flex items-center gap-2 mb-3">
                <IconBell size={14} className="text-stone-400" />
                <h2 className="text-[13px] font-semibold text-bb-black">Notifications</h2>
              </div>
              <NotifList notifications={recentNotifications} />
            </div>
            <div className="card-footer">
              <Link href="/dashboard/notifications" className="btn btn-ghost btn-sm w-full justify-center text-stone-400">
                View all notifications
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
