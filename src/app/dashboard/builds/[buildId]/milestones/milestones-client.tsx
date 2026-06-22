"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/components/Nav";
import { ConfirmDeleteButton, LoadingButton } from "@/components/action-buttons";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { IconCheck, IconChevronDown, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import type { DashboardUser, ManagedBuild } from "@/app/dashboard/builds/[buildId]/management-data";
import { MILESTONE_CATEGORIES } from "@/lib/milestone-categories";

export type EditableMilestone = {
  id: string;
  title: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  visibility: string | null;
  sort_order: number | null;
  milestone_categories: string[] | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "private", label: "Private" },
];

const BLANK: EditableMilestone = { id: "", title: "", status: "pending", start_date: "", end_date: "", visibility: "public", sort_order: 0, milestone_categories: [] };
const TILE_PAGE_SIZE = 18;

function statusIcon(status: string | null | undefined) {
  if (status === "active") return "/icons/flag.svg";
  if (status === "complete") return "/icons/flag.svg";
  return "/icons/time.svg";
}

function statusBgClass(status: string | null | undefined) {
  if (status === "complete") return "tile-icon-bg tile-icon-bg-complete";
  if (status === "active") return "tile-icon-bg tile-icon-bg-active";
  return "tile-icon-bg tile-icon-bg-pending";
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "complete") return "badge-complete";
  if (status === "active") return "badge-active";
  return "badge-phase";
}

