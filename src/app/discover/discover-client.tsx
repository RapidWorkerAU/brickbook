"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBuildingCommunity,
  IconFilter,
  IconHeart,
  IconMessageCircle,
  IconPhoto,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import type { InspirationImage, PublicBuildCard } from "@/lib/public-data";
import { MILESTONE_CATEGORIES } from "@/lib/milestone-categories";

type DiscoverMode = "builds" | "inspiration";

const PHASES = ["All", "Pre-construction", "Slab", "Frame", "Brickwork", "Roof", "Lock-up", "Fit-out", "Selections", "Handover", "Complete"];
const TYPES = ["All", "New build", "KDR", "Renovation", "Extension"];
const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "followers", label: "Most followed" },
  { value: "updates", label: "Most active" },
];
const INSPO_CATEGORIES = [
  "Flooring", "Walls & Ceiling", "Benchtops", "Cabinetry", "Splashback",
  "Lighting", "Tapware", "Appliances", "Tiles", "Doors & Windows",
  "Handles & Hardware", "Outdoor",
];

function formatRoomType(raw: string) {
  return raw.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function imageKindLabel(kind: string | null): { label: string; className: string } {
  if (kind === "inspiration") return { label: "Inspiration", className: "inspo-kind-badge inspo-kind-inspiration" };
  return { label: "Build photo", className: "inspo-kind-badge inspo-kind-build" };
}

function findMatchMeta(image: InspirationImage, query: string): string | null {
  if (!query) return null;
  const q = query.toLowerCase();
  for (const tag of image.tags) {
    const checks: [string, string | null][] = [
      ["Colour", tag.colourName], ["Item", tag.itemName], ["Brand", tag.brand],
      ["Product", tag.productName], ["Material", tag.materialType],
      ["Category", tag.category], ["Type", tag.subcategory],
    ];
    for (const [label, value] of checks) {
      if (value?.toLowerCase().includes(q)) return `${label} · ${value}`;
    }
  }
  if (image.buildTitle.toLowerCase().includes(q)) return `Build · ${image.buildTitle}`;
  if (image.notes?.toLowerCase().includes(q)) {
    const idx = image.notes.toLowerCase().indexOf(q);
    return `Notes · "${image.notes.slice(Math.max(0, idx - 8), idx + 40).trim()}"`;
  }
  return null;
}

export function DiscoverClient({
  initialBuilds,
  initialBuildsHasMore,
  initialInspirationImages,
  initialInspirationNextOffset,
  initialInspirationHasMore,
  inspoRooms,
  inspoStyles,
}: {
  initialBuilds: PublicBuildCard[];
  initialBuildsHasMore: boolean;
  initialInspirationImages: InspirationImage[];
  initialInspirationNextOffset: number;
  initialInspirationHasMore: boolean;
  inspoRooms: string[];
  inspoStyles: string[];
}) {
  const [mode, setMode] = useState<DiscoverMode>("builds");

  return (
    <div className="page-shell">
      <Nav />
      <header className="page-header">
        <div className="page-container">
          <h1 className="page-title">Discover</h1>
          <p className="page-subtitle">Browse builds and find inspiration from the Brickbook community</p>
          <div className="discover-modes">
            <button type="button" className={`discover-mode-card ${mode === "builds" ? "discover-mode-card-active" : ""}`} onClick={() => setMode("builds")}>
              <div className="discover-mode-icon"><IconBuildingCommunity size={22} /></div>
              <div className="discover-mode-text">
                <div className="discover-mode-title">Build Profiles</div>
                <div className="discover-mode-desc">Browse complete build journeys from real homebuilders</div>
              </div>
            </button>
            <button type="button" className={`discover-mode-card ${mode === "inspiration" ? "discover-mode-card-active" : ""}`} onClick={() => setMode("inspiration")}>
              <div className="discover-mode-icon"><IconPhoto size={22} /></div>
              <div className="discover-mode-text">
                <div className="discover-mode-title">Inspiration</div>
                <div className="discover-mode-desc">Search images by material, finish, colour or room</div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {mode === "builds" ? (
        <BuildsPane initialBuilds={initialBuilds} initialHasMore={initialBuildsHasMore} />
      ) : (
        <InspirationPane
          initialImages={initialInspirationImages}
          initialNextOffset={initialInspirationNextOffset}
          initialHasMore={initialInspirationHasMore}
          rooms={inspoRooms}
          styles={inspoStyles}
        />
      )}
    </div>
  );
}

// ── Builds pane ────────────────────────────────────────────────────────────

const PHASE_OPTIONS = PHASES.filter((p) => p !== "All").map((p) => ({ id: p, label: p }));
const TYPE_OPTIONS = TYPES.filter((t) => t !== "All").map((t) => ({ id: t, label: t }));
const STATE_OPTIONS = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((s) => ({ id: s, label: s }));
const STAGE_OPTIONS = MILESTONE_CATEGORIES.map((c) => ({ id: c, label: c }));

function BuildsPane({ initialBuilds, initialHasMore }: { initialBuilds: PublicBuildCard[]; initialHasMore: boolean }) {
  const [items, setItems] = useState<PublicBuildCard[]>(initialBuilds);
  const [offset, setOffset] = useState(initialBuilds.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [sort, setSort] = useState("recent");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async (startOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(startOffset), search: debouncedSearch, sort });
      if (selectedPhases.length) params.set("phases", selectedPhases.join(","));
      if (selectedTypes.length) params.set("types", selectedTypes.join(","));
      if (selectedStates.length) params.set("states", selectedStates.join(","));
      if (selectedStages.length) params.set("milestoneCategories", selectedStages.join(","));
      const res = await fetch(`/api/discover/builds?${params}`);
      const data = await res.json() as { builds: PublicBuildCard[]; hasMore: boolean };
      const newItems = data.builds ?? [];
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
        setOffset((prev) => prev + newItems.length);
      } else {
        setItems(newItems);
        setOffset(newItems.length);
      }
      setHasMore(data.hasMore ?? false);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedPhases, selectedTypes, selectedStates, selectedStages, sort]);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    fetchPage(0, false);
  }, [fetchPage]);

  const onReachBottomRef = useRef<() => void>(() => {});
  onReachBottomRef.current = () => { if (!loading && hasMore) fetchPage(offset, true); };
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) onReachBottomRef.current(); }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const clearFilters = () => { setSearch(""); setSelectedPhases([]); setSelectedTypes([]); setSelectedStates([]); setSelectedStages([]); };
  const hasFilters = search || selectedPhases.length > 0 || selectedTypes.length > 0 || selectedStates.length > 0 || selectedStages.length > 0;
  const filterCount = (search ? 1 : 0) + selectedPhases.length + selectedTypes.length + selectedStates.length + selectedStages.length;

  return (
    <main className="page-container content-section">
      <div className="selection-workspace">
        <aside className="selection-sidebar">
          <div className="selection-side-section">
            <div className="sidebar-sort-field">
              <label className="section-label">Sort by</label>
              <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sidebar-search-field">
              <label className="section-label">Search</label>
              <div className="sidebar-search-input-wrap">
                <IconSearch size={14} className="sidebar-search-icon" />
                <input className="form-input" placeholder="Builder, suburb, title…" value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear"><IconX size={13} /></button>}
              </div>
            </div>
            <MultiSelectFilter label="State" allLabel="All states" options={STATE_OPTIONS} selectedIds={selectedStates} onChange={setSelectedStates} />
            <MultiSelectFilter label="Phase" allLabel="All phases" options={PHASE_OPTIONS} selectedIds={selectedPhases} onChange={setSelectedPhases} />
            <MultiSelectFilter label="Build type" allLabel="All types" options={TYPE_OPTIONS} selectedIds={selectedTypes} onChange={setSelectedTypes} />
            <MultiSelectFilter label="Build stage" allLabel="All stages" options={STAGE_OPTIONS} selectedIds={selectedStages} onChange={setSelectedStages} />
          </div>
        </aside>

        <div className="selection-main">
          {/* Mobile: filter button shown instead of sidebar */}
          <div className="mobile-filter-bar">
            <button type="button" className="mobile-filter-btn" onClick={() => setFilterModalOpen(true)}>
              <IconFilter size={14} />
              Filters
              {filterCount > 0 && <span className="mobile-filter-count">{filterCount}</span>}
            </button>
            {filterCount > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
            )}
          </div>

          <p className="muted-row" style={{ marginBottom: 12 }}>
            {loading && items.length === 0 ? "Loading…" : `${items.length} build${items.length !== 1 ? "s" : ""}${hasMore ? "+" : ""}`}
          </p>

          {items.length > 0 && (
            <div className="catalogue-grid">
              {items.map((build) => (
                <Link key={build.id} href={`/${build.username}/${build.slug}`} className="catalogue-card">
                  <article className="build-card">
                    <div className="catalogue-card-image">
                      {build.imageUrl
                        ? <img src={build.imageUrl} alt={`${build.title} in ${build.suburb ?? "Australia"}`} />
                        : <Image src="/images/comingsoon.jpg" alt="" fill sizes="(min-width: 768px) 25vw, 100vw" />}
                      <div className="card-badge-row"><span className="badge badge-phase">{build.phase}</span></div>
                    </div>
                    <div className="catalogue-card-body">
                      <h2 className="catalogue-card-title">{build.title}</h2>
                      <div className="catalogue-card-meta">
                        <p className="catalogue-card-subtitle">{build.builder || "Builder TBA"}</p>
                        <p className="catalogue-card-subtitle">{build.suburb || "Suburb TBA"}</p>
                      </div>
                      <div className="pill-row">{build.designStyle ? <span className="pill">{build.designStyle}</span> : null}</div>
                    </div>
                    <div className="catalogue-card-footer">
                      <div className="metric-row">
                        <span className="metric"><IconHeart size={12} /> {build.followers}</span>
                        <span className="metric"><IconMessageCircle size={12} /> {build.comments}</span>
                      </div>
                      <span className="metric">{build.week ? `Wk ${build.week}` : build.phase}</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <h3 className="empty-state-title">No builds found</h3>
              <p className="empty-state-sub">Try adjusting your search or filters.</p>
              {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear all</button>}
            </div>
          )}

          {loading && <div className="infinite-scroll-loader"><span className="loader-spin" /></div>}
          <div ref={sentinelRef} className="infinite-scroll-sentinel" />
        </div>
      </div>

      {/* Mobile filter modal */}
      {filterModalOpen && (
        <div className="bb-modal bb-filter-modal" role="dialog" aria-modal="true" aria-label="Filter builds">
          <div className="bb-modal-panel">
            <div className="bb-modal-header">
              <h2 className="bb-modal-title">Filters</h2>
              <button type="button" className="btn-icon" onClick={() => setFilterModalOpen(false)} aria-label="Close filters">
                <IconX size={16} />
              </button>
            </div>
            <div className="bb-modal-body">
              <div className="selection-side-section">
                <div className="sidebar-sort-field">
                  <label className="section-label">Sort by</label>
                  <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="sidebar-search-field">
                  <label className="section-label">Search</label>
                  <div className="sidebar-search-input-wrap">
                    <IconSearch size={14} className="sidebar-search-icon" />
                    <input className="form-input" placeholder="Builder, suburb, title…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear"><IconX size={13} /></button>}
                  </div>
                </div>
                <MultiSelectFilter label="State" allLabel="All states" options={STATE_OPTIONS} selectedIds={selectedStates} onChange={setSelectedStates} />
                <MultiSelectFilter label="Phase" allLabel="All phases" options={PHASE_OPTIONS} selectedIds={selectedPhases} onChange={setSelectedPhases} />
                <MultiSelectFilter label="Build type" allLabel="All types" options={TYPE_OPTIONS} selectedIds={selectedTypes} onChange={setSelectedTypes} />
                <MultiSelectFilter label="Build stage" allLabel="All stages" options={STAGE_OPTIONS} selectedIds={selectedStages} onChange={setSelectedStages} />
              </div>
            </div>
            <div className="bb-modal-footer">
              {filterCount > 0 && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear all filters</button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setFilterModalOpen(false)}>
                Show results{items.length > 0 ? ` (${items.length}${hasMore ? "+" : ""})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Inspiration pane ───────────────────────────────────────────────────────

function InspirationPane({
  initialImages,
  initialNextOffset,
  initialHasMore,
  rooms,
  styles,
}: {
  initialImages: InspirationImage[];
  initialNextOffset: number;
  initialHasMore: boolean;
  rooms: string[];
  styles: string[];
}) {
  const [items, setItems] = useState<InspirationImage[]>(initialImages);
  const [nextRawOffset, setNextRawOffset] = useState(initialNextOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const activeSearch = debouncedSearch.length >= 3 ? debouncedSearch : "";

  const fetchPage = useCallback(async (rawOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ rawOffset: String(rawOffset) });
      if (activeSearch) params.set("search", activeSearch);
      if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
      if (selectedRooms.length) params.set("rooms", selectedRooms.join(","));
      if (selectedStyles.length) params.set("styles", selectedStyles.join(","));

      const res = await fetch(`/api/discover/inspiration?${params}`);
      const data = await res.json() as { images: InspirationImage[]; nextRawOffset: number; hasMore: boolean };
      const newItems = data.images ?? [];
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setNextRawOffset(data.nextRawOffset ?? rawOffset);
      setHasMore(data.hasMore ?? false);
    } finally {
      setLoading(false);
    }
  }, [activeSearch, selectedCategories, selectedRooms, selectedStyles]);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    fetchPage(0, false);
  }, [fetchPage]);

  const onReachBottomRef = useRef<() => void>(() => {});
  onReachBottomRef.current = () => { if (!loading && hasMore) fetchPage(nextRawOffset, true); };
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) onReachBottomRef.current(); }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const hasFilters = activeSearch || selectedCategories.length > 0 || selectedRooms.length > 0 || selectedStyles.length > 0;
  const clearFilters = () => { setSearch(""); setSelectedCategories([]); setSelectedRooms([]); setSelectedStyles([]); };
  const filterCount = (search ? 1 : 0) + selectedCategories.length + selectedRooms.length + selectedStyles.length;

  const categoryOptions = INSPO_CATEGORIES.map((cat) => ({ id: cat, label: cat }));
  const roomOptions = rooms.map((r) => ({ id: r, label: formatRoomType(r) }));
  const styleOptions = styles.map((s) => ({ id: s, label: s }));

  return (
    <div className="page-container content-section">
      <div className="selection-workspace">
        <aside className="selection-sidebar">
          <div className="selection-side-section">
            <div className="sidebar-search-field">
              <label className="section-label">Search keywords</label>
              <div className="sidebar-search-input-wrap">
                <IconSearch size={14} className="sidebar-search-icon" />
                <input className="form-input" placeholder="marble, oak flooring..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search"><IconX size={13} /></button>}
              </div>
              <p className="sidebar-search-hint">
                {search.length > 0 && search.length < 3
                  ? `${3 - search.length} more character${3 - search.length === 1 ? "" : "s"} to search`
                  : "Enter at least 3 characters"}
              </p>
            </div>
            <MultiSelectFilter label="Category" allLabel="All categories" options={categoryOptions} selectedIds={selectedCategories} onChange={setSelectedCategories} />
            {roomOptions.length > 0 && <MultiSelectFilter label="Room" allLabel="All rooms" options={roomOptions} selectedIds={selectedRooms} onChange={setSelectedRooms} />}
            {styleOptions.length > 0 && <MultiSelectFilter label="Style" allLabel="All styles" options={styleOptions} selectedIds={selectedStyles} onChange={setSelectedStyles} />}
          </div>
        </aside>

        <div className="selection-main">
          {/* Mobile: filter button shown instead of sidebar */}
          <div className="mobile-filter-bar">
            <button type="button" className="mobile-filter-btn" onClick={() => setFilterModalOpen(true)}>
              <IconFilter size={14} />
              Filters
              {filterCount > 0 && <span className="mobile-filter-count">{filterCount}</span>}
            </button>
            {filterCount > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
            )}
          </div>

          <p className="inspo-result-count muted-row">
            {loading && items.length === 0 ? "Loading…" : `${items.length} image${items.length !== 1 ? "s" : ""}${hasMore ? "+" : ""}`}
          </p>

          {items.length > 0 && (
            <div className="inspo-grid">
              {items.map((image, index) => (
                <button key={image.id} type="button" className="inspo-item" onClick={() => setLightboxIndex(index)} aria-label={`View ${image.buildTitle}`}>
                  <img src={image.imageUrl!} alt={image.buildTitle} loading="lazy" />
                  <div className="inspo-kind-badge-wrap">
                    <span className={imageKindLabel(image.imageKind).className}>{imageKindLabel(image.imageKind).label}</span>
                  </div>
                  {activeSearch && (() => {
                    const match = findMatchMeta(image, activeSearch);
                    return match ? <div className="inspo-match-badge-wrap"><span className="inspo-match-badge">{match}</span></div> : null;
                  })()}
                  <div className="inspo-item-overlay">
                    <span className="inspo-item-build">{image.buildTitle}</span>
                    {image.tags.length > 0 && <span className="inspo-item-tag-count">{image.tags.length} {image.tags.length === 1 ? "selection" : "selections"} tagged</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <IconPhoto size={32} />
              <h3 className="empty-state-title">No images found</h3>
              <p className="empty-state-sub">
                {hasFilters ? "Try different search terms or clear your filters." : "Build images will appear here as the community shares their builds. Check back soon!"}
              </p>
              {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>}
            </div>
          )}

          {loading && <div className="infinite-scroll-loader"><span className="loader-spin" /></div>}
          <div ref={sentinelRef} className="infinite-scroll-sentinel" />
        </div>
      </div>

      {lightboxIndex !== null && (
        <InspirationLightbox images={items} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      )}

      {/* Mobile filter modal */}
      {filterModalOpen && (
        <div className="bb-modal bb-filter-modal" role="dialog" aria-modal="true" aria-label="Filter inspiration">
          <div className="bb-modal-panel">
            <div className="bb-modal-header">
              <h2 className="bb-modal-title">Filters</h2>
              <button type="button" className="btn-icon" onClick={() => setFilterModalOpen(false)} aria-label="Close filters">
                <IconX size={16} />
              </button>
            </div>
            <div className="bb-modal-body">
              <div className="selection-side-section">
                <div className="sidebar-search-field">
                  <label className="section-label">Search keywords</label>
                  <div className="sidebar-search-input-wrap">
                    <IconSearch size={14} className="sidebar-search-icon" />
                    <input className="form-input" placeholder="marble, oak flooring..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    {search && <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear"><IconX size={13} /></button>}
                  </div>
                  <p className="sidebar-search-hint">
                    {search.length > 0 && search.length < 3
                      ? `${3 - search.length} more character${3 - search.length === 1 ? "" : "s"} to search`
                      : "Enter at least 3 characters"}
                  </p>
                </div>
                <MultiSelectFilter label="Category" allLabel="All categories" options={categoryOptions} selectedIds={selectedCategories} onChange={setSelectedCategories} />
                {roomOptions.length > 0 && <MultiSelectFilter label="Room" allLabel="All rooms" options={roomOptions} selectedIds={selectedRooms} onChange={setSelectedRooms} />}
                {styleOptions.length > 0 && <MultiSelectFilter label="Style" allLabel="All styles" options={styleOptions} selectedIds={selectedStyles} onChange={setSelectedStyles} />}
              </div>
            </div>
            <div className="bb-modal-footer">
              {filterCount > 0 && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear all filters</button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setFilterModalOpen(false)}>
                Show results{items.length > 0 ? ` (${items.length}${hasMore ? "+" : ""})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────

function InspirationLightbox({ images, index, onClose, onNavigate }: {
  images: InspirationImage[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!image) return null;

  return (
    <div className="lightbox" role="dialog" aria-modal="true">
      <button className="lightbox-backdrop" type="button" aria-label="Close" onClick={onClose} />
      <div className="lightbox-inner">
        <div
          className="lightbox-image-pane"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 40) {
              if (dx < 0 && hasNext) onNavigate(index + 1);
              if (dx > 0 && hasPrev) onNavigate(index - 1);
            }
            touchStartX.current = null;
          }}
        >
          <img src={image.imageUrl!} alt={image.buildTitle} />
          {hasPrev && <button type="button" className="lightbox-nav lightbox-nav-prev" onClick={() => onNavigate(index - 1)} aria-label="Previous image"><IconArrowLeft size={18} /></button>}
          {hasNext && <button type="button" className="lightbox-nav lightbox-nav-next" onClick={() => onNavigate(index + 1)} aria-label="Next image"><IconArrowRight size={18} /></button>}
          <div className="lightbox-counter">{index + 1} / {images.length}</div>
        </div>

        <div className="lightbox-info">
          <div className="lightbox-info-top">
            <button type="button" className="btn-icon lightbox-close-btn" onClick={onClose} aria-label="Close lightbox"><IconX size={16} /></button>
          </div>

          <div className="lightbox-build-block">
            <div className="lightbox-build-label-row">
              <div className="lightbox-build-label">From</div>
              <span className={imageKindLabel(image.imageKind).className}>{imageKindLabel(image.imageKind).label}</span>
            </div>
            <div className="lightbox-build-title">{image.buildTitle}</div>
            {image.designStyle && <div className="lightbox-build-style">{image.designStyle}</div>}
            <Link href={`/${image.ownerUsername}/${image.buildSlug}`} className="btn btn-secondary btn-sm lightbox-build-link" target="_blank">
              View build profile
            </Link>
          </div>

          {image.tags.length > 0 ? (
            <div className="lightbox-tags-block">
              <div className="lightbox-section-label">Tagged selections</div>
              <div className="lightbox-tags-list">
                {image.tags.map((tag) => {
                  const name = tag.itemName || tag.productName || tag.brand || "Selection";
                  const details = [tag.brand, tag.colourName, tag.materialType].filter(Boolean).join(" · ");
                  return (
                    <div key={tag.selectionId} className="lightbox-tag-card">
                      {tag.category && <div className="lightbox-tag-category">{tag.category}{tag.subcategory ? ` · ${tag.subcategory}` : ""}</div>}
                      <div className="lightbox-tag-name">{name}</div>
                      {details && <div className="lightbox-tag-details">{details}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="lightbox-no-tags"><p>No selections tagged on this image yet.</p></div>
          )}

          {image.notes && (
            <div className="lightbox-notes-block">
              <div className="lightbox-section-label">Notes</div>
              <p className="lightbox-notes-text">{image.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
