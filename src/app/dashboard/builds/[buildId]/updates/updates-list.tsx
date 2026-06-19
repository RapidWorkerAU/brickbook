"use client";

import { useState } from "react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { IconPhoto } from "@tabler/icons-react";

export type BuildUpdateListItem = {
  id: string;
  content: string | null;
  milestoneName: string;
  createdAtLabel: string;
  imageCount: number;
};

export function UpdatesList({ updates }: { updates: BuildUpdateListItem[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedUpdates = pageItems(updates, currentPage);

  return (
    <>
      <div className="management-list">
        {paginatedUpdates.items.map((update) => (
          <article key={update.id} className="card management-row">
            <div className="management-row-main">
              <div className="management-row-title">{update.content || "Untitled update"}</div>
              <div className="management-row-meta">
                {[update.milestoneName, update.createdAtLabel].join(" - ")}
              </div>
            </div>
            <span className="badge badge-phase">
              <IconPhoto size={10} /> {update.imageCount}
            </span>
          </article>
        ))}
      </div>
      <PaginationControls
        currentPage={paginatedUpdates.currentPage}
        pageCount={paginatedUpdates.pageCount}
        totalCount={updates.length}
        onPageChange={setCurrentPage}
      />
    </>
  );
}
