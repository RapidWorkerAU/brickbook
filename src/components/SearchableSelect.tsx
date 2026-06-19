"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";

type SearchableSelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  hideLabel?: boolean;
};

const SEARCH_BAR_HEIGHT = 46;

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Search or select...",
  hideLabel = false,
}: SearchableSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [optionsMaxHeight, setOptionsMaxHeight] = useState<number>(200);
  const [openUp, setOpenUp] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 8;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
      const availableAbove = rect.top - viewportPadding;
      const shouldOpenUp = availableBelow < 240 && availableAbove > availableBelow && availableAbove >= 160;
      const maxHeight = Math.min(320, shouldOpenUp ? availableAbove : Math.max(120, availableBelow));

      setOpenUp(shouldOpenUp);
      setOptionsMaxHeight(Math.max(60, maxHeight - SEARCH_BAR_HEIGHT));
      setMenuStyle({
        position: "fixed",
        top: shouldOpenUp ? undefined : rect.bottom,
        bottom: shouldOpenUp ? window.innerHeight - rect.top : undefined,
        left: rect.left,
        width: rect.width,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const exactMatch = options.some(
    (option) => option.toLowerCase() === query.trim().toLowerCase()
  );
  const canUseCustom = query.trim().length > 0 && !exactMatch;

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setQuery(nextValue);
    setOpen(false);
  };

  const handleInputChange = (nextValue: string) => {
    onChange(nextValue);
    setQuery(nextValue);
    setOpen(true);
  };

  return (
    <div ref={rootRef} className="searchable-select">
      {hideLabel ? null : (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}

      {/* Trigger row — looks identical to a form-input */}
      <div
        className={`searchable-select-control ${
          open ? `searchable-select-control-open${openUp ? " searchable-select-control-open-up" : ""}` : ""
        }`}
      >
        <input
          id={id}
          aria-label={hideLabel ? label : undefined}
          className="searchable-select-input"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          readOnly={false}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              searchRef.current?.focus();
            }
            if (event.key === "Enter" && canUseCustom) {
              event.preventDefault();
              selectValue(query.trim());
            }
          }}
        />

        {value ? (
          <button
            type="button"
            className="searchable-select-clear"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
          >
            <IconX size={13} />
          </button>
        ) : null}

        <button
          type="button"
          className="searchable-select-toggle"
          aria-label={`Open ${label} options`}
          aria-expanded={open}
          tabIndex={-1}
          onClick={() => {
            setQuery(value);
            setOpen((current) => !current);
          }}
        >
          <IconChevronDown
            size={15}
            style={{
              transition: "transform 150ms ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      </div>

      {open && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className={`searchable-select-menu searchable-select-menu-portal${openUp ? " searchable-select-menu-up" : ""}`}
              style={menuStyle}
              role="listbox"
            >
              <div className="searchable-select-search">
                <IconSearch size={14} aria-hidden="true" />
                <input
                  ref={searchRef}
                  value={query}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  aria-label={`Search ${label}`}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setOpen(false);
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (filtered[0]) selectValue(filtered[0]);
                      else if (canUseCustom) selectValue(query.trim());
                    }
                  }}
                />
              </div>

              <div
                className="searchable-select-options"
                style={{ maxHeight: optionsMaxHeight, overflowY: "auto" }}
              >
                {filtered.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={option === value}
                    className={`searchable-select-option ${
                      option === value ? "searchable-select-option-active" : ""
                    }`}
                    onClick={() => selectValue(option)}
                  >
                    {option}
                  </button>
                ))}

                {canUseCustom ? (
                  <button
                    type="button"
                    className="searchable-select-option searchable-select-option-custom"
                    onClick={() => selectValue(query.trim())}
                  >
                    Use &quot;{query.trim()}&quot;
                  </button>
                ) : null}

                {filtered.length === 0 && !canUseCustom ? (
                  <div className="searchable-select-empty">No options found</div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
