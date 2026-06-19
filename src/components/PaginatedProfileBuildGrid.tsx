"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { IconHeart, IconMessageCircle } from "@tabler/icons-react";
import type { PublicBuildCard } from "@/lib/public-data";

export function PaginatedProfileBuildGrid({ builds, username }: { builds: PublicBuildCard[]; username: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedBuilds = pageItems(builds, currentPage);

  if (!builds.length) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">No public builds yet</h3>
        <p className="empty-state-sub">This user has not listed any builds publicly.</p>
      </div>
    );
  }

  return (
    <>
      <div className="profile-build-grid">
        {paginatedBuilds.items.map((build) => (
          <Link key={build.id} href={`/${username}/${build.slug}`} className="catalogue-card">
            <article className="build-card">
              <div className="catalogue-card-image">
                {build.imageUrl ? (
                  // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={build.imageUrl} alt={`${build.title} in ${build.suburb ?? "Australia"}`} />
                ) : (
                  <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" />
                )}
                <div className="card-badge-row">
                  <span className="badge badge-phase">{build.phase}</span>
                  <span className="badge badge-active">Listed</span>
                </div>
              </div>

              <div className="catalogue-card-body">
                <h3 className="catalogue-card-title">{build.title}</h3>
                <p className="catalogue-card-subtitle">
                  {build.builder || "Builder TBA"} - {build.suburb || "Suburb TBA"}
                </p>
              </div>

              <div className="catalogue-card-footer">
                <div className="metric-row">
                  <span className="metric">
                    <IconHeart size={13} /> {build.followers} followers
                  </span>
                  <span className="metric">
                    <IconMessageCircle size={13} /> {build.comments} comments
                  </span>
                </div>
                <span className="metric">{build.week ? `Wk ${build.week}` : build.phase}</span>
              </div>
            </article>
          </Link>
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
