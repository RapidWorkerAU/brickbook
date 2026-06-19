"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Nav from "@/components/Nav";
import { LoadingButton, ConfirmDeleteButton } from "@/components/action-buttons";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { SearchableSelect } from "@/components/SearchableSelect";
import type { SelectionTypeValue } from "@/lib/selection-types";
import { IconCheck, IconChevronDown, IconPhoto, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import type { DashboardUser, ManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";

export type EditableRoom = {
  id: string;
  build_id?: string | null;
  name: string;
  room_type: string | null;
  level: string | null;
  notes: string | null;
  created_at?: string | null;
};

export type EditableSelection = {
  id: string;
  selection_type: string | null;
  category: string | null;
  subcategory: string | null;
  location: string | null;
  room_id: string | null;
  item_name: string | null;
  material_type: string | null;
  brand: string | null;
  product_name: string | null;
  model: string | null;
  colour_name: string | null;
  code: string | null;
  finish: string | null;
  supplier: string | null;
  product_url: string | null;
  linked_image_id?: string | null;
  image_path: string | null;
  imageUrl?: string | null;
  notes: string | null;
  visibility: string | null;
};

type SelectionDraft = EditableSelection & { imageFile?: File | null; imagePreviewUrl?: string | null };
export type SelectionImageOption = { id: string; imageUrl: string | null; label: string };

const VISIBILITY_OPTIONS = ["public", "followers", "private"];

const SELECTION_TYPES = [
  {
    id: "colour" satisfies SelectionTypeValue,
    label: "Colour",
    categoryLabel: "House area",
    subcategoryLabel: "Part",
    itemLabel: "Selection name",
    options: {
      category: ["Exterior", "Interior", "Roof", "Brickwork", "Cabinetry", "Flooring", "Walls", "Windows and doors"],
      subcategory: ["Main colour", "Feature colour", "Trim", "Door", "Wall", "Ceiling", "Cabinet fronts", "Benchtop", "Splashback"],
      material: ["Paint", "Render", "Brick", "Tile", "Laminate", "Stone", "Timber", "Metal", "Carpet"],
    },
  },
  {
    id: "construction" satisfies SelectionTypeValue,
    label: "Construction",
    categoryLabel: "Construction area",
    subcategoryLabel: "Part",
    itemLabel: "Item",
    options: {
      category: ["Roof", "Brickwork", "Hardstand", "Windows and doors", "Cladding", "Garage", "Alfresco / patio"],
      subcategory: ["Roof sheeting / tiles", "Gutters", "Fascia", "Downpipes", "Main brick", "Feature brick", "Driveway", "Paths", "Alfresco", "Patio"],
      material: ["Colorbond", "Tile", "Brick", "Concrete", "Exposed aggregate", "Paver", "Stone", "Timber", "Aluminium"],
    },
  },
  {
    id: "cabinetry" satisfies SelectionTypeValue,
    label: "Cabinetry",
    categoryLabel: "Room",
    subcategoryLabel: "Cabinet",
    itemLabel: "Cabinet selection",
    options: {
      category: ["Kitchen", "Scullery", "Laundry", "Bathroom", "Ensuite", "Wardrobe", "Theatre", "Study"],
      subcategory: ["Base cabinets", "Overheads", "Island", "Tall cabinets", "Vanity", "Linen", "Walk-in robe", "Handles", "Benchtop", "Splashback"],
      material: ["Laminate", "Two-pack", "Timber veneer", "Stone", "Engineered stone", "Porcelain", "Acrylic", "Melamine"],
    },
  },
  {
    id: "appliance" satisfies SelectionTypeValue,
    label: "Appliance",
    categoryLabel: "Room",
    subcategoryLabel: "Appliance",
    itemLabel: "Appliance name",
    options: {
      category: ["Kitchen", "Scullery", "Laundry", "Alfresco", "Garage"],
      subcategory: ["Oven", "Cooktop", "Rangehood", "Dishwasher", "Fridge", "Microwave", "Washing machine", "Dryer", "BBQ"],
      material: ["Stainless steel", "Black glass", "White", "Integrated", "Panel-ready"],
    },
  },
  {
    id: "electrical" satisfies SelectionTypeValue,
    label: "Electrical",
    categoryLabel: "Room / zone",
    subcategoryLabel: "Fitting",
    itemLabel: "Electrical item",
    options: {
      category: ["Whole house", "Kitchen", "Living", "Bedrooms", "Bathrooms", "Theatre", "Exterior", "Garage", "Alfresco"],
      subcategory: ["Downlights", "Pendant", "Wall light", "Power point", "Switch", "Fan", "Data point", "Security", "Smart home"],
      material: ["White", "Black", "Brushed metal", "Chrome", "Brass", "Glass"],
    },
  },
  {
    id: "tapware" satisfies SelectionTypeValue,
    label: "Tapware",
    categoryLabel: "Room",
    subcategoryLabel: "Fitting",
    itemLabel: "Tapware item",
    options: {
      category: ["Kitchen", "Scullery", "Laundry", "Bathroom", "Ensuite", "Powder room", "Alfresco"],
      subcategory: ["Mixer", "Sink mixer", "Shower rail", "Shower head", "Bath spout", "Basin mixer", "Laundry mixer", "Outdoor tap"],
      material: ["Chrome", "Brushed nickel", "Matte black", "Brushed brass", "Gunmetal", "White"],
    },
  },
  {
    id: "other" satisfies SelectionTypeValue,
    label: "Other",
    categoryLabel: "Category",
    subcategoryLabel: "Detail",
    itemLabel: "Selection name",
    options: {
      category: ["Hardware", "Fixtures", "Furniture", "Landscape", "Window treatments", "Decor", "Other"],
      subcategory: ["Handle", "Hinge", "Door hardware", "Mirror", "Towel rail", "Toilet roll holder", "Blind", "Curtain"],
      material: ["Metal", "Timber", "Stone", "Glass", "Fabric", "Ceramic", "Composite"],
    },
  },
];

const BLANK: SelectionDraft = {
  id: "",
  selection_type: "colour",
  category: "",
  subcategory: "",
  location: "",
  room_id: "",
  item_name: "",
  material_type: "",
  brand: "",
  product_name: "",
  model: "",
  colour_name: "",
  code: "",
  finish: "",
  supplier: "",
  product_url: "",
  linked_image_id: null,
  image_path: null,
  imageUrl: null,
  notes: "",
  visibility: "public",
  imageFile: null,
  imagePreviewUrl: null,
};

export function SelectionsClient({
  build,
  user,
  initialSelections,
  initialRooms = [],
  imageOptions = [],
  showChrome = true,
}: {
  build: ManagedBuild;
  user: DashboardUser;
  initialSelections: EditableSelection[];
  initialRooms?: EditableRoom[];
  imageOptions?: SelectionImageOption[];
  showChrome?: boolean;
}) {
  const [selections, setSelections] = useState(initialSelections);
  const [draft, setDraft] = useState<SelectionDraft>(BLANK);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedSelectionIds, setExpandedSelectionIds] = useState<Set<string>>(new Set());
  const [columnCount, setColumnCount] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const rooms = initialRooms;
  const roomNames = useMemo(() => new Map(rooms.map((room) => [room.id, room.name])), [rooms]);
  const roomFilterOptions = useMemo(() => {
    return [
      { id: "unassigned", label: "Unassigned", count: selections.filter((selection) => !selection.room_id).length },
      ...rooms.map((room) => ({
        id: room.id,
        label: room.name,
        count: selections.filter((selection) => selection.room_id === room.id).length,
      })),
    ];
  }, [rooms, selections]);
  const typeFilterOptions = useMemo(() => {
    return SELECTION_TYPES.map((type) => ({
      id: type.id,
      label: type.label,
      count: selections.filter((selection) => selection.selection_type === type.id).length,
    }));
  }, [selections]);
  const filteredSelections = selections.filter((selection) => {
    const roomMatch =
      selectedRoomIds.length === 0 ||
      (selectedRoomIds.includes("unassigned") && !selection.room_id) ||
      Boolean(selection.room_id && selectedRoomIds.includes(selection.room_id));
    const typeMatch = selectedTypeIds.length === 0 || Boolean(selection.selection_type && selectedTypeIds.includes(selection.selection_type));
    return roomMatch && typeMatch;
  });
  const paginatedSelections = pageItems(filteredSelections, currentPage);
  const selectionColumns = useMemo(() => {
    const columns = Array.from({ length: columnCount }, () => [] as EditableSelection[]);
    paginatedSelections.items.forEach((selection, index) => columns[index % columnCount].push(selection));
    return columns;
  }, [columnCount, paginatedSelections.items]);

  useEffect(() => {
    const updateColumnCount = () => {
      if (window.innerWidth < 560) setColumnCount(1);
      else if (window.innerWidth < 820) setColumnCount(2);
      else if (window.innerWidth < 1040) setColumnCount(3);
      else if (window.innerWidth < 1280) setColumnCount(4);
      else setColumnCount(5);
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedSelectionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveSelection = async (selection: SelectionDraft) => {
    const key = selection.id || "new";
    setSavingId(key);
    setError("");
    const formData = new FormData();
    formData.set("build_id", build.id);
    for (const keyName of [
      "selection_type",
      "category",
      "subcategory",
      "location",
      "room_id",
      "item_name",
      "material_type",
      "brand",
      "product_name",
      "model",
      "colour_name",
      "code",
      "finish",
      "supplier",
      "product_url",
      "notes",
      "visibility",
    ] as const) {
      formData.set(keyName, String(selection[keyName] ?? ""));
    }
    formData.set("image_id", selection.linked_image_id ?? "");
    if (selection.imageFile) formData.set("image", selection.imageFile);

    const response = await fetch(selection.id ? `/api/selections/${selection.id}` : "/api/selections", {
      method: selection.id ? "PATCH" : "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    setSavingId(null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save selection.");
      return;
    }
    const saved = payload.selection as EditableSelection;
    const linkedImageUrl = selection.linked_image_id ? imageOptions.find((image) => image.id === selection.linked_image_id)?.imageUrl ?? null : null;
    const imageUrl = selection.imagePreviewUrl ?? linkedImageUrl ?? selection.imageUrl ?? saved.imageUrl ?? null;
    if (selection.id) {
      setSelections((current) => current.map((item) => (item.id === selection.id ? { ...saved, imageUrl } : item)));
      setEditingId(null);
      setSelectionModalOpen(false);
    } else {
      setSelections((current) => [{ ...saved, imageUrl }, ...current]);
      setCurrentPage(1);
      const defaultRoomId = selectedRoomIds.length === 1 && selectedRoomIds[0] !== "unassigned" ? selectedRoomIds[0] : "";
      setDraft({ ...BLANK, room_id: defaultRoomId });
      setSelectionModalOpen(false);
    }
  };

  const removeSelection = async (id: string) => {
    const response = await fetch(`/api/selections/${id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to delete selection.");
      return;
    }
    setSelections((current) => current.filter((selection) => selection.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const beginEdit = (selection: EditableSelection) => {
    setEditingId(selection.id);
    setDraft({ ...BLANK, ...selection, imageFile: null, imagePreviewUrl: null });
    setSelectionModalOpen(true);
  };

  const beginAdd = (selectionType: string) => {
    const defaultRoomId = selectedRoomIds.length === 1 && selectedRoomIds[0] !== "unassigned" ? selectedRoomIds[0] : "";
    setDraft({
      ...BLANK,
      selection_type: selectionType,
      room_id: defaultRoomId,
    });
    setEditingId(null);
    setAddMenuOpen(false);
    setSelectionModalOpen(true);
  };

  const closeSelectionModal = () => {
    setEditingId(null);
    setSelectionModalOpen(false);
    const defaultRoomId = selectedRoomIds.length === 1 && selectedRoomIds[0] !== "unassigned" ? selectedRoomIds[0] : "";
    setDraft({ ...BLANK, room_id: defaultRoomId });
  };

  const content = (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Selections</h1>
          <p className="dashboard-subtitle">{build.title}</p>
        </div>
        <div className="selection-add-menu">
          <button className="btn btn-primary" type="button" aria-expanded={addMenuOpen} onClick={() => setAddMenuOpen((open) => !open)}>
            <IconPlus size={14} /> Add selection <IconChevronDown size={14} />
          </button>
          {addMenuOpen ? (
            <div className="selection-add-menu-list selection-add-menu-list-right">
              {SELECTION_TYPES.map((type) => (
                <button key={type.id} type="button" onClick={() => beginAdd(type.id)}>
                  {type.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {error ? <div className="alert alert-error mb-4">{error}</div> : null}

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
            <MultiSelectFilter
              label="Selection type"
              allLabel="All types"
              options={typeFilterOptions}
              selectedIds={selectedTypeIds}
              onChange={(ids) => {
                setSelectedTypeIds(ids);
                setCurrentPage(1);
              }}
            />
          </div>

        </aside>

        <div className="selection-main">
          {selectionModalOpen ? (
            <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="selection-modal-title">
              <button className="bb-modal-backdrop" type="button" aria-label="Close selection form" onClick={closeSelectionModal} />
              <section className="bb-modal-panel selection-modal-panel">
                <SelectionForm
                  buildRooms={rooms}
                  draft={draft}
                  editing={Boolean(editingId)}
                  imageOptions={imageOptions}
                  saving={savingId === (draft.id || "new")}
                  onCancel={closeSelectionModal}
                  onChange={setDraft}
                  onSave={() => saveSelection(draft)}
                />
              </section>
            </div>
          ) : null}

          {filteredSelections.length ? (
            <>
              <div className="selection-masonry-grid" style={{ "--selection-column-count": columnCount } as CSSProperties}>
                {selectionColumns.map((column, columnIndex) => (
                  <div key={columnIndex} className="management-image-column">
                    {column.map((selection) => (
                      <SelectionCard
                        key={selection.id}
                        expanded={expandedSelectionIds.has(selection.id)}
                        roomName={selection.room_id ? roomNames.get(selection.room_id) ?? null : null}
                        selection={selection}
                        onDelete={() => removeSelection(selection.id)}
                        onEdit={() => beginEdit(selection)}
                        onToggle={() => toggleExpanded(selection.id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <PaginationControls
                currentPage={paginatedSelections.currentPage}
                pageCount={paginatedSelections.pageCount}
                totalCount={filteredSelections.length}
                onPageChange={setCurrentPage}
              />
            </>
          ) : (
            <div className="empty-state">
              <IconPhoto size={32} />
              <h3 className="empty-state-title">No selections here yet</h3>
              <p className="empty-state-sub">Add a selection or choose another room.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!showChrome) return content;

  return (
    <div className="dashboard-page">
      <Nav user={user} />
      <main className="dashboard-container-wide">{content}</main>
    </div>
  );
}

function MultiSelectFilter({
  label,
  allLabel,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: { id: string; label: string; count: number }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const summary = selectedIds.length === 0
    ? allLabel
    : selectedIds.length === 1
      ? options.find((option) => option.id === selectedIds[0])?.label ?? "1 selected"
      : `${selectedIds.length} selected`;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <div ref={rootRef} className="multi-select-filter">
      <div className="section-label">{label}</div>
      <button className={`multi-select-trigger ${open ? "multi-select-trigger-open" : ""}`} type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span>{summary}</span>
        <IconChevronDown size={14} />
      </button>

      {selectedIds.length ? (
        <div className="multi-select-chips">
          {selectedIds.map((id) => {
            const option = options.find((item) => item.id === id);
            if (!option) return null;
            return (
              <button key={id} type="button" className="multi-select-chip" onClick={() => toggle(id)}>
                {option.label}
                <IconX size={11} />
              </button>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div className="multi-select-menu">
          <div className="multi-select-search">
            <IconSearch size={13} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} />
          </div>
          <div className="multi-select-options">
            <button className="multi-select-option" type="button" onClick={() => onChange([])}>
              <span className={`multi-select-check ${selectedIds.length === 0 ? "multi-select-check-active" : ""}`}>
                {selectedIds.length === 0 ? <IconCheck size={12} /> : null}
              </span>
              <span>{allLabel}</span>
              <span className="multi-select-count">{options.reduce((total, option) => total + option.count, 0)}</span>
            </button>
            {filteredOptions.map((option) => (
              <button key={option.id} className="multi-select-option" type="button" onClick={() => toggle(option.id)}>
                <span className={`multi-select-check ${selected.has(option.id) ? "multi-select-check-active" : ""}`}>
                  {selected.has(option.id) ? <IconCheck size={12} /> : null}
                </span>
                <span>{option.label}</span>
                <span className="multi-select-count">{option.count}</span>
              </button>
            ))}
            {filteredOptions.length === 0 ? <div className="searchable-select-empty">No options found</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectionForm({
  buildRooms,
  draft,
  editing,
  imageOptions,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  buildRooms: EditableRoom[];
  draft: SelectionDraft;
  editing: boolean;
  imageOptions: SelectionImageOption[];
  saving?: boolean;
  onChange: (selection: SelectionDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const type = SELECTION_TYPES.find((item) => item.id === draft.selection_type) ?? SELECTION_TYPES[0];
  const set = (key: keyof SelectionDraft, value: string) => onChange({ ...draft, [key]: value });
  const canSave = Boolean((draft.item_name || draft.product_name || draft.colour_name || draft.category || "").trim());

  const handleImage = (file: File | null) => {
    if (!file) return;
    onChange({ ...draft, linked_image_id: null, imageFile: file, imagePreviewUrl: URL.createObjectURL(file) });
  };

  const selectLinkedImage = (image: SelectionImageOption) => {
    onChange({ ...draft, linked_image_id: image.id, imageUrl: image.imageUrl, imageFile: null, imagePreviewUrl: null });
  };

  return (
    <section className="selection-editor">
      <div className="card-body">
        <div className="selection-editor-head">
          <div>
            <div className="section-label">{editing ? "Edit selection" : "Add selection"}</div>
            <h2 id="selection-modal-title" className="selection-editor-title">{type.label}</h2>
          </div>
          <button className="btn-icon" type="button" aria-label="Close selection form" onClick={onCancel}>
            <IconX size={15} />
          </button>
        </div>

        <div className="form-grid-2">
          <SearchableSelect label={type.categoryLabel} value={draft.category ?? ""} onChange={(value) => set("category", value)} options={type.options.category} />
          <SearchableSelect label={type.subcategoryLabel} value={draft.subcategory ?? ""} onChange={(value) => set("subcategory", value)} options={type.options.subcategory} />
          <Select label="Room" value={draft.room_id ?? ""} onChange={(value) => set("room_id", value)} options={[{ id: "", title: "No room" }, ...buildRooms.map((room) => ({ id: room.id, title: room.name }))]} />
          <Input label={type.itemLabel} value={draft.item_name ?? ""} onChange={(value) => set("item_name", value)} />
          <SearchableSelect label="Material / product type" value={draft.material_type ?? ""} onChange={(value) => set("material_type", value)} options={type.options.material} />
          <Input label="Brand" value={draft.brand ?? ""} onChange={(value) => set("brand", value)} />
          <Input label="Product name" value={draft.product_name ?? ""} onChange={(value) => set("product_name", value)} />
          <Input label="Model / code" value={draft.model ?? ""} onChange={(value) => set("model", value)} />
          <Input label="Colour" value={draft.colour_name ?? ""} onChange={(value) => set("colour_name", value)} />
          <Input label="Colour / supplier code" value={draft.code ?? ""} onChange={(value) => set("code", value)} />
          <Input label="Finish" value={draft.finish ?? ""} onChange={(value) => set("finish", value)} />
          <Input label="Supplier" value={draft.supplier ?? ""} onChange={(value) => set("supplier", value)} />
          <Input label="Source link" value={draft.product_url ?? ""} onChange={(value) => set("product_url", value)} placeholder="https://" />
          <Select label="Visibility" value={draft.visibility ?? "public"} onChange={(value) => set("visibility", value)} options={VISIBILITY_OPTIONS.map((value) => ({ id: value, title: titleCase(value) }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={draft.notes ?? ""} onChange={(event) => set("notes", event.target.value)} placeholder="Why you chose it, upgrade notes, install notes, or alternatives." />
        </div>

        <div className="selection-image-row">
          {(draft.imagePreviewUrl || draft.imageUrl) ? (
            <div className="selection-image-preview">
              {/* Local object URLs and signed URLs should render as native images. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.imagePreviewUrl || draft.imageUrl || ""} alt="" />
            </div>
          ) : null}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => handleImage(event.target.files?.[0] ?? null)} />
          <button className="image-upload-zone selection-upload-zone" type="button" onClick={() => fileRef.current?.click()}>
            <IconPhoto size={20} />
            <span>{draft.imagePreviewUrl || draft.imageUrl ? "Replace image" : "Add optional image"}</span>
          </button>
        </div>

        {imageOptions.length ? (
          <div className="selection-linked-images">
            <div className="section-label">Or use an image already uploaded to this build</div>
            <div className="selection-linked-image-grid">
              {imageOptions.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  className={`selection-linked-image ${draft.linked_image_id === image.id ? "selection-linked-image-active" : ""}`}
                  onClick={() => selectLinkedImage(image)}
                  aria-label={`Use image ${image.label}`}
                >
                  {image.imageUrl ? (
                    <>
                      {/* Signed Supabase URLs should render as native images. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.imageUrl} alt="" />
                    </>
                  ) : (
                    <IconPhoto size={18} />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="dashboard-actions justify-end">
          {editing ? <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel}>Cancel</button> : null}
          <LoadingButton className="btn btn-primary btn-sm" loading={saving} disabled={!canSave} onClick={onSave}>
            <IconPlus size={13} /> {editing ? "Save selection" : "Add selection"}
          </LoadingButton>
        </div>
      </div>
    </section>
  );
}

function SelectionCard({
  selection,
  roomName,
  expanded,
  onEdit,
  onDelete,
  onToggle,
}: {
  selection: EditableSelection;
  roomName: string | null;
  expanded: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const type = SELECTION_TYPES.find((item) => item.id === selection.selection_type);
  const typeLabel = type?.label ?? selection.selection_type ?? "Selection";
  const badgeLabel = selection.material_type || selection.subcategory || selection.category || typeLabel;
  const colourName = selection.colour_name || selection.item_name || selection.product_name || selection.category || "Selection";
  const visualLabel = selection.colour_name || selection.material_type || selection.subcategory || type?.label || "Selection";
  const imageUrl = selection.imageUrl || null;
  const areaPartMaterial = [selection.category, selection.subcategory, selection.material_type].filter(Boolean).join(" / ");
  const details = [
    { label: "Brand / Area / Part / Material", value: [selection.brand, areaPartMaterial].filter(Boolean).join(" / ") },
    { label: "Room", value: roomName },
    { label: "Item", value: selection.item_name || selection.product_name },
    { label: "Model", value: selection.model },
    { label: "Code", value: selection.code },
    { label: "Supplier", value: selection.supplier },
    { label: "Visibility", value: selection.visibility ?? "public" },
    { label: "Notes", value: selection.notes },
  ].filter((item) => item.value);

  return (
    <article className="card management-image-card selection-card">
      <div className={`management-image-media selection-card-image ${imageUrl ? "selection-card-image-uploaded" : "selection-card-image-placeholder"}`}>
        {roomName ? <span className="selection-card-room-badge">{roomName}</span> : null}
        {imageUrl ? (
          <>
          {/* Signed Supabase URLs should render as native images. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" />
          </>
        ) : (
          <div className="selection-card-visual">
            <div className="selection-card-visual-mark">
              <IconPhoto size={22} />
            </div>
            <span>{visualLabel}</span>
          </div>
        )}
      </div>
      <div className="management-image-body">
        <button className="management-image-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
          <span className="management-image-copy">
            <span className="selection-card-topline">
              <span className="badge badge-phase">{badgeLabel}</span>
            </span>
            <span className="selection-card-title">{colourName}</span>
            {selection.finish ? <span className="selection-card-detail">{selection.finish}</span> : null}
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
            {selection.product_url ? (
              <a className="directory-link" href={selection.product_url} target="_blank" rel="noreferrer">
                Source link
              </a>
            ) : null}
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

function titleCase(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
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
