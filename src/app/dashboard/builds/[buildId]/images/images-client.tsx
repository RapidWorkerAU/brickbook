"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import Nav from "@/components/Nav";
import { LoadingButton, ConfirmDeleteButton } from "@/components/action-buttons";
import { PaginationControls } from "@/components/PaginationControls";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { IconChevronDown, IconFilter, IconPhoto, IconPlus, IconX } from "@tabler/icons-react";
import type { DashboardUser, ManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";

export type BuildSelection = {
  id: string;
  category: string | null;
  itemName: string | null;
  brand: string | null;
  productName: string | null;
  colourName: string | null;
  imageUrl?: string | null;
};

type ImageTag = {
  id: string;
  selection_id: string;
  selections: {
    id: string;
    category: string | null;
    item_name: string | null;
    brand: string | null;
    product_name: string | null;
    colour_name: string | null;
    material_type: string | null;
  } | null;
};

export type LibraryImage = {
  id: string;
  storage_path: string | null;
  imageUrl: string | null;
  milestone_id: string | null;
  room_id: string | null;
  room_type?: string | null;
  update_id?: string | null;
  selection_id?: string | null;
  image_kind?: string | null;
  plan_type?: string | null;
  is_primary?: boolean | null;
  notes?: string | null;
  visibility: string | null;
  created_at: string | null;
};

type Milestone = { id: string; title: string };
type Room = { id: string; name: string };
type PendingPostImageDelete = { imageId: string; updateId: string };
const IMAGE_LIBRARY_PAGE_SIZE = 8;
const VISIBILITY_OPTIONS = ["public", "followers", "private"];
const INSPIRATION_ROOM_TYPES = [
  "Kitchen", "Scullery", "Pantry", "Laundry",
  "Bathroom", "Ensuite", "Powder room",
  "Bedroom", "Walk-in robe", "Living", "Dining",
  "Theatre", "Study", "Alfresco", "Garage",
  "Exterior", "Hallway", "Whole house",
];

export function ImagesClient({
  build,
  user,
  initialImages,
  milestones,
  rooms = [],
  buildSelections = [],
  showChrome = true,
  mode = "library",
  useRoomTypes = false,
}: {
  build: ManagedBuild;
  user: DashboardUser;
  initialImages: LibraryImage[];
  milestones: Milestone[];
  rooms?: Room[];
  buildSelections?: BuildSelection[];
  showChrome?: boolean;
  mode?: "library" | "inspiration";
  useRoomTypes?: boolean;
}) {
  const [images, setImages] = useState(initialImages);
  const [milestoneId, setMilestoneId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomType, setRoomType] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<LibraryImage | null>(null);
  const [pendingPostImageDelete, setPendingPostImageDelete] = useState<PendingPostImageDelete | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [expandedImageIds, setExpandedImageIds] = useState<Set<string>>(new Set());
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([]);
  const [selectedVisibilityIds, setSelectedVisibilityIds] = useState<string[]>([]);
  const [columnCount, setColumnCount] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = selectedRoomIds.length + selectedMilestoneIds.length + selectedVisibilityIds.length;
  const clearFilters = () => { setSelectedRoomIds([]); setSelectedMilestoneIds([]); setSelectedVisibilityIds([]); };
  const milestoneNames = new Map(milestones.map((milestone) => [milestone.id, milestone.title]));
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const visibleImages = useMemo(
    () =>
      images.filter((image) => {
        if (mode === "library") return !image.selection_id && image.image_kind !== "inspiration" && image.image_kind !== "plan";
        return image.image_kind === "inspiration";
      }),
    [images, mode],
  );
  const roomFilterOptions = useMemo(() => {
    if (useRoomTypes) {
      const usedTypes = Array.from(new Set(visibleImages.map((img) => img.room_type).filter(Boolean) as string[]));
      return [
        { id: "unassigned", label: "Unassigned", count: visibleImages.filter((img) => !img.room_type).length },
        ...usedTypes.map((type) => ({
          id: type,
          label: type,
          count: visibleImages.filter((img) => img.room_type === type).length,
        })),
      ];
    }
    return [
      { id: "unassigned", label: "Unassigned", count: visibleImages.filter((image) => !image.room_id).length },
      ...rooms.map((room) => ({
        id: room.id,
        label: room.name,
        count: visibleImages.filter((image) => image.room_id === room.id).length,
      })),
    ];
  }, [rooms, useRoomTypes, visibleImages]);
  const milestoneFilterOptions = useMemo(() => {
    return [
      { id: "none", label: "No milestone", count: visibleImages.filter((image) => !image.milestone_id).length },
      ...milestones.map((milestone) => ({
        id: milestone.id,
        label: milestone.title,
        count: visibleImages.filter((image) => image.milestone_id === milestone.id).length,
      })),
    ];
  }, [milestones, visibleImages]);
  const visibilityFilterOptions = useMemo(() => {
    return VISIBILITY_OPTIONS.map((visibilityOption) => ({
      id: visibilityOption,
      label: titleCase(visibilityOption),
      count: visibleImages.filter((image) => (image.visibility ?? "public") === visibilityOption).length,
    }));
  }, [visibleImages]);
  const filteredImages = useMemo(
    () =>
      visibleImages.filter((image) => {
        const roomMatch =
          selectedRoomIds.length === 0 ||
          (useRoomTypes
            ? (selectedRoomIds.includes("unassigned") && !image.room_type) || Boolean(image.room_type && selectedRoomIds.includes(image.room_type))
            : (selectedRoomIds.includes("unassigned") && !image.room_id) || Boolean(image.room_id && selectedRoomIds.includes(image.room_id)));
        const milestoneMatch =
          mode === "inspiration" ||
          selectedMilestoneIds.length === 0 ||
          (selectedMilestoneIds.includes("none") && !image.milestone_id) ||
          Boolean(image.milestone_id && selectedMilestoneIds.includes(image.milestone_id));
        const visibilityMatch = selectedVisibilityIds.length === 0 || selectedVisibilityIds.includes(image.visibility ?? "public");
        return roomMatch && milestoneMatch && visibilityMatch;
      }),
    [mode, selectedMilestoneIds, selectedRoomIds, selectedVisibilityIds, useRoomTypes, visibleImages],
  );
  const pageCount = Math.max(1, Math.ceil(filteredImages.length / IMAGE_LIBRARY_PAGE_SIZE));
  const displayedPage = Math.min(currentPage, pageCount);
  const paginatedImages = useMemo(() => {
    const start = (displayedPage - 1) * IMAGE_LIBRARY_PAGE_SIZE;
    return filteredImages.slice(start, start + IMAGE_LIBRARY_PAGE_SIZE);
  }, [displayedPage, filteredImages]);
  const imageColumns = useMemo(() => {
    const columns = Array.from({ length: columnCount }, () => [] as LibraryImage[]);
    paginatedImages.forEach((image, index) => columns[index % columnCount].push(image));
    return columns;
  }, [columnCount, paginatedImages]);

  useEffect(() => {
    const updateColumnCount = () => {
      const w = window.innerWidth;
      if (w <= 767) setColumnCount(2);
      else if (w < 1040) setColumnCount(3);
      else if (w < 1280) setColumnCount(4);
      else setColumnCount(5);
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  const upload = async (files: File[], notes: string) => {
    if (!files.length) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.set("build_id", build.id);
    formData.set("milestone_id", milestoneId);
    formData.set("room_id", useRoomTypes ? "" : roomId);
    if (useRoomTypes && roomType) formData.set("room_type", roomType);
    formData.set("visibility", visibility);
    formData.set("image_kind", mode === "inspiration" ? "inspiration" : "build");
    formData.set("notes", mode === "inspiration" ? notes : "");
    files.forEach((file) => formData.append("images", file));
    const response = await fetch("/api/build-images", { method: "POST", body: formData });
    const payload = await response.json().catch(() => null);
    setUploading(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to upload images.");
      return;
    }
    setImages((current) => [...(payload.images as LibraryImage[]), ...current]);
    setCurrentPage(1);
    setUploadModalOpen(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedImageIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = async (id: string, postAction?: "keep-post" | "delete-post") => {
    setDeletingImageId(id);
    const query = postAction ? `?postAction=${postAction}` : "";
    const response = await fetch(`/api/build-images/${id}${query}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    setDeletingImageId(null);
    if (response.status === 409 && payload?.requiresPostImageChoice) {
      setPendingPostImageDelete({ imageId: id, updateId: String(payload.updateId ?? "") });
      return;
    }
    if (!response.ok) {
      setError(payload?.error ?? "Unable to delete image.");
      return;
    }
    const deletedIds = new Set((payload?.deletedImageIds as string[] | undefined) ?? [id]);
    setImages((current) => current.filter((image) => !deletedIds.has(image.id)));
    setPendingPostImageDelete(null);
  };

  const saveMeta = async (image: LibraryImage, next: Partial<LibraryImage>) => {
    const updated = { ...image, ...next };
    setImages((current) => current.map((item) => (item.id === image.id ? updated : item)));
    setSavingImageId(image.id);
    const response = await fetch(`/api/build-images/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestone_id: updated.milestone_id,
        ...(useRoomTypes ? { room_type: updated.room_type ?? null } : { room_id: updated.room_id }),
        visibility: updated.visibility,
        notes: updated.notes,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSavingImageId(null);
    if (!response.ok) {
      setImages((current) => current.map((item) => (item.id === image.id ? image : item)));
      setError(payload?.error ?? "Unable to save image.");
      return false;
    }
    if (payload?.image) {
      const saved = { ...payload.image, imageUrl: updated.imageUrl } as LibraryImage;
      setImages((current) => current.map((item) => (item.id === image.id ? saved : item)));
    }
    return true;
  };

  const saveEditedImage = async () => {
    if (!editingImage) return;
    const saved = await saveMeta(editingImage, editingImage);
    if (saved) setEditingImage(null);
  };

  const content = (
    <>
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">{mode === "inspiration" ? "Inspiration photos" : "Image library"}</h1>
            <p className="dashboard-subtitle">{mode === "inspiration" ? "Photos and notes that are inspiring this build." : build.title}</p>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => setUploadModalOpen(true)}>
            <IconPlus size={14} /> {mode === "inspiration" ? "Add inspiration" : "Upload images"}
          </button>
        </div>
        {error ? <div className="alert alert-error mb-4">{error}</div> : null}
        {uploadModalOpen ? (
          <UploadImagesModal
            milestones={milestones}
            rooms={rooms}
            milestoneId={milestoneId}
            roomId={roomId}
            roomType={roomType}
            visibility={visibility}
            mode={mode}
            useRoomTypes={useRoomTypes}
            uploading={uploading}
            onClose={() => setUploadModalOpen(false)}
            onMilestoneChange={setMilestoneId}
            onRoomChange={setRoomId}
            onRoomTypeChange={setRoomType}
            onVisibilityChange={setVisibility}
            onUpload={upload}
          />
        ) : null}
        {editingImage ? (
          <EditImageModal
            image={editingImage}
            mode={mode}
            milestones={milestones}
            rooms={rooms}
            buildSelections={buildSelections}
            useRoomTypes={useRoomTypes}
            saving={savingImageId === editingImage.id}
            onChange={setEditingImage}
            onClose={() => setEditingImage(null)}
            onSave={saveEditedImage}
          />
        ) : null}
        {pendingPostImageDelete ? (
          <DeletePostImageChoiceModal
            deleting={deletingImageId === pendingPostImageDelete.imageId}
            onClose={() => setPendingPostImageDelete(null)}
            onKeepPost={() => remove(pendingPostImageDelete.imageId, "keep-post")}
            onDeletePost={() => remove(pendingPostImageDelete.imageId, "delete-post")}
          />
        ) : null}
        {visibleImages.length ? (
          <>
            {/* Mobile filter button — hidden on desktop */}
            <div className="mobile-filter-bar">
              <button type="button" className="mobile-filter-btn" onClick={() => setFilterOpen(true)}>
                <IconFilter size={14} /> Filters
                {activeFilterCount > 0 && <span className="mobile-filter-count">{activeFilterCount}</span>}
              </button>
            </div>

            {filterOpen && (
              <div className="bb-modal bb-filter-modal" role="dialog" aria-modal="true" aria-label="Filters">
                <div className="bb-modal-panel">
                  <div className="bb-modal-header">
                    <h2 className="bb-modal-title">Filters</h2>
                    <button type="button" className="btn-icon" aria-label="Close" onClick={() => setFilterOpen(false)}><IconX size={16} /></button>
                  </div>
                  <div className="bb-modal-body">
                    <div className="selection-side-section">
                      <MultiSelectFilter label="Rooms" allLabel="All rooms" options={roomFilterOptions} selectedIds={selectedRoomIds} onChange={(ids) => { setSelectedRoomIds(ids); setCurrentPage(1); }} />
                      {mode === "library" && <MultiSelectFilter label="Milestones" allLabel="All milestones" options={milestoneFilterOptions} selectedIds={selectedMilestoneIds} onChange={(ids) => { setSelectedMilestoneIds(ids); setCurrentPage(1); }} />}
                      <MultiSelectFilter label="Visibility" allLabel="All visibility" options={visibilityFilterOptions} selectedIds={selectedVisibilityIds} onChange={(ids) => { setSelectedVisibilityIds(ids); setCurrentPage(1); }} />
                    </div>
                  </div>
                  <div className="bb-modal-footer">
                    {activeFilterCount > 0 && <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>}
                    <button type="button" className="btn btn-primary" onClick={() => setFilterOpen(false)}>Apply</button>
                  </div>
                </div>
              </div>
            )}

            <div className="selection-workspace">
            <aside className="selection-sidebar">
              <div className="selection-side-section">
                <MultiSelectFilter
                  label="Rooms"
                  allLabel="All rooms"
                  options={roomFilterOptions}
                  selectedIds={selectedRoomIds}
                  onChange={(ids) => {
                    setSelectedRoomIds(ids);
                    setCurrentPage(1);
                  }}
                />
                {mode === "library" ? (
                  <MultiSelectFilter
                    label="Milestones"
                    allLabel="All milestones"
                    options={milestoneFilterOptions}
                    selectedIds={selectedMilestoneIds}
                    onChange={(ids) => {
                      setSelectedMilestoneIds(ids);
                      setCurrentPage(1);
                    }}
                  />
                ) : null}
                <MultiSelectFilter
                  label="Visibility"
                  allLabel="All visibility"
                  options={visibilityFilterOptions}
                  selectedIds={selectedVisibilityIds}
                  onChange={(ids) => {
                    setSelectedVisibilityIds(ids);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </aside>

            <div className="selection-main">
            {filteredImages.length ? (
              <>
                <div className="selection-masonry-grid" style={{ "--selection-column-count": columnCount } as CSSProperties}>
                  {imageColumns.map((column, columnIndex) => (
                    <div key={columnIndex} className="management-image-column">
                      {column.map((image) => {
                        const expanded = expandedImageIds.has(image.id);
                        return (
                          <ImageTile
                            key={image.id}
                            expanded={expanded}
                            image={image}
                            milestoneName={mode === "inspiration" ? "Inspiration" : image.milestone_id ? milestoneNames.get(image.milestone_id) ?? "Milestone image" : "Build image"}
                            roomName={useRoomTypes ? (image.room_type ?? null) : (image.room_id ? roomNames.get(image.room_id) ?? null : null)}
                            linkedLabel={getImageLinkedLabel(image)}
                            showMilestone={mode === "library"}
                            showNotes={mode === "inspiration"}
                            onDelete={() => remove(image.id)}
                            onEdit={() => setEditingImage(image)}
                            onToggle={() => toggleExpanded(image.id)}
                          />
                        );
                      })}
                  </div>
                ))}
              </div>
                <PaginationControls
                  currentPage={displayedPage}
                  pageCount={pageCount}
                  totalCount={filteredImages.length}
                  onPageChange={setCurrentPage}
                  pageSize={IMAGE_LIBRARY_PAGE_SIZE}
                />
              </>
            ) : (
              <div className="empty-state">
                <IconPhoto size={32} />
            <h3 className="empty-state-title">No images match those filters</h3>
                <p className="empty-state-sub">Adjust the filters to show more images.</p>
              </div>
            )}
            </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <IconPhoto size={32} />
            <h3 className="empty-state-title">{mode === "inspiration" ? "No inspiration photos yet" : "No images yet"}</h3>
            <p className="empty-state-sub">{mode === "inspiration" ? "Add photos and notes for styles, details, and ideas you like." : "Upload images to build your library."}</p>
          </div>
        )}
      </>
  );

  if (!showChrome) return content;

  return (
    <div className="dashboard-page">
      <Nav user={user} />
      <main className="dashboard-container-wide">
        {content}
      </main>
    </div>
  );
}

function ImageTile({
  image,
  expanded,
  milestoneName,
  roomName,
  linkedLabel,
  showMilestone = true,
  onToggle,
  onEdit,
  onDelete,
  showNotes = false,
}: {
  image: LibraryImage;
  expanded: boolean;
  milestoneName: string;
  roomName: string | null;
  linkedLabel: string;
  showMilestone?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showNotes?: boolean;
}) {
  const details = [
    { label: "Linked to", value: linkedLabel },
    ...(showMilestone ? [{ label: "Milestone", value: milestoneName }] : []),
    { label: "Room", value: roomName ?? "No room" },
    { label: "Visibility", value: titleCase(image.visibility ?? "public") },
    ...(showNotes ? [{ label: "Notes", value: image.notes || "None" }] : []),
  ];

  return (
    <article className="card management-image-card selection-card">
      <div className="management-image-media selection-card-image">
        {roomName ? <span className="selection-card-room-badge">{roomName}</span> : null}
        {image.imageUrl ? (
          // Signed Supabase URLs are rendered directly until remote image patterns are finalized.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.imageUrl} alt="" />
        ) : (
          <div className="empty-state-icon"><IconPhoto size={28} /></div>
        )}
      </div>
      <div className="management-image-body">
        <button className="management-image-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
          <span className="management-image-copy">
            <span className="selection-card-topline">
              <span className="badge badge-phase">{linkedLabel}</span>
            </span>
            <span className="selection-card-title">{milestoneName}</span>
            {roomName ? <span className="selection-card-detail">{roomName}</span> : null}
          </span>
          <IconChevronDown className={expanded ? "management-image-chevron-expanded" : ""} size={16} />
        </button>
        {expanded ? (
          <div className="management-image-details selection-card-expanded">
            {details.map((item) => (
              <div className="selection-card-detail-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
            <div className="dashboard-actions justify-end">
              <button className="btn btn-secondary btn-sm" type="button" onClick={onEdit}>Edit</button>
              <ConfirmDeleteButton onConfirm={onDelete} />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DeletePostImageChoiceModal({
  deleting,
  onClose,
  onKeepPost,
  onDeletePost,
}: {
  deleting: boolean;
  onClose: () => void;
  onKeepPost: () => void;
  onDeletePost: () => void;
}) {
  return (
    <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="delete-post-image-choice-title">
      <button className="bb-modal-backdrop" type="button" aria-label="Cancel image delete" onClick={onClose} />
      <section className="bb-modal-panel">
        <div className="bb-modal-header">
          <div>
            <h2 id="delete-post-image-choice-title" className="dashboard-title">Delete last post image?</h2>
            <p className="dashboard-subtitle">This image is the only image attached to its post.</p>
          </div>
          <button className="btn-icon" type="button" aria-label="Cancel image delete" onClick={onClose} disabled={deleting}>
            <IconX size={16} />
          </button>
        </div>
        <div className="bb-modal-body">
          <div className="alert alert-info">
            Choose whether to keep the post as a text-only update, or delete the post and its image together.
          </div>
        </div>
        <div className="bb-modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={deleting}>Cancel</button>
          <LoadingButton className="btn btn-secondary" loading={deleting} onClick={onKeepPost}>
            Delete image only
          </LoadingButton>
          <LoadingButton className="btn btn-danger" loading={deleting} onClick={onDeletePost}>
            Delete post and image
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}

function EditImageModal({
  image,
  mode,
  milestones,
  rooms,
  buildSelections = [],
  useRoomTypes = false,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  image: LibraryImage;
  mode: "library" | "inspiration";
  milestones: Milestone[];
  rooms: Room[];
  buildSelections?: BuildSelection[];
  useRoomTypes?: boolean;
  saving: boolean;
  onChange: (image: LibraryImage) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="image-edit-modal-title">
      <button className="bb-modal-backdrop" type="button" aria-label="Close image editor" onClick={onClose} />
      <section className="bb-modal-panel">
        <div className="bb-modal-header">
          <div>
            <h2 id="image-edit-modal-title" className="dashboard-title">{mode === "inspiration" ? "Edit inspiration" : "Edit image"}</h2>
            <p className="dashboard-subtitle">Update how this image is organised and shared.</p>
          </div>
          <button className="btn-icon" type="button" aria-label="Close image editor" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>
        <div className="bb-modal-body">
          <div className="form-grid-2">
            {mode === "library" ? (
              <Select label="Milestone" value={image.milestone_id ?? ""} onChange={(value) => onChange({ ...image, milestone_id: value || null })} options={[{ id: "", title: "No milestone" }, ...milestones]} />
            ) : null}
            {useRoomTypes ? (
              <Select label="Room type" value={image.room_type ?? ""} onChange={(value) => onChange({ ...image, room_type: value || null })} options={[{ id: "", title: "No room" }, ...INSPIRATION_ROOM_TYPES.map((type) => ({ id: type, title: type }))]} />
            ) : (
              <Select label="Room" value={image.room_id ?? ""} onChange={(value) => onChange({ ...image, room_id: value || null })} options={[{ id: "", title: "No room" }, ...rooms.map((room) => ({ id: room.id, title: room.name }))]} />
            )}
            <Select label="Visibility" value={image.visibility ?? "public"} onChange={(value) => onChange({ ...image, visibility: value })} options={VISIBILITY_OPTIONS.map((value) => ({ id: value, title: titleCase(value) }))} />
          </div>
          {mode === "inspiration" ? (
            <div className="form-group">
              <label className="form-label">What inspired you?</label>
              <textarea className="form-textarea" value={image.notes ?? ""} onChange={(event) => onChange({ ...image, notes: event.target.value })} />
            </div>
          ) : null}
          {buildSelections.length > 0 ? (
            <TagSection imageId={image.id} buildSelections={buildSelections} />
          ) : null}
        </div>
        <div className="bb-modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <LoadingButton className="btn btn-primary" loading={saving} onClick={onSave}>
            Save image
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}

function UploadImagesModal({
  milestones,
  rooms,
  milestoneId,
  roomId,
  roomType,
  visibility,
  mode,
  useRoomTypes = false,
  uploading,
  onClose,
  onMilestoneChange,
  onRoomChange,
  onRoomTypeChange,
  onVisibilityChange,
  onUpload,
}: {
  milestones: Milestone[];
  rooms: Room[];
  milestoneId: string;
  roomId: string;
  roomType: string;
  visibility: string;
  mode: "library" | "inspiration";
  useRoomTypes?: boolean;
  uploading: boolean;
  onClose: () => void;
  onMilestoneChange: (value: string) => void;
  onRoomChange: (value: string) => void;
  onRoomTypeChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onUpload: (files: File[], notes: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");

  const previewUrls = useMemo(() => selectedFiles.map((f) => URL.createObjectURL(f)), [selectedFiles]);
  useEffect(() => () => { previewUrls.forEach((url) => URL.revokeObjectURL(url)); }, [previewUrls]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (added.length) setSelectedFiles((prev) => [...prev, ...added]);
    e.target.value = "";
  };

  const removeFile = (index: number) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const submitLabel = selectedFiles.length > 0
    ? `Upload ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""}`
    : "Select photos";

  return (
    <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="image-upload-modal-title">
      <button className="bb-modal-backdrop" type="button" aria-label="Close image upload" onClick={onClose} />
      <section className="bb-modal-panel">
        <div className="bb-modal-header">
          <div>
            <h2 id="image-upload-modal-title" className="dashboard-title">{mode === "inspiration" ? "Add inspiration" : "Upload images"}</h2>
            <p className="dashboard-subtitle">{mode === "inspiration" ? "Choose your photos, then add room and notes before uploading." : "Add one or more images to this build."}</p>
          </div>
          <button className="btn-icon" type="button" aria-label="Close image upload" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>
        <div className="bb-modal-body">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />

          {selectedFiles.length === 0 ? (
            <button className="image-upload-zone" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <IconPhoto size={22} />
              <span className="empty-state-title">Choose photos</span>
              <span className="empty-state-sub">Select one or more images to get started.</span>
            </button>
          ) : (
            <div className="upload-preview-section">
              <div className="upload-preview-grid">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="upload-preview-thumb">
                    <img src={previewUrls[i]} alt={file.name} />
                    <button className="upload-preview-remove" type="button" aria-label="Remove" onClick={() => removeFile(i)} disabled={uploading}>
                      <IconX size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <IconPlus size={13} /> Add more photos
              </button>
            </div>
          )}

          {mode === "library" ? (
            <div className="form-grid-2" style={{ marginTop: 16 }}>
              <Select label="Milestone" value={milestoneId} onChange={onMilestoneChange} options={[{ id: "", title: "No milestone" }, ...milestones]} />
              <Select label="Room" value={roomId} onChange={onRoomChange} options={[{ id: "", title: "No room" }, ...rooms.map((room) => ({ id: room.id, title: room.name }))]} />
              <Select label="Visibility" value={visibility} onChange={onVisibilityChange} options={VISIBILITY_OPTIONS.map((value) => ({ id: value, title: value }))} />
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 16 }}>
              {useRoomTypes ? (
                <Select label="Room type" value={roomType} onChange={onRoomTypeChange} options={[{ id: "", title: "No room" }, ...INSPIRATION_ROOM_TYPES.map((type) => ({ id: type, title: type }))]} />
              ) : (
                <Select label="Room" value={roomId} onChange={onRoomChange} options={[{ id: "", title: "No room" }, ...rooms.map((room) => ({ id: room.id, title: room.name }))]} />
              )}
              <Select label="Visibility" value={visibility} onChange={onVisibilityChange} options={VISIBILITY_OPTIONS.map((value) => ({ id: value, title: value }))} />
              <div className="form-group">
                <label className="form-label">What do you like about it? <span className="form-label-optional">(optional)</span></label>
                <textarea className="form-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. facade, kitchen palette, window shape..." rows={3} />
              </div>
            </div>
          )}
          <p className="upload-batch-hint">All photos in this upload will share the same room and settings. Upload in separate batches if you need different rooms or notes per photo.</p>
        </div>
        <div className="bb-modal-footer">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={uploading}>Cancel</button>
          <LoadingButton className="btn btn-primary" loading={uploading} disabled={selectedFiles.length === 0} onClick={() => onUpload(selectedFiles, notes)}>
            <IconPlus size={14} /> {submitLabel}
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}

function TagSection({ imageId, buildSelections }: { imageId: string; buildSelections: BuildSelection[] }) {
  const [tags, setTags] = useState<ImageTag[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  useEffect(() => {
    fetch(`/api/images/${imageId}/tags`)
      .then((res) => res.json())
      .then((data) => { setTags(data.tags ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [imageId]);

  const addTag = async (selectionId: string) => {
    setAdding(true);
    const res = await fetch(`/api/images/${imageId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectionId }),
    });
    const data = await res.json().catch(() => null);
    setAdding(false);
    if (!res.ok) return;
    const sel = buildSelections.find((s) => s.id === selectionId);
    if (sel && data?.tag) {
      setTags((current) => [
        ...current,
        {
          id: data.tag.id,
          selection_id: selectionId,
          selections: { id: selectionId, category: sel.category, item_name: sel.itemName, brand: sel.brand, product_name: sel.productName, colour_name: sel.colourName, material_type: null },
        },
      ]);
    }
    setPickerOpen(false);
    setPickerSearch("");
  };

  const removeTag = async (selectionId: string) => {
    setRemoving(selectionId);
    await fetch(`/api/images/${imageId}/tags/${selectionId}`, { method: "DELETE" });
    setTags((current) => current.filter((t) => t.selection_id !== selectionId));
    setRemoving(null);
  };

  const taggedIds = new Set(tags.map((t) => t.selection_id));
  const available = buildSelections.filter((s) => {
    if (taggedIds.has(s.id)) return false;
    if (!pickerSearch) return true;
    const q = pickerSearch.toLowerCase();
    return [s.itemName, s.brand, s.productName, s.category, s.colourName].some((f) => f?.toLowerCase().includes(q));
  });

  if (!loaded) return <div className="muted-row" style={{ fontSize: 11 }}>Loading tags…</div>;

  return (
    <div className="image-tag-section">
      <div className="image-tag-section-label">Inspiration tags</div>
      <div className="image-tags-row">
        {tags.map((tag) => {
          const s = tag.selections;
          const label = s?.item_name || s?.product_name || s?.brand || "Selection";
          const thumbUrl = buildSelections.find((bs) => bs.id === tag.selection_id)?.imageUrl;
          return (
            <span key={tag.selection_id} className="image-tag-chip">
              {thumbUrl
                ? (
                  <div className="image-tag-chip-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl} alt="" />
                  </div>
                ) : null}
              {s?.colour_name ? s.colour_name : label}{s?.colour_name ? <span className="image-tag-chip-cat"> · {label}</span> : null}
              <button
                type="button"
                className="image-tag-chip-remove"
                onClick={() => removeTag(tag.selection_id)}
                disabled={removing === tag.selection_id}
                aria-label="Remove tag"
              >
                <IconX size={10} />
              </button>
            </span>
          );
        })}
        {buildSelections.length > 0 && (
          <button
            type="button"
            className="image-tag-add-btn"
            onClick={() => setPickerOpen((o) => !o)}
            disabled={adding}
          >
            <IconPlus size={12} /> Tag selection
          </button>
        )}
      </div>
      {pickerOpen && (
        <div className="image-tag-picker">
          <input
            className="form-input"
            placeholder="Search your selections..."
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <div className="image-tag-picker-list">
            {available.slice(0, 20).map((sel) => (
              <button key={sel.id} type="button" className="image-tag-picker-item" onClick={() => addTag(sel.id)}>
                <div className="image-tag-picker-thumb-wrap">
                  {sel.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={sel.imageUrl} alt="" />
                    : null
                  }
                </div>
                <div className="image-tag-picker-text">
                  <span className="image-tag-picker-cat">{sel.itemName || sel.productName || sel.brand || "—"}</span>
                  <span className="image-tag-picker-name">{sel.colourName || "—"}</span>
                  <span className="image-tag-picker-colour">{sel.category || "Selection"}</span>
                </div>
              </button>
            ))}
            {available.length === 0 && (
              <div className="muted-row" style={{ fontSize: 11, padding: "8px 0" }}>
                {taggedIds.size === buildSelections.length ? "All selections are already tagged." : "No selections match."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function titleCase(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function getImageLinkedLabel(image: LibraryImage) {
  if (image.update_id) return "Post";
  if (image.selection_id) return "Selection";
  if (image.image_kind === "inspiration") return "Inspiration";
  return "Library";
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { id: string; title: string }[] }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
      </select>
    </div>
  );
}
