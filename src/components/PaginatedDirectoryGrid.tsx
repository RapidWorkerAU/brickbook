"use client";

import Link from "next/link";
import { useState } from "react";
import { PaginationControls, pageItems } from "@/components/PaginationControls";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { IconBuildingCommunity, IconFilter, IconPhoto, IconSearch, IconX } from "@tabler/icons-react";
import type { DirectoryEntry } from "@/lib/public-data";

const STATE_OPTIONS = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((s) => ({ id: s, label: s }));

export function PaginatedBuilderDirectory({ builders }: { builders: DirectoryEntry[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [suburbSearch, setSuburbSearch] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const filtered = builders.filter((b) => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (suburbSearch && !b.suburbs.some((s) => s.toLowerCase().includes(suburbSearch.toLowerCase()))) return false;
    if (selectedStates.length > 0 && !b.states.some((st) => selectedStates.includes(st))) return false;
    return true;
  });

  const paginated = pageItems(filtered, currentPage);
  const hasFilters = search || suburbSearch || selectedStates.length > 0;
  const filterCount = (search ? 1 : 0) + (suburbSearch ? 1 : 0) + selectedStates.length;

  const handleSearchChange = (val: string) => { setSearch(val); setCurrentPage(1); };
  const handleSuburbChange = (val: string) => { setSuburbSearch(val); setCurrentPage(1); };
  const handleStatesChange = (val: string[]) => { setSelectedStates(val); setCurrentPage(1); };
  const clearFilters = () => { setSearch(""); setSuburbSearch(""); setSelectedStates([]); setCurrentPage(1); };

  return (
    <>
      <div className="selection-workspace">
        <aside className="selection-sidebar">
          <div className="selection-side-section">
            <div className="sidebar-search-field">
              <label className="section-label">Search builder</label>
              <div className="sidebar-search-input-wrap">
                <IconSearch size={14} className="sidebar-search-icon" />
                <input
                  className="form-input"
                  placeholder="Builder name…"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {search && (
                  <button className="search-clear" onClick={() => handleSearchChange("")} aria-label="Clear">
                    <IconX size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="sidebar-search-field">
              <label className="section-label">Search suburb</label>
              <div className="sidebar-search-input-wrap">
                <IconSearch size={14} className="sidebar-search-icon" />
                <input
                  className="form-input"
                  placeholder="Suburb name…"
                  value={suburbSearch}
                  onChange={(e) => handleSuburbChange(e.target.value)}
                />
                {suburbSearch && (
                  <button className="search-clear" onClick={() => handleSuburbChange("")} aria-label="Clear">
                    <IconX size={13} />
                  </button>
                )}
              </div>
            </div>
            <MultiSelectFilter
              label="State"
              allLabel="All states"
              options={STATE_OPTIONS}
              selectedIds={selectedStates}
              onChange={handleStatesChange}
            />
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
            {filtered.length} builder{filtered.length !== 1 ? "s" : ""}
          </p>

          {filtered.length > 0 ? (
            <>
              <div className="directory-grid">
                {paginated.items.map((builder) => (
                  <Link key={builder.slug} href={`/builders/${builder.slug}`} className="catalogue-card">
                    <article className="build-card">
                      <div className="directory-cover">
                        <IconPhoto size={20} />
                      </div>
                      <div className="directory-card-body">
                        <h2 className="directory-card-title">{builder.name}</h2>
                        <p className="directory-card-subtitle">
                          {builder.suburbs.slice(0, 2).join(", ") || "No suburb data"}
                          {builder.suburbs.length > 2 ? ` +${builder.suburbs.length - 2} more` : ""}
                        </p>
                        {builder.states.length > 0 && (
                          <p className="directory-card-subtitle">{builder.states.join(", ")}</p>
                        )}
                        <div className="directory-metrics">
                          <Metric value={builder.buildCount} label="builds" />
                          <Metric value={builder.suburbs.length} label="suburbs" />
                        </div>
                      </div>
                      <div className="directory-card-footer">
                        <span className="directory-link">View builds</span>
                        <IconBuildingCommunity size={14} className="text-[var(--bb-stone-400)]" />
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <PaginationControls
                currentPage={paginated.currentPage}
                pageCount={paginated.pageCount}
                totalCount={filtered.length}
                onPageChange={setCurrentPage}
              />
            </>
          ) : (
            <div className="empty-state">
              <h3 className="empty-state-title">No builders found</h3>
              <p className="empty-state-sub">Try adjusting your search or filters.</p>
              {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear all</button>}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter modal */}
      {filterModalOpen && (
        <div className="bb-modal bb-filter-modal" role="dialog" aria-modal="true" aria-label="Filter builders">
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
                  <label className="section-label">Search builder</label>
                  <div className="sidebar-search-input-wrap">
                    <IconSearch size={14} className="sidebar-search-icon" />
                    <input
                      className="form-input"
                      placeholder="Builder name…"
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {search && (
                      <button className="search-clear" onClick={() => handleSearchChange("")} aria-label="Clear">
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="sidebar-search-field">
                  <label className="section-label">Search suburb</label>
                  <div className="sidebar-search-input-wrap">
                    <IconSearch size={14} className="sidebar-search-icon" />
                    <input
                      className="form-input"
                      placeholder="Suburb name…"
                      value={suburbSearch}
                      onChange={(e) => handleSuburbChange(e.target.value)}
                    />
                    {suburbSearch && (
                      <button className="search-clear" onClick={() => handleSuburbChange("")} aria-label="Clear">
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <MultiSelectFilter
                  label="State"
                  allLabel="All states"
                  options={STATE_OPTIONS}
                  selectedIds={selectedStates}
                  onChange={handleStatesChange}
                />
              </div>
            </div>
            <div className="bb-modal-footer">
              {filterCount > 0 && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear all filters</button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setFilterModalOpen(false)}>
                Show results ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PaginatedEstateDirectory({ estates }: { estates: DirectoryEntry[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [suburbSearch, setSuburbSearch] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const filtered = estates.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (suburbSearch && !e.suburbs.some((s) => s.toLowerCase().includes(suburbSearch.toLowerCase()))) return false;
    if (selectedStates.length > 0 && !e.states.some((st) => selectedStates.includes(st))) return false;
    return true;
  });

  const paginated = pageItems(filtered, currentPage);
  const hasFilters = search || suburbSearch || selectedStates.length > 0;
  const filterCount = (search ? 1 : 0) + (suburbSearch ? 1 : 0) + selectedStates.length;

  const handleSearchChange = (val: string) => { setSearch(val); setCurrentPage(1); };
  const handleSuburbChange = (val: string) => { setSuburbSearch(val); setCurrentPage(1); };
  const handleStatesChange = (val: string[]) => { setSelectedStates(val); setCurrentPage(1); };
  const clearFilters = () => { setSearch(""); setSuburbSearch(""); setSelectedStates([]); setCurrentPage(1); };

  return (
    <>
      <div className="selection-workspace">
        <aside className="selection-sidebar">
          <div className="selection-side-section">
            <div className="sidebar-search-field">
              <label className="section-label">Search estate</label>
              <div className="sidebar-search-input-wrap">
                <IconSearch size={14} className="sidebar-search-icon" />
                <input
                  className="form-input"
                  placeholder="Estate name…"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {search && (
                  <button className="search-clear" onClick={() => handleSearchChange("")} aria-label="Clear">
                    <IconX size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="sidebar-search-field">
              <label className="section-label">Search suburb</label>
              <div className="sidebar-search-input-wrap">
                <IconSearch size={14} className="sidebar-search-icon" />
                <input
                  className="form-input"
                  placeholder="Suburb name…"
                  value={suburbSearch}
                  onChange={(e) => handleSuburbChange(e.target.value)}
                />
                {suburbSearch && (
                  <button className="search-clear" onClick={() => handleSuburbChange("")} aria-label="Clear">
                    <IconX size={13} />
                  </button>
                )}
              </div>
            </div>
            <MultiSelectFilter
              label="State"
              allLabel="All states"
              options={STATE_OPTIONS}
              selectedIds={selectedStates}
              onChange={handleStatesChange}
            />
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
            {filtered.length} estate{filtered.length !== 1 ? "s" : ""}
          </p>

          {filtered.length > 0 ? (
            <>
              <div className="directory-grid">
                {paginated.items.map((estate) => (
                  <Link key={estate.slug} href={`/estates/${estate.slug}`} className="catalogue-card">
                    <article className="build-card">
                      <div className="directory-card-body">
                        <div className="directory-icon">
                          <IconBuildingCommunity size={18} />
                        </div>
                        <h2 className="directory-card-title">{estate.name}</h2>
                        <p className="directory-card-subtitle">{estate.suburbs[0] || "Suburb TBA"}</p>
                        {estate.states.length > 0 && (
                          <p className="directory-card-subtitle">{estate.states.join(", ")}</p>
                        )}
                        <div className="directory-metrics">
                          <Metric value={estate.buildCount} label="builds" />
                          <Metric value={estate.builders.length} label="builders" />
                        </div>
                      </div>
                      <div className="directory-card-footer">
                        <span className="directory-link">View builds</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <PaginationControls
                currentPage={paginated.currentPage}
                pageCount={paginated.pageCount}
                totalCount={filtered.length}
                onPageChange={setCurrentPage}
              />
            </>
          ) : (
            <div className="empty-state">
              <h3 className="empty-state-title">No estates found</h3>
              <p className="empty-state-sub">Try adjusting your search or filters.</p>
              {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear all</button>}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter modal */}
      {filterModalOpen && (
        <div className="bb-modal bb-filter-modal" role="dialog" aria-modal="true" aria-label="Filter estates">
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
                  <label className="section-label">Search estate</label>
                  <div className="sidebar-search-input-wrap">
                    <IconSearch size={14} className="sidebar-search-icon" />
                    <input
                      className="form-input"
                      placeholder="Estate name…"
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {search && (
                      <button className="search-clear" onClick={() => handleSearchChange("")} aria-label="Clear">
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="sidebar-search-field">
                  <label className="section-label">Search suburb</label>
                  <div className="sidebar-search-input-wrap">
                    <IconSearch size={14} className="sidebar-search-icon" />
                    <input
                      className="form-input"
                      placeholder="Suburb name…"
                      value={suburbSearch}
                      onChange={(e) => handleSuburbChange(e.target.value)}
                    />
                    {suburbSearch && (
                      <button className="search-clear" onClick={() => handleSuburbChange("")} aria-label="Clear">
                        <IconX size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <MultiSelectFilter
                  label="State"
                  allLabel="All states"
                  options={STATE_OPTIONS}
                  selectedIds={selectedStates}
                  onChange={handleStatesChange}
                />
              </div>
            </div>
            <div className="bb-modal-footer">
              {filterCount > 0 && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear all filters</button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setFilterModalOpen(false)}>
                Show results ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="directory-metric-value">{value}</div>
      <div className="directory-metric-label">{label}</div>
    </div>
  );
}
