"use client";

import Link from "next/link";
import { useState } from "react";
import { PaginationControls, TABLE_PAGE_SIZE, pageItems } from "@/components/PaginationControls";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { IconFilter, IconMapPin, IconSearch, IconX } from "@tabler/icons-react";
import type { DirectoryEntry } from "@/lib/public-data";

const STATE_OPTIONS = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((s) => ({ id: s, label: s }));

export function PaginatedSuburbTable({ suburbs }: { suburbs: DirectoryEntry[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const filtered = suburbs.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedStates.length > 0 && !s.states.some((st) => selectedStates.includes(st))) return false;
    return true;
  });

  const paginatedSuburbs = pageItems(filtered, currentPage, TABLE_PAGE_SIZE);
  const hasFilters = search || selectedStates.length > 0;
  const filterCount = (search ? 1 : 0) + selectedStates.length;

  const handleSearchChange = (val: string) => { setSearch(val); setCurrentPage(1); };
  const handleStatesChange = (val: string[]) => { setSelectedStates(val); setCurrentPage(1); };
  const clearFilters = () => { setSearch(""); setSelectedStates([]); setCurrentPage(1); };

  return (
    <>
      <div className="selection-workspace">
        <aside className="selection-sidebar">
          <div className="selection-side-section">
            <div className="sidebar-search-field">
              <label className="section-label">Search</label>
              <div className="sidebar-search-input-wrap">
                <IconSearch size={14} className="sidebar-search-icon" />
                <input
                  className="form-input"
                  placeholder="Suburb name…"
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
            {filtered.length} suburb{filtered.length !== 1 ? "s" : ""}
          </p>

          {filtered.length > 0 ? (
            <div className="card">
              <table className="bb-table">
                <thead>
                  <tr>
                    <th>Suburb</th>
                    <th>State</th>
                    <th>Builds</th>
                    <th>Builders</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paginatedSuburbs.items.map((suburb) => (
                    <tr key={suburb.slug}>
                      <td>
                        <span className="muted-row text-[var(--bb-black)]">
                          <IconMapPin size={13} /> {suburb.name}
                        </span>
                      </td>
                      <td>{suburb.states.join(", ") || "—"}</td>
                      <td>
                        <span className="font-medium">{suburb.buildCount}</span>
                        <span className="text-[11px] text-[var(--bb-stone-400)]"> builds</span>
                      </td>
                      <td>{suburb.builders.slice(0, 2).join(", ") || "TBA"}</td>
                      <td className="text-right">
                        <Link href={`/suburbs/${suburb.slug}`} className="directory-link">View builds</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                currentPage={paginatedSuburbs.currentPage}
                pageCount={paginatedSuburbs.pageCount}
                totalCount={filtered.length}
                onPageChange={setCurrentPage}
                pageSize={TABLE_PAGE_SIZE}
                variant="table"
              />
            </div>
          ) : (
            <div className="empty-state">
              <h3 className="empty-state-title">No suburbs found</h3>
              <p className="empty-state-sub">Try adjusting your search or filters.</p>
              {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear all</button>}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter modal */}
      {filterModalOpen && (
        <div className="bb-modal bb-filter-modal" role="dialog" aria-modal="true" aria-label="Filter suburbs">
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
                  <label className="section-label">Search</label>
                  <div className="sidebar-search-input-wrap">
                    <IconSearch size={14} className="sidebar-search-icon" />
                    <input
                      className="form-input"
                      placeholder="Suburb name…"
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
