"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/Nav";
import { ConfirmDeleteButton, LoadingButton } from "@/components/action-buttons";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { SearchableSelect } from "@/components/SearchableSelect";
import { IconCheck, IconChevronDown, IconFilter, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import type { DashboardUser, ManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";
import type { EditableRoom } from "@/app/dashboard/builds/[buildId]/selections/selections-client";

const ROOM_TYPE_OPTIONS = ["Kitchen", "Scullery", "Laundry", "Bathroom", "Ensuite", "Powder room", "Bedroom", "Living", "Theatre", "Study", "Office", "Alfresco", "Garage", "Exterior", "Whole house"];
const LEVEL_OPTIONS = ["Ground floor", "First floor", "Second floor", "Basement", "External"];
const TILE_PAGE_SIZE = 18;

// Keys are lowercase with underscores — normalise room_type before lookup
const ROOM_ICONS: Record<string, string> = {
  kitchen: "/icons/kitchen.svg",
  scullery: "/icons/scullery.svg",
  pantry: "/icons/pantry.svg",
  laundry: "/icons/laundry.svg",
  bathroom: "/icons/bathroom.svg",
  ensuite: "/icons/bathroom.svg",
  powder_room: "/icons/toilet.svg",
  toilet: "/icons/toilet.svg",
  bedroom: "/icons/bedroom.svg",
  living: "/icons/livingroom.svg",
  dining: "/icons/diningroom.svg",
  dining_room: "/icons/diningroom.svg",
  theatre: "/icons/theatre.svg",
  study: "/icons/office.svg",
  office: "/icons/office.svg",
  games: "/icons/games.svg",
  alfresco: "/icons/alfresco.svg",
  garage: "/icons/car.svg",
  exterior: "/icons/house.svg",
  whole_house: "/icons/house.svg",
  walk_in_robe: "/icons/walkinrobe.svg",
  walkinrobe: "/icons/walkinrobe.svg",
  closet: "/icons/closet.svg",
  hallway: "/icons/hallway.svg",
  foyer: "/icons/foyer.svg",
};

function normaliseKey(roomType: string | null | undefined): string {
  return (roomType ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

function formatLabel(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Not set";
}

function roomIcon(roomType: string | null | undefined): string {
  return ROOM_ICONS[normaliseKey(roomType)] ?? "/icons/house.svg";
}

const ROOM_BG: Record<string, string> = {
  bedroom:       "linear-gradient(135deg, #8b82c8 0%, #635ab0 100%)",
  walk_in_robe:  "linear-gradient(135deg, #b882c8 0%, #8a5ab0 100%)",
  walkinrobe:    "linear-gradient(135deg, #b882c8 0%, #8a5ab0 100%)",
  closet:        "linear-gradient(135deg, #b882c8 0%, #8a5ab0 100%)",
  kitchen:       "linear-gradient(135deg, #c4956a 0%, #8b6347 100%)",
  scullery:      "linear-gradient(135deg, #c4956a 0%, #8b6347 100%)",
  pantry:        "linear-gradient(135deg, #d4a574 0%, #b07840 100%)",
  dining:        "linear-gradient(135deg, #d4a574 0%, #b07840 100%)",
  dining_room:   "linear-gradient(135deg, #d4a574 0%, #b07840 100%)",
  bathroom:      "linear-gradient(135deg, #5ba8a0 0%, #3a8880 100%)",
  ensuite:       "linear-gradient(135deg, #5ba8a0 0%, #3a8880 100%)",
  powder_room:   "linear-gradient(135deg, #5ba8a0 0%, #3a8880 100%)",
  toilet:        "linear-gradient(135deg, #5ba8a0 0%, #3a8880 100%)",
  living:        "linear-gradient(135deg, #7baa7b 0%, #528252 100%)",
  theatre:       "linear-gradient(135deg, #4a6898 0%, #2a4878 100%)",
  games:         "linear-gradient(135deg, #4a6898 0%, #2a4878 100%)",
  study:         "linear-gradient(135deg, #5a7898 0%, #3a5878 100%)",
  office:        "linear-gradient(135deg, #5a7898 0%, #3a5878 100%)",
  laundry:       "linear-gradient(135deg, #5a8ab5 0%, #3a6a95 100%)",
  hallway:       "linear-gradient(135deg, #a09878 0%, #706858 100%)",
  foyer:         "linear-gradient(135deg, #a09878 0%, #706858 100%)",
  alfresco:      "linear-gradient(135deg, #7aa878 0%, #529052 100%)",
  garage:        "linear-gradient(135deg, #808888 0%, #506060 100%)",
  exterior:      "linear-gradient(135deg, #808888 0%, #506060 100%)",
  whole_house:   "linear-gradient(135deg, #c4956a 0%, #8b6347 100%)",
};

function roomBgStyle(roomType: string | null | undefined): React.CSSProperties {
  return { background: ROOM_BG[normaliseKey(roomType)] ?? "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)" };
}

type RoomDraft = { id: string; name: string; room_type: string; level: string; notes: string };
const BLANK: RoomDraft = { id: "", name: "", room_type: "", level: "", notes: "" };

export function RoomsClient({
  build,
  user,
  rooms,
  onRoomsChange,
  showChrome = true,
}: {
  build: ManagedBuild;
  user: DashboardUser;
  rooms: EditableRoom[];
  onRoomsChange: (rooms: EditableRoom[]) => void;
  showChrome?: boolean;
}) {
  const [draft, setDraft] = useState<RoomDraft>(BLANK);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = selectedTypes.length + selectedLevels.length;
  const clearFilters = () => { setSelectedTypes([]); setSelectedLevels([]); };

  const openAdd = () => { setDraft(BLANK); setModalOpen(true); };
  const openEdit = (room: EditableRoom) => {
    setDraft({ id: room.id, name: room.name, room_type: room.room_type ?? "", level: room.level ?? "", notes: room.notes ?? "" });
    setModalOpen(true);
  };

  const saveRoom = async () => {
    const name = draft.name.trim();
    if (!name) { setError("Room name is required."); return; }
    setSaving(true); setError("");
    const response = await fetch(draft.id ? `/api/rooms/${draft.id}` : "/api/rooms", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build_id: build.id, name, room_type: draft.room_type, level: draft.level, notes: draft.notes }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) { setError(payload?.error ?? "Unable to save room."); return; }
    const saved = payload.room as EditableRoom;
    onRoomsChange(draft.id ? rooms.map((r) => (r.id === draft.id ? saved : r)) : [...rooms, saved]);
    setModalOpen(false); setDraft(BLANK);
  };

  const deleteRoom = async (id: string) => {
    const response = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setError(payload?.error ?? "Unable to delete room."); return; }
    onRoomsChange(rooms.filter((r) => r.id !== id));
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((c) => { const next = new Set(c); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    rooms.forEach((r) => { const t = r.room_type ?? "Other"; counts.set(t, (counts.get(t) ?? 0) + 1); });
    return [...counts.entries()].map(([id, count]) => ({ id, label: formatLabel(id), count }));
  }, [rooms]);

  const levelOptions = useMemo(() => {
    const counts = new Map<string, number>();
    rooms.forEach((r) => { const l = r.level ?? "Not set"; counts.set(l, (counts.get(l) ?? 0) + 1); });
    return [...counts.entries()].map(([id, count]) => ({ id, label: formatLabel(id), count }));
  }, [rooms]);

  const filtered = useMemo(() => {
    setCurrentPage(1);
    return rooms.filter((r) => {
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(r.room_type ?? "Other");
      const levelMatch = selectedLevels.length === 0 || selectedLevels.includes(r.level ?? "Not set");
      return typeMatch && levelMatch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, selectedTypes, selectedLevels]);

  const paginated = pageItems(filtered, currentPage, TILE_PAGE_SIZE);

  const content = (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Rooms</h1>
          <p className="dashboard-subtitle">{build.title}</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openAdd}>
          <IconPlus size={14} /> Add room
        </button>
      </div>

      {error ? <div className="alert alert-error mb-4">{error}</div> : null}

      {rooms.length > 0 ? (
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
                    <MultiSelectFilter label="Room type" allLabel="All types" options={typeOptions} selectedIds={selectedTypes} onChange={setSelectedTypes} />
                    <MultiSelectFilter label="Level" allLabel="All levels" options={levelOptions} selectedIds={selectedLevels} onChange={setSelectedLevels} />
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
              <MultiSelectFilter label="Room type" allLabel="All types" options={typeOptions} selectedIds={selectedTypes} onChange={setSelectedTypes} />
              <MultiSelectFilter label="Level" allLabel="All levels" options={levelOptions} selectedIds={selectedLevels} onChange={setSelectedLevels} />
            </div>
          </aside>
          <div className="selection-main">
            {paginated.items.length > 0 ? (
              <>
                <div className="icon-tile-grid">
                  {paginated.items.map((room) => (
                    <RoomTile
                      key={room.id}
                      room={room}
                      expanded={expandedIds.has(room.id)}
                      onToggle={() => toggleExpanded(room.id)}
                      onEdit={() => openEdit(room)}
                      onDelete={() => deleteRoom(room.id)}
                    />
                  ))}
                </div>
                <PaginationControls
                  currentPage={paginated.currentPage}
                  pageCount={paginated.pageCount}
                  totalCount={filtered.length}
                  onPageChange={setCurrentPage}
                  pageSize={TILE_PAGE_SIZE}
                />
              </>
            ) : (
              <div className="empty-state">
                <h3 className="empty-state-title">No rooms match those filters</h3>
                <p className="empty-state-sub">Adjust the filters to show more rooms.</p>
              </div>
            )}
          </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/house.svg" alt="" style={{ width: 32, height: 32, opacity: 0.35 }} />
          <h3 className="empty-state-title">No rooms yet</h3>
          <p className="empty-state-sub">Add rooms so updates and selections can be grouped properly.</p>
        </div>
      )}

      {modalOpen ? (
        <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="room-modal-title">
          <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={() => setModalOpen(false)} />
          <section className="bb-modal-panel">
            <div className="bb-modal-header">
              <div>
                <h2 id="room-modal-title" className="dashboard-title">{draft.id ? "Edit room" : "Add room"}</h2>
                <p className="dashboard-subtitle">Manage how this room is labelled and organised.</p>
              </div>
              <button className="btn-icon" type="button" aria-label="Close" onClick={() => setModalOpen(false)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="bb-modal-body">
              <div className="form-group">
                <label className="form-label">Room name</label>
                <input className="form-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="form-grid-2">
                <SearchableSelect label="Room type" value={draft.room_type} onChange={(value) => setDraft((d) => ({ ...d, room_type: value }))} options={ROOM_TYPE_OPTIONS} />
                <SearchableSelect label="Level" value={draft.level} onChange={(value) => setDraft((d) => ({ ...d, level: value }))} options={LEVEL_OPTIONS} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
              </div>
            </div>
            <div className="bb-modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              <LoadingButton className="btn btn-primary" loading={saving} onClick={saveRoom}>
                {draft.id ? "Save room" : "Add room"}
              </LoadingButton>
            </div>
          </section>
        </div>
      ) : null}
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

function RoomTile({ room, expanded, onToggle, onEdit, onDelete }: { room: EditableRoom; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const icon = roomIcon(room.room_type);
  const details = [
    { label: "Type", value: formatLabel(room.room_type) },
    { label: "Level", value: formatLabel(room.level) },
    { label: "Notes", value: room.notes || "None" },
  ];
  return (
    <article className="card management-image-card selection-card">
      <div className="management-image-media selection-card-image">
        <div className="tile-icon-bg" style={roomBgStyle(room.room_type)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt={room.room_type ?? "Room"} className="tile-icon" />
        </div>
      </div>
      <div className="management-image-body">
        <button className="management-image-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
          <span className="management-image-copy">
            <span className="selection-card-topline">
              <span className="badge badge-phase">{formatLabel(room.room_type) || "Room"}</span>
            </span>
            <span className="selection-card-title">{room.name}</span>
            {room.level ? <span className="selection-card-detail">{formatLabel(room.level)}</span> : null}
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
              <ConfirmDeleteButton iconOnly onConfirm={onDelete} />
            </div>
          </div>
        ) : null}
      </div>
    </article>
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
  const filteredOptions = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const summary = selectedIds.length === 0 ? allLabel : selectedIds.length === 1 ? (options.find((o) => o.id === selectedIds[0])?.label ?? "1 selected") : `${selectedIds.length} selected`;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <div ref={rootRef} className="multi-select-filter">
      <div className="section-label">{label}</div>
      <button className={`multi-select-trigger ${open ? "multi-select-trigger-open" : ""}`} type="button" onClick={() => setOpen((c) => !c)} aria-expanded={open}>
        <span>{summary}</span>
        <IconChevronDown size={14} />
      </button>
      {selectedIds.length > 0 ? (
        <div className="multi-select-chips">
          {selectedIds.map((id) => {
            const option = options.find((o) => o.id === id);
            if (!option) return null;
            return (
              <button key={id} type="button" className="multi-select-chip" onClick={() => toggle(id)}>
                {option.label} <IconX size={11} />
              </button>
            );
          })}
        </div>
      ) : null}
      {open ? (
        <div className="multi-select-menu">
          <div className="multi-select-search">
            <IconSearch size={13} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} />
          </div>
          <div className="multi-select-options">
            <button className="multi-select-option" type="button" onClick={() => onChange([])}>
              <span className={`multi-select-check ${selectedIds.length === 0 ? "multi-select-check-active" : ""}`}>
                {selectedIds.length === 0 ? <IconCheck size={12} /> : null}
              </span>
              <span>{allLabel}</span>
              <span className="multi-select-count">{options.reduce((s, o) => s + o.count, 0)}</span>
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
