"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { IconEdit, IconExternalLink, IconEye, IconEyeOff, IconFileText, IconPhoto, IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";

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
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedBuilds = pageItems(builds, currentPage);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/builds/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "Delete failed."); return; }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

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
                  <button
                    onClick={() => setDeleteTarget({ id: build.id, title: build.title })}
                    className="btn-icon"
                    aria-label="Delete build"
                    style={{ color: "var(--bb-red)" }}
                  >
                    <IconTrash size={14} />
                  </button>
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => { if (!deleting) setDeleteTarget(null); }}
        >
          <div
            style={{
              background: "var(--bb-surface)", borderRadius: "var(--bb-radius-xl)",
              border: "1px solid var(--bb-border)", padding: "28px 24px",
              maxWidth: 440, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bb-red-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconTrash size={18} style={{ color: "var(--bb-red)" }} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--bb-text)" }}>Delete build?</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--bb-muted)", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--bb-text)" }}>{deleteTarget.title}</strong> and all of its data will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--bb-red)", background: "var(--bb-red-light)", padding: "8px 12px", borderRadius: "var(--bb-radius-md)" }}>
                {deleteError}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="btn btn-sm"
                style={{ background: "var(--bb-red)", color: "#fff", border: "none", opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Deleting..." : "Yes, delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
