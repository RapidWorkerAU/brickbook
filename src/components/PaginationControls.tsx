"use client";

export const PAGE_SIZE = 12;
export const TABLE_PAGE_SIZE = 10;

export function pageItems<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    currentPage,
    pageCount,
    items: items.slice(start, start + pageSize),
  };
}

export function PaginationControls({
  currentPage,
  pageCount,
  totalCount,
  onPageChange,
  pageSize = PAGE_SIZE,
  variant = "default",
}: {
  currentPage: number;
  pageCount: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  variant?: "default" | "table";
}) {
  const safePageCount = Math.max(1, pageCount);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safePageCount);
  const start = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const end = Math.min(safeCurrentPage * pageSize, totalCount);

  return (
    <div className={`management-image-pagination management-image-pagination-${variant}`}>
      <div className="management-row-meta">
        Showing {start}-{end} of {totalCount}
      </div>
      <div className="management-image-pagination-actions">
        <button className="btn btn-secondary btn-sm" type="button" disabled={safeCurrentPage === 1} onClick={() => onPageChange(safeCurrentPage - 1)}>
          Previous
        </button>
        <span className="management-image-page-count">Page {safeCurrentPage} of {safePageCount}</span>
        <button className="btn btn-secondary btn-sm" type="button" disabled={safeCurrentPage === safePageCount} onClick={() => onPageChange(safeCurrentPage + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
