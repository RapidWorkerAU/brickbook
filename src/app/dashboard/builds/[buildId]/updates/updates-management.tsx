"use client";

import { useState } from "react";
import Link from "next/link";
import { IconEdit, IconPhoto, IconTrash, IconX } from "@tabler/icons-react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";

export type ManageableUpdate = {
  id: string;
  content: string | null;
  milestoneName: string | null;
  createdAt: string;
  imageCount: number;
  imageUrl: string | null;
  imageUrls: string[];
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? null;
  const move = (dir: -1 | 1) =>
    setIndex((i) => (i + dir + images.length) % images.length);

  return (
    <div className="square-carousel">
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="Update photo" />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bb-stone-100)", color: "var(--bb-stone-300)" }}>
          <IconPhoto size={40} />
        </div>
      )}
      {images.length > 1 && (
        <>
          <button className="carousel-control carousel-control-prev" type="button" aria-label="Previous" onClick={() => move(-1)}>{"<"}</button>
          <button className="carousel-control carousel-control-next" type="button" aria-label="Next" onClick={() => move(1)}>{">"}</button>
          <span className="image-count">{index + 1} / {images.length}</span>
          <div className="carousel-dots">
            {images.map((img, i) => (
              <button key={`${img}-${i}`} type="button" className={`carousel-dot${i === index ? " carousel-dot-active" : ""}`} aria-label={`Image ${i + 1}`} onClick={() => setIndex(i)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UpdatePreviewOverlay({
  update,
  buildId,
  onClose,
  onDelete,
}: {
  update: ManageableUpdate;
  buildId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting">("idle");
  const [deleteError, setDeleteError] = useState("");

  const doDelete = async () => {
    setDeleteState("deleting");
    setDeleteError("");
    try {
      const res = await fetch(`/api/build-updates/${update.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error ?? "Delete failed.");
        setDeleteState("confirm");
        return;
      }
      onDelete(update.id);
      onClose();
    } catch {
      setDeleteError("Something went wrong.");
      setDeleteState("confirm");
    }
  };

  return (
    <div className="update-modal" role="dialog" aria-modal="true">
      <button className="update-modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <div className="update-modal-panel">
        <button className="btn-icon update-modal-close" type="button" aria-label="Close" onClick={onClose}>
          <IconX size={18} />
        </button>

        <div className="update-modal-media">
          <ImageCarousel images={update.imageUrls.length ? update.imageUrls : update.imageUrl ? [update.imageUrl] : []} />
        </div>

        <aside className="update-modal-detail">
          <div className="update-modal-header">
            {update.milestoneName && <span className="badge badge-phase">{update.milestoneName}</span>}
            <span className="muted-row">{formatDate(update.createdAt)}</span>
          </div>

          {update.content && (
            <div className="update-modal-caption">
              <p>{update.content}</p>
            </div>
          )}

          <div style={{ padding: "12px 16px", display: "flex", gap: 10, borderTop: "0.5px solid var(--bb-stone-100)" }}>
            <Link
              href={`/dashboard/builds/${buildId}/updates/${update.id}/edit`}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, justifyContent: "center" }}
            >
              <IconEdit size={13} /> Edit
            </Link>
            {deleteState === "idle" ? (
              <button
                className="btn btn-sm"
                style={{ flex: 1, justifyContent: "center", background: "var(--bb-red)", color: "#fff", border: "none" }}
                onClick={() => setDeleteState("confirm")}
              >
                <IconTrash size={13} /> Delete
              </button>
            ) : deleteState === "confirm" ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--bb-text)", fontWeight: 600 }}>Delete permanently?</p>
                {deleteError && <p style={{ margin: 0, fontSize: 11, color: "var(--bb-red)" }}>{deleteError}</p>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setDeleteState("idle")}>Cancel</button>
                  <button className="btn btn-sm" style={{ flex: 1, background: "var(--bb-red)", color: "#fff", border: "none" }} onClick={doDelete}>Yes, delete</button>
                </div>
              </div>
            ) : (
              <p style={{ flex: 1, fontSize: 13, color: "var(--bb-muted)", margin: 0, display: "flex", alignItems: "center" }}>Deleting...</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DeleteModal({
  title,
  body,
  confirmLabel,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={() => { if (!loading) onCancel(); }}
    >
      <div
        style={{ background: "var(--bb-surface)", borderRadius: "var(--bb-radius-xl)", border: "1px solid var(--bb-border)", padding: "28px 24px", maxWidth: 440, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bb-red-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconTrash size={18} style={{ color: "var(--bb-red)" }} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--bb-text)" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--bb-muted)", lineHeight: 1.5 }}>{body}</p>
          </div>
        </div>
        {error && <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--bb-red)", background: "var(--bb-red-light)", padding: "8px 12px", borderRadius: "var(--bb-radius-md)" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading} className="btn btn-secondary btn-sm">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn btn-sm" style={{ background: "var(--bb-red)", color: "#fff", border: "none", opacity: loading ? 0.6 : 1 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UpdatesManagement({
  updates: initialUpdates,
  buildId,
}: {
  updates: ManageableUpdate[];
  buildId: string;
}) {
  const [updates, setUpdates] = useState(initialUpdates);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewUpdate, setPreviewUpdate] = useState<ManageableUpdate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const paged = pageItems(updates, currentPage);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allPageSelected = paged.items.length > 0 && selected.size === paged.items.length;

  const toggleSelectAll = () => {
    setSelected(allPageSelected ? new Set() : new Set(paged.items.map((u) => u.id)));
  };

  const removeFromList = (ids: string[]) => {
    const deletedSet = new Set(ids);
    setUpdates((current) => current.filter((u) => !deletedSet.has(u.id)));
    setSelected((s) => { const next = new Set(s); ids.forEach((id) => next.delete(id)); return next; });
  };

  const doBulkDelete = async (ids: string[]) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const results = await Promise.all(ids.map((id) => fetch(`/api/build-updates/${id}`, { method: "DELETE" })));
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const data = await failed.json().catch(() => null);
        setDeleteError(data?.error ?? "Delete failed.");
        return;
      }
      removeFromList(ids);
      setDeleteTarget(null);
      setBulkDeletePending(false);
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (updates.length === 0) {
    return (
      <div className="empty-state">
        <IconPhoto size={32} />
        <h3 className="empty-state-title">No updates yet</h3>
        <p className="empty-state-sub">Post your first build update to get started.</p>
        <Link href={`/dashboard/builds/${buildId}/updates/new`} className="btn btn-primary btn-sm">
          Post update
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer", userSelect: "none", color: "var(--bb-muted)" }}>
          <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        {selected.size > 0 && (
          <>
            <button
              className="btn btn-sm"
              style={{ background: "var(--bb-red)", color: "#fff", border: "none" }}
              onClick={() => { setDeleteError(null); setBulkDeletePending(true); }}
            >
              <IconTrash size={13} /> Delete {selected.size}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </>
        )}
      </div>

      <div className="update-photo-grid">
        {paged.items.map((update) => (
          <div
            key={update.id}
            className={`update-mgmt-tile${selected.has(update.id) ? " update-mgmt-tile--selected" : ""}`}
            onClick={() => setPreviewUpdate(update)}
            style={{ cursor: "pointer" }}
          >
            {update.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={update.imageUrl} alt="" />
            ) : (
              <div className="update-mgmt-no-img">
                <IconPhoto size={28} />
              </div>
            )}

            <label className="update-mgmt-check" onClick={(e) => toggleSelect(update.id, e)}>
              <input
                type="checkbox"
                checked={selected.has(update.id)}
                onChange={() => {}}
              />
              <span className="update-mgmt-check-box" />
            </label>

            {update.imageCount > 1 && (
              <span className="update-grid-count">{update.imageCount}</span>
            )}

            <div className="update-mgmt-hover-actions">
              <Link
                href={`/dashboard/builds/${buildId}/updates/${update.id}/edit`}
                className="update-mgmt-action-btn"
                onClick={(e) => e.stopPropagation()}
              >
                <IconEdit size={13} /> Edit
              </Link>
              <button
                type="button"
                className="update-mgmt-action-btn update-mgmt-action-delete"
                onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeleteTarget(update.id); }}
              >
                <IconTrash size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <PaginationControls
        currentPage={paged.currentPage}
        pageCount={paged.pageCount}
        totalCount={updates.length}
        onPageChange={(page) => { setCurrentPage(page); setSelected(new Set()); }}
      />

      {previewUpdate && (
        <UpdatePreviewOverlay
          update={previewUpdate}
          buildId={buildId}
          onClose={() => setPreviewUpdate(null)}
          onDelete={(id) => { removeFromList([id]); setPreviewUpdate(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          title="Delete update?"
          body="This update and all its photos will be permanently deleted. This cannot be undone."
          confirmLabel={deleting ? "Deleting..." : "Yes, delete permanently"}
          loading={deleting}
          error={deleteError}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => doBulkDelete([deleteTarget])}
        />
      )}

      {bulkDeletePending && (
        <DeleteModal
          title={`Delete ${selected.size} update${selected.size !== 1 ? "s" : ""}?`}
          body={`${selected.size} update${selected.size !== 1 ? "s" : ""} and all associated photos will be permanently deleted. This cannot be undone.`}
          confirmLabel={deleting ? "Deleting..." : `Yes, delete ${selected.size}`}
          loading={deleting}
          error={deleteError}
          onCancel={() => setBulkDeletePending(false)}
          onConfirm={() => doBulkDelete([...selected])}
        />
      )}
    </>
  );
}
