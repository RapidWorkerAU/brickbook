"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { IconEdit, IconExternalLink, IconEye, IconEyeOff, IconFileText, IconPhoto, IconPlus, IconUsers } from "@tabler/icons-react";

export type DashboardBuildListItem = {
  id: string;
  title: string;
  slug: string;
  builder_name: string | null;
  suburb_name: string | null;
  style: string | null;
  is_listed: boolean | null;
  imageUrl: string | null;
};

export function DashboardBuildsList({ builds, username }: { builds: DashboardBuildListItem[]; username: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedBuilds = pageItems(builds, currentPage);

  if (!builds.length) {
    return (
      <div className="empty-state">
        <IconPhoto size={32} />
        <h3 className="empty-state-title">No builds yet</h3>
        <p className="empty-state-sub">Create your first build profile and start sharing your journey.</p>
        <Link href="/dashboard/builds/new" className="btn btn-primary btn-sm">
          <IconPlus size={13} /> Create your first build
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-list">
        {paginatedBuilds.items.map((build) => (
          <article key={build.id} className="card dashboard-build-row">
            <div className="dashboard-build-thumb">
              {build.imageUrl ? (
                // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={build.imageUrl} alt={`${build.title} cover`} />
              ) : (
                <Image src="/images/comingsoon.jpg" alt="" fill sizes="120px" />
              )}
            </div>

            <div className="dashboard-build-body">
              <div className="dashboard-build-top">
                <div>
                  <div className="dashboard-build-title-row">
                    <span className="dashboard-build-title">{build.title}</span>
                    <span className="badge badge-active">{build.style || "Build"}</span>
                    {build.is_listed ? (
                      <span className="badge badge-listed">
                        <IconEye size={10} /> Listed
                      </span>
                    ) : (
                      <span className="badge badge-private">
                        <IconEyeOff size={10} /> Private
                      </span>
                    )}
                  </div>
                  <div className="dashboard-build-subtitle">
                    {build.builder_name || "Builder TBA"} - {build.suburb_name || "Suburb TBA"}
                  </div>
                </div>

                <div className="dashboard-actions">
                  {build.is_listed ? (
                    <Link href={`/${username}/${build.slug}`} className="btn-icon" aria-label="View public profile" target="_blank">
                      <IconExternalLink size={14} />
                    </Link>
                  ) : null}
                  <Link href={`/dashboard/builds/${build.id}`} className="btn btn-secondary btn-sm">
                    <IconEdit size={13} /> Edit build
                  </Link>
                  <Link href={`/dashboard/builds/${build.id}/updates/new`} className="btn btn-primary btn-sm">
                    <IconPlus size={13} /> Post update
                  </Link>
                </div>
              </div>

              <div className="dashboard-stat-row">
                <span className="metric">
                  <IconUsers size={13} /> Listed profile
                </span>
                <span className="metric">
                  <IconFileText size={13} /> Updates pending
                </span>
                <span className="metric dashboard-stat-spacer">{build.style || "Build"}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <PaginationControls
        currentPage={paginatedBuilds.currentPage}
        pageCount={paginatedBuilds.pageCount}
        totalCount={builds.length}
        onPageChange={setCurrentPage}
      />
    </>
  );
}
