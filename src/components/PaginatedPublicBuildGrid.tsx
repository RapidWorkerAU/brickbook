"use client";

import { useState } from "react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { PublicBuildMiniCard } from "@/components/PublicBuildMiniCard";
import type { PublicBuildCard } from "@/lib/public-data";

export function PaginatedPublicBuildGrid({ builds }: { builds: PublicBuildCard[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedBuilds = pageItems(builds, currentPage);

  return (
    <>
      <div className="mini-build-grid">
        {paginatedBuilds.items.map((build) => <PublicBuildMiniCard key={build.id} build={build} />)}
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
