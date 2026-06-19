"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";

export function MultiSelectFilter({
  label,
  allLabel,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: { id: string; label: string; count?: number }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const summary =
    selectedIds.length === 0
      ? allLabel
      : selectedIds.length === 1
        ? (options.find((option) => option.id === selectedIds[0])?.label ?? "1 selected")
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
      <button
        className={`multi-select-trigger ${open ? "multi-select-trigger-open" : ""}`}
        type="button"
        onClick={() => setOpen((c) => !c)}
        aria-expanded={open}
      >
        <span>{summary}</span>
        <IconChevronDown size={14} />
      </button>

      {selectedIds.length > 0 ? (
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
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
            />
          </div>
          <div className="multi-select-options">
            <button className="multi-select-option" type="button" onClick={() => onChange([])}>
              <span className={`multi-select-check ${selectedIds.length === 0 ? "multi-select-check-active" : ""}`}>
                {selectedIds.length === 0 ? <IconCheck size={12} /> : null}
              </span>
              <span>{allLabel}</span>
              {(() => { const t = options.reduce((s, o) => s + (o.count ?? 0), 0); return t > 0 ? <span className="multi-select-count">{t}</span> : null; })()}
            </button>
            {filteredOptions.map((option) => (
              <button key={option.id} className="multi-select-option" type="button" onClick={() => toggle(option.id)}>
                <span className={`multi-select-check ${selected.has(option.id) ? "multi-select-check-active" : ""}`}>
                  {selected.has(option.id) ? <IconCheck size={12} /> : null}
                </span>
                <span>{option.label}</span>
                {(option.count ?? 0) > 0 && <span className="multi-select-count">{option.count}</span>}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
