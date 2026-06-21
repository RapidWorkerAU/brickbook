"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import locations from "@/data/au-locations.json";

// ── Zone badge ────────────────────────────────────────────────────────────────
const ZONE_COLORS = {
  1: "#e84040", 2: "#e86b40", 3: "#e8a040", 4: "#d4b800",
  5: "#4fa84a", 6: "#3d90d4", 7: "#6b5fd4", 8: "#a0a0c0",
};

function ZoneBadge({ zone }) {
  if (!zone) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 44, height: 18, borderRadius: 4,
      background: `${ZONE_COLORS[zone]}22`,
      border: `1px solid ${ZONE_COLORS[zone]}55`,
      color: ZONE_COLORS[zone],
      fontSize: 10, fontWeight: 600, letterSpacing: "0.02em",
      flexShrink: 0, padding: "0 5px",
    }}>
      Zone {zone}
    </span>
  );
}

// ── State abbreviation map ────────────────────────────────────────────────────
const STATE_ABBR = {
  "Western Australia": "WA",
  "Queensland": "QLD",
  "New South Wales": "NSW",
  "Victoria": "VIC",
  "South Australia": "SA",
  "Tasmania": "TAS",
  "Northern Territory": "NT",
  "Australian Capital Territory": "ACT",
};

// ── NCC climate zone — nearest-neighbour lookup ───────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestClimateZone(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const loc of locations) {
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d < bestDist) { bestDist = d; best = loc; }
  }
  return best?.climateZone ?? null;
}

// ── Parse address components from Google Places Details ───────────────────────
function parseAddressComponents(components = []) {
  const get = (type) =>
    components.find((c) => c.types.includes(type))?.long_name ?? null;
  const getShort = (type) =>
    components.find((c) => c.types.includes(type))?.short_name ?? null;

  const suburb =
    get("locality") ??
    get("sublocality") ??
    get("sublocality_level_1") ??
    get("administrative_area_level_2") ??
    null;

  const stateLong = get("administrative_area_level_1");
  const state = STATE_ABBR[stateLong] ?? getShort("administrative_area_level_1") ?? "";
  const postcode = get("postal_code") ?? "";

  return { suburb, state, postcode };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LocationPicker({ selectedLocation, onSelect }) {
  const [query, setQuery]         = useState("");
  const [isOpen, setIsOpen]       = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [resolving, setResolving] = useState(false);
  const containerRef              = useRef(null);
  const inputRef                  = useRef(null);
  const debounceRef               = useRef(null);

  // Autocomplete — debounced 300 ms
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setPredictions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(q)}`);
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setIsOpen(true);
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Click-outside close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Select a prediction — fetch details to get lat/lng
  const handleSelect = useCallback(async (prediction) => {
    setIsOpen(false);
    setQuery("");
    setPredictions([]);
    setResolving(true);
    try {
      const res  = await fetch(`/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`);
      const data = await res.json();
      const result = data.result;
      if (!result?.geometry?.location) return;

      const { lat, lng } = result.geometry.location;
      const { suburb, state, postcode } = parseAddressComponents(result.address_components);
      const climateZone = nearestClimateZone(lat, lng);

      // Fall back to first word of description if suburb couldn't be parsed
      const suburbName = suburb ?? prediction.description.split(",")[0].trim();

      onSelect({ suburb: suburbName, state, postcode, lat, lng, climateZone });
    } catch {
      // silently ignore — user can try again
    } finally {
      setResolving(false);
    }
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
    setQuery("");
    setPredictions([]);
    setTimeout(() => { setIsOpen(true); inputRef.current?.focus(); }, 0);
  }, [onSelect]);

  // ── Selected state ──────────────────────────────────────────────────────────
  if (selectedLocation) {
    return (
      <button
        onClick={handleClear}
        title="Change location"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          height: 30, padding: "0 10px", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "#ffffff", cursor: "pointer",
          fontSize: 12, fontWeight: 500,
          whiteSpace: "nowrap", transition: "background 150ms ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.11)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      >
        <span style={{ color: "rgba(255,255,255,0.75)" }}>
          {selectedLocation.suburb}{selectedLocation.state ? ` ${selectedLocation.state}` : ""}
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
        <ZoneBadge zone={selectedLocation.climateZone} />
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, lineHeight: 1, marginLeft: 2 }}>×</span>
      </button>
    );
  }

  // ── Search state ────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        height: 30, padding: "0 10px", borderRadius: 6,
        border: `1px solid ${isOpen ? "rgba(91,127,255,0.5)" : "rgba(255,255,255,0.12)"}`,
        background: "rgba(255,255,255,0.06)",
        transition: "border-color 150ms ease",
        opacity: resolving ? 0.6 : 1,
      }}>
        {/* Icon — spinner when loading, search otherwise */}
        {loading || resolving ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(91,127,255,0.7)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, animation: "spin 0.8s linear infinite" }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search any suburb…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (e.target.value) setIsOpen(true); }}
          onFocus={() => { if (predictions.length) setIsOpen(true); }}
          disabled={resolving}
          style={{
            background: "transparent", border: "none", outline: "none",
            color: "#ffffff", fontSize: 12, width: 160, caretColor: "#5b7fff",
          }}
        />
        {query && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setQuery(""); setPredictions([]); }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1, flexShrink: 0 }}
          >×</button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          minWidth: "100%", width: 300,
          background: "#1e2130",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          zIndex: 200, overflow: "hidden",
        }}>
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              style={{
                width: "100%", display: "flex", alignItems: "flex-start",
                gap: 8, padding: "9px 12px",
                background: "transparent", border: "none",
                borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                color: "#ffffff", cursor: "pointer", textAlign: "left",
                transition: "background 100ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ fontSize: 12, lineHeight: 1.4, flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 500, color: "#e8eaf2" }}>
                  {p.structured_formatting?.main_text ?? p.description.split(",")[0]}
                </span>
                <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 1 }}>
                  {p.structured_formatting?.secondary_text ?? ""}
                </span>
              </span>
            </button>
          ))}
          <div style={{ padding: "6px 12px 7px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>Powered by Google</span>
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && query.trim() && !loading && predictions.length === 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: "100%",
          background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "10px 14px",
          color: "rgba(255,255,255,0.35)", fontSize: 12, zIndex: 200,
        }}>
          No results found
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