function labelFor(options: { value: string; label: string }[], value: string | null | undefined) {
  return options.find((o) => o.value === value)?.label ?? "Pending";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function sortMilestones(a: EditableMilestone, b: EditableMilestone) {
  return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
}

export function MilestonesClient({
  build,
  user,
  initialMilestones,
  showChrome = true,
  onMilestonesChange,
}: {
  build: ManagedBuild;
  user: DashboardUser;
  initialMilestones: EditableMilestone[];
  showChrome?: boolean;
  onMilestonesChange?: (milestones: EditableMilestone[]) => void;
}) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const notify = (next: EditableMilestone[]) => { onMilestonesChange?.(next); };
  const [draft, setDraft] = useState<EditableMilestone | null>(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedVisibilities, setSelectedVisibilities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const openNew = () => {
    const nextOrder = milestones.reduce((max, m) => Math.max(max, Number(m.sort_order ?? 0)), -1) + 1;
    setDraft({ ...BLANK, sort_order: nextOrder });
  };
  const openEdit = (m: EditableMilestone) => setDraft({ ...m, status: m.status || "pending", visibility: m.visibility || "public", start_date: m.start_date || "", end_date: m.end_date || "", milestone_categories: m.milestone_categories ?? [] });
  const closeModal = () => { if (!savingId) setDraft(null); };

  const save = async () => {
    if (!draft?.title.trim()) return;
    const key = draft.id || "new";
    setSavingId(key); setError("");
    const body = { build_id: build.id, title: draft.title.trim(), status: draft.status || "pending", visibility: draft.visibility || "public", sort_order: Number(draft.sort_order ?? milestones.length), start_date: draft.start_date || null, end_date: draft.end_date || null, milestone_categories: draft.milestone_categories ?? [] };
    const response = await fetch(draft.id ? `/api/milestones/${draft.id}` : "/api/milestones", { method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => null);
    setSavingId(null);
    if (!response.ok) { setError(payload?.error ?? "Unable to save milestone."); return; }
    if (draft.id) {
      setMilestones((c) => { const next = c.map((m) => (m.id === draft.id ? payload.milestone : m)); notify(next); return next; });
    } else {
      setMilestones((c) => { const next = [...c, payload.milestone].sort(sortMilestones); notify(next); return next; });
      setCurrentPage(1);
    }
    setDraft(null);
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setError(payload?.error ?? "Unable to delete milestone."); return; }
    setMilestones((c) => { const next = c.filter((m) => m.id !== id); notify(next); return next; });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((c) => { const next = new Set(c); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const sorted = useMemo(() => [...milestones].sort(sortMilestones), [milestones]);

  const statusFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    milestones.forEach((m) => { const s = m.status ?? "pending"; counts.set(s, (counts.get(s) ?? 0) + 1); });
    return [...counts.entries()].map(([id, count]) => ({ id, label: labelFor(STATUS_OPTIONS, id), count }));
  }, [milestones]);

  const visibilityFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    milestones.forEach((m) => { const v = m.visibility ?? "public"; counts.set(v, (counts.get(v) ?? 0) + 1); });
    return [...counts.entries()].map(([id, count]) => ({ id, label: labelFor(VISIBILITY_OPTIONS, id), count }));
  }, [milestones]);

  const filtered = useMemo(() => {
    setCurrentPage(1);
    return sorted.filter((m) => {
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(m.status ?? "pending");
      const visMatch = selectedVisibilities.length === 0 || selectedVisibilities.includes(m.visibility ?? "public");
      return statusMatch && visMatch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, selectedStatuses, selectedVisibilities]);

  const paginated = pageItems(filtered, currentPage, TILE_PAGE_SIZE);

  const content = (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Milestones</h1>
          <p className="dashboard-subtitle">{build.title}</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openNew}>
          <IconPlus size={14} /> Add milestone
        </button>
      </div>

      {error ? <div className="alert alert-error mb-4">{error}</div> : null}

      {milestones.length > 0 ? (
        <div className="selection-workspace">
          <aside className="selection-sidebar">
            <div className="selection-side-section">
              <MultiSelectFilter label="Status" allLabel="All statuses" options={statusFilterOptions} selectedIds={selectedStatuses} onChange={setSelectedStatuses} />
              <MultiSelectFilter label="Visibility" allLabel="All" options={visibilityFilterOptions} selectedIds={selectedVisibilities} onChange={setSelectedVisibilities} />
            </div>
          </aside>
          <div className="selection-main">
            {paginated.items.length > 0 ? (
              <>
                <div className="icon-tile-grid">
                  {paginated.items.map((m) => (
                    <MilestoneTile
                      key={m.id}
                      milestone={m}
                      expanded={expandedIds.has(m.id)}
                      onToggle={() => toggleExpanded(m.id)}
                      onEdit={() => openEdit(m)}
                      onDelete={() => remove(m.id)}
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
                <h3 className="empty-state-title">No milestones match those filters</h3>
                <p className="empty-state-sub">Adjust the filters to show more milestones.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/flag.svg" alt="" style={{ width: 32, height: 32, opacity: 0.35 }} />
          <h3 className="empty-state-title">No milestones yet</h3>
          <p className="empty-state-sub">Add milestones to start building the build timeline.</p>
        </div>
      )}

      {draft ? (
        <MilestoneModal
          milestone={draft}
          saving={savingId === (draft.id || "new")}
          onChange={setDraft}
          onClose={closeModal}
          onSave={save}
        />
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

function MilestoneTile({ milestone, expanded, onToggle, onEdit, onDelete }: { milestone: EditableMilestone; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const details = [
    { label: "Status", value: labelFor(STATUS_OPTIONS, milestone.status) },
    { label: "Visibility", value: labelFor(VISIBILITY_OPTIONS, milestone.visibility) },
    { label: "Start", value: formatDate(milestone.start_date) },
    { label: "End", value: formatDate(milestone.end_date) },
  ];
  return (
    <article className="card management-image-card selection-card">
      <div className="management-image-media selection-card-image">
        <div className={statusBgClass(milestone.status)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={statusIcon(milestone.status)} alt="" className="tile-icon" />
        </div>
      </div>
      <div className="management-image-body">
        <button className="management-image-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
          <span className="management-image-copy">
            <span className="selection-card-topline">
              <span className={`badge ${statusBadgeClass(milestone.status)}`}>{labelFor(STATUS_OPTIONS, milestone.status)}</span>
            </span>
            <span className="selection-card-title">{milestone.title}</span>
            {milestone.start_date ? <span className="selection-card-detail">{formatDate(milestone.start_date)}</span> : null}
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
            {(milestone.milestone_categories ?? []).length > 0 && (
              <div className="milestone-category-tags">
                {(milestone.milestone_categories ?? []).map((cat) => (
                  <span key={cat} className="badge badge-phase">{cat}</span>
                ))}
              </div>
            )}
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

function MilestoneModal({ milestone, saving, onChange, onClose, onSave }: { milestone: EditableMilestone; saving: boolean; onChange: (m: EditableMilestone) => void; onClose: () => void; onSave: () => void }) {
  const set = (key: keyof EditableMilestone, value: string) => onChange({ ...milestone, [key]: value });
  const selectedCategories = milestone.milestone_categories ?? [];

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    onChange({ ...milestone, milestone_categories: next });
  };

  return (
    <div className="bb-modal" role="dialog" aria-modal="true" aria-labelledby="milestone-modal-title">
      <button className="bb-modal-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <section className="bb-modal-panel">
        <div className="bb-modal-header">
          <div>
            <h2 id="milestone-modal-title" className="dashboard-title">{milestone.id ? "Edit milestone" : "Add milestone"}</h2>
            <p className="dashboard-subtitle">Manage the timeline entry shown on the build profile.</p>
          </div>
          <button className="btn-icon" type="button" aria-label="Close" onClick={onClose}><IconX size={16} /></button>
        </div>
        <div className="bb-modal-body">
          <div className="form-group">
            <label className="form-label">Milestone name</label>
            <input className="form-input" value={milestone.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={milestone.status ?? "pending"} onChange={(e) => set("status", e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visibility</label>
              <select className="form-select" value={milestone.visibility ?? "public"} onChange={(e) => set("visibility", e.target.value)}>
                {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start date</label>
              <input className="form-input" type="date" value={milestone.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End date</label>
              <input className="form-input" type="date" value={milestone.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Stage tags</label>
            <p className="form-hint">Tag this milestone with the stages it covers. Others can filter the discover page to find builds at similar stages.</p>
            <div className="milestone-category-picker">
              {MILESTONE_CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`milestone-category-chip${active ? " milestone-category-chip-active" : ""}`}
                    onClick={() => toggleCategory(cat)}
                  >
                    {active && <IconCheck size={11} />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="bb-modal-footer">
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Cancel</button>
          <LoadingButton className="btn btn-primary btn-sm" loading={saving} disabled={!milestone.title.trim()} onClick={onSave}>
            {milestone.id ? "Save milestone" : "Add milestone"}
          </LoadingButton>
        </div>
      </section>
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
