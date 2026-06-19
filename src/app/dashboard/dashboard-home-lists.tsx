"use client";

import Link from "next/link";
import { useState } from "react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
// pageItems and PaginationControls still used by DashboardFeedList
import { IconBuildingCommunity, IconPhoto } from "@tabler/icons-react";

type FeedCard = {
  id: string;
  content: string | null;
  created_at: string | null;
  ownerName: string;
  ownerUsername: string;
  imageUrls: string[];
  build: {
    title: string;
    slug: string;
    suburb_name: string | null;
    style: string | null;
  } | null;
};

type MyBuild = {
  id: string;
  title: string;
  slug: string;
  cover_image_path: string | null;
  coverUrl: string | null;
  suburb_name: string | null;
  currentPhase: string;
  is_listed: boolean | null;
};

type SuggestedBuild = {
  id: string;
  title: string;
  slug: string;
  suburb_name: string | null;
  style: string | null;
  ownerUsername: string | null;
};

export function DashboardFeedList({ followedCards }: { followedCards: FeedCard[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedCards = pageItems(followedCards, currentPage);

  if (!followedCards.length) {
    return (
      <div className="empty-state mt-4">
        <div className="empty-state-icon"><IconBuildingCommunity size={32} /></div>
        <h3 className="empty-state-title">Your feed is empty</h3>
        <p className="empty-state-sub">Follow some builds to see their updates here.</p>
        <Link href="/discover" className="btn btn-primary btn-sm">Browse builds</Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {paginatedCards.items.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="avatar avatar-sm avatar-stone">{item.ownerName.charAt(0)}</div>
                <div>
                  <div className="text-[12px] font-medium text-bb-black leading-tight">
                    <Link href={item.build ? `/${item.ownerUsername}/${item.build.slug}` : "/discover"} className="hover:text-bb-amber transition-colors">
                      {item.build?.title ?? "Build update"}
                    </Link>
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {item.ownerName}
                    {item.build?.suburb_name ? `  -  ${item.build.suburb_name}` : ""}
                  </div>
                </div>
              </div>
              <span className="badge badge-phase">{item.build?.style || "Update"}</span>
            </div>

            {item.imageUrls.length > 0 ? (
              <div className="dashboard-feed-carousel">
                {item.imageUrls.map((imageUrl, index) => (
                  // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${item.id}-${index}`} src={imageUrl} alt={`${item.build?.title ?? "Build"} update ${index + 1}`} />
                ))}
                {item.imageUrls.length > 1 ? <span className="image-count">1 / {item.imageUrls.length}</span> : null}
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-stone-200">
                <IconPhoto size={28} className="text-stone-400 opacity-60" />
              </div>
            )}

            <div className="px-4 py-3">
              <p className="text-[13px] text-bb-black leading-relaxed">{item.content || "Build update"}</p>
              <div className="comment-time">{formatRelativeTime(item.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
      <PaginationControls
        currentPage={paginatedCards.currentPage}
        pageCount={paginatedCards.pageCount}
        totalCount={followedCards.length}
        onPageChange={setCurrentPage}
      />
    </>
  );
}

export function DashboardMyBuildsList({ builds, username }: { builds: MyBuild[]; username: string }) {
  const visible = builds.slice(0, 5);

  return (
    <div className="build-list">
      {visible.map((build) => (
        <Link key={build.id} href={`/${username}/${build.slug}`} className="build-row-link">
          <div className="build-row">
            <div className="build-cover" style={{ background: "var(--bb-stone-200)" }}>
              {build.cover_image_path && build.coverUrl ? (
                // Supabase storage URLs are rendered directly in this compact dashboard row.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={build.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "5px", display: "block" }} />
              ) : (
                <IconPhoto size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
              )}
            </div>

            <div className="build-text">
              <div className="build-name">{build.title}</div>
              <div className="build-detail">{build.suburb_name || "No suburb set"} · {build.currentPhase}</div>
            </div>

            <span className={`build-badge ${build.is_listed ? "badge-active" : "badge-private"}`}>
              {build.is_listed ? "Listed" : "Private"}
            </span>
          </div>
        </Link>
      ))}
      {builds.length === 0 ? <p className="text-[12px] text-stone-400">No builds yet.</p> : null}
    </div>
  );
}

export function DashboardSuggestedBuildsList({ builds }: { builds: SuggestedBuild[] }) {
  const visible = builds.slice(0, 3);

  if (!visible.length) {
    return <p className="text-[12px] text-stone-400">No suggested builds yet.</p>;
  }

  return (
    <div className="space-y-1">
      {visible.map((build) => {
        const href = build.ownerUsername && build.slug ? `/${build.ownerUsername}/${build.slug}` : "/discover";
        return (
          <div key={build.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
            <div>
              <div className="text-[12px] font-medium text-bb-black">{build.title}</div>
              <div className="text-[10px] text-stone-400">
                {build.suburb_name || "No suburb"}&nbsp;·&nbsp;
                <span className="badge badge-phase text-[9px] px-1.5 py-0">{build.style || "Build"}</span>
              </div>
            </div>
            <Link href={href} className="btn btn-accent btn-sm text-[10px] px-2.5 py-1">View</Link>
          </div>
        );
      })}
    </div>
  );
}

function formatRelativeTime(value: string | null) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  return `${Math.floor(diff / 86_400_000)} days ago`;
}
