"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import locations from "@/data/au-locations.json";

const GMAP_LIBRARIES = [];

// ── Location search helpers (mirrors LocationPicker logic) ────────────────────

const STATE_ABBR = {
  "Western Australia": "WA", "Queensland": "QLD", "New South Wales": "NSW",
  "Victoria": "VIC", "South Australia": "SA", "Tasmania": "TAS",
  "Northern Territory": "NT", "Australian Capital Territory": "ACT",
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestClimateZone(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const loc of locations) {
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d < bestDist) { bestDist = d; best = loc; }
  }
  return best?.climateZone ?? null;
}

function parseAddressComponents(components = []) {
  const get = (t) => components.find((c) => c.types.includes(t))?.long_name ?? null;
  const getShort = (t) => components.find((c) => c.types.includes(t))?.short_name ?? null;
  const suburb = get("locality") ?? get("sublocality") ?? get("sublocality_level_1") ?? get("administrative_area_level_2") ?? null;
  const stateLong = get("administrative_area_level_1");
  const state = STATE_ABBR[stateLong] ?? getShort("administrative_area_level_1") ?? "";
  return { suburb, state };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rotateVec(x, y, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
}

// Loose snap to 0/90/180/270° — pulls within 8° of each cardinal
function snapToCardinal(angle) {
  const a = ((angle % 360) + 360) % 360;
  for (const snap of [0, 90, 180, 270, 360]) {
    const diff = Math.min(Math.abs(a - snap), 360 - Math.abs(a - snap));
    if (diff <= 8) return snap % 360;
  }
  return angle;
}

// Creates a dashed-outline block footprint PNG for use in PlanCanvas.
// frontSide ("top"|"right"|"bottom"|"left") draws that edge as a solid amber line.
function makeBlockOutlinePng(w, h, frontSide) {
  const MAX = 600;
  const s = Math.min(MAX / Math.max(w, h), 1);
  const cw = Math.max(80, Math.round(w * s));
  const ch = Math.max(60, Math.round(h * s));
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);
  ctx.strokeRect(6, 6, cw - 12, ch - 12);
  ctx.setLineDash([]);
  // Front edge — solid amber line drawn over the dashed border
  if (frontSide) {
    ctx.strokeStyle = "rgba(245,158,11,0.95)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    if      (frontSide === "top")    { ctx.moveTo(6, 6);       ctx.lineTo(cw - 6, 6); }
    else if (frontSide === "bottom") { ctx.moveTo(6, ch - 6);  ctx.lineTo(cw - 6, ch - 6); }
    else if (frontSide === "left")   { ctx.moveTo(6, 6);       ctx.lineTo(6, ch - 6); }
    else if (frontSide === "right")  { ctx.moveTo(cw - 6, 6);  ctx.lineTo(cw - 6, ch - 6); }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.font = `${Math.max(10, Math.round(ch * 0.09))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Block outline", cw / 2, ch / 2);
  return canvas.toDataURL("image/png");
}

// ── Step 1 — Location search ──────────────────────────────────────────────────

function LocationStep({ onSelect, onCancel }) {
  const [query, setQuery]       = useState("");
  const [predictions, setPreds] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [resolving, setResolv]  = useState(false);
  const [isOpen, setIsOpen]     = useState(false);
  const debRef = useRef(null);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  useEffect(() => {
    clearTimeout(debRef.current);
    const q = query.trim();
    if (!q) { setPreds([]); return; }
    debRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(q)}`);
        const data = await res.json();
        setPreds(data.predictions ?? []);
        setIsOpen(true);
      } catch { setPreds([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(debRef.current);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (!wrapRef.current?.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isOpen]);

  const handlePick = useCallback(async (p) => {
    setIsOpen(false); setQuery(""); setPreds([]); setResolv(true);
    try {
      const res  = await fetch(`/api/places/details?place_id=${encodeURIComponent(p.place_id)}`);
      const data = await res.json();
      const result = data.result;
      if (!result?.geometry?.location) return;
      const { lat, lng } = result.geometry.location;
      const { suburb, state } = parseAddressComponents(result.address_components);
      const suburbName = suburb ?? p.description.split(",")[0].trim();
      const climateZone = nearestClimateZone(lat, lng);
      onSelect({ suburb: suburbName, state, lat, lng, climateZone });
    } catch {} finally { setResolv(false); }
  }, [onSelect]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a0c14",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "inherit",
    }}>
      {/* Close */}
      <button
        onClick={onCancel}
        style={{
          position: "absolute", top: 16, right: 20,
          background: "none", border: "none",
          color: "rgba(255,255,255,0.35)", fontSize: 22,
          cursor: "pointer", lineHeight: 1, padding: 4,
        }}
        title="Cancel"
      >×</button>

      {/* Step indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 36,
      }}>
        <StepPip n={1} active />
        <div style={{ width: 28, height: 1, background: "rgba(255,255,255,0.15)" }} />
        <StepPip n={2} />
      </div>

      <div style={{ fontSize: 32, marginBottom: 14, lineHeight: 1 }}>📍</div>
      <h2 style={{
        color: "#ffffff", fontSize: 21, fontWeight: 700,
        letterSpacing: "-0.02em", margin: "0 0 8px", textAlign: "center",
      }}>
        Find your block
      </h2>
      <p style={{
        color: "rgba(255,255,255,0.4)", fontSize: 13,
        lineHeight: 1.6, margin: "0 0 28px", textAlign: "center", maxWidth: 400,
      }}>
        Type your property address, street, or suburb. We'll centre the satellite map on your block.
      </p>

      {/* Search field */}
      <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: 440 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          height: 50, padding: "0 16px", borderRadius: 10,
          border: `1.5px solid ${isOpen ? "rgba(91,127,255,0.55)" : "rgba(255,255,255,0.15)"}`,
          background: "rgba(255,255,255,0.05)",
          transition: "border-color 150ms ease",
          opacity: resolving ? 0.6 : 1,
        }}>
          {loading || resolving ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="rgba(91,127,255,0.8)" strokeWidth="2.5" strokeLinecap="round"
              style={{ flexShrink: 0, animation: "spin 0.8s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. 23 Main St, Fremantle WA or Fremantle"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (e.target.value) setIsOpen(true); }}
            onFocus={() => { if (predictions.length) setIsOpen(true); }}
            disabled={resolving}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#ffffff", fontSize: 14, caretColor: "#5b7fff",
            }}
          />
          {query && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setQuery(""); setPreds([]); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
            >×</button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && predictions.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, boxShadow: "0 10px 32px rgba(0,0,0,0.6)",
            zIndex: 10, overflow: "hidden",
          }}>
            {predictions.map((p, i) => (
              <button
                key={p.place_id}
                onMouseDown={(e) => { e.preventDefault(); handlePick(p); }}
                style={{
                  width: "100%", display: "flex", alignItems: "flex-start",
                  gap: 10, padding: "11px 14px",
                  background: "transparent", border: "none",
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                  color: "#fff", cursor: "pointer", textAlign: "left",
                  transition: "background 100ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                  <span style={{ display: "block", fontWeight: 500, color: "#e8eaf2" }}>
                    {p.structured_formatting?.main_text ?? p.description.split(",")[0]}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
                    {p.structured_formatting?.secondary_text ?? ""}
                  </span>
                </span>
              </button>
            ))}
            <div style={{ padding: "7px 14px 8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>Powered by Google</span>
            </div>
          </div>
        )}

        {isOpen && query.trim() && !loading && predictions.length === 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "12px 14px",
            color: "rgba(255,255,255,0.35)", fontSize: 13, zIndex: 10,
          }}>
            No results — try a suburb name or full address
          </div>
        )}
      </div>

      <p style={{
        color: "rgba(255,255,255,0.2)", fontSize: 11,
        marginTop: 16, textAlign: "center",
      }}>
        Australia only · Searches address, suburb, or postcode
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Step-pip indicator ────────────────────────────────────────────────────────

function StepPip({ n, active }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      border: `1.5px solid ${active ? "rgba(91,127,255,0.6)" : "rgba(255,255,255,0.15)"}`,
      background: active ? "rgba(91,127,255,0.18)" : "transparent",
      color: active ? "#8ba4ff" : "rgba(255,255,255,0.2)",
      fontSize: 12, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{n}</div>
  );
}


// ── Step 2 — Map overlay ──────────────────────────────────────────────────────

function MapStep({ location, onBack, onConfirm }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GMAP_LIBRARIES,
  });

  const containerRef = useRef(null);
  const transformRef = useRef(null);
  const fileInputRef = useRef(null);

  const [transform, setTransform]   = useState(null);
  const [mode, setMode]             = useState(null);   // null | "image" | "rect"
  const [imageUrl, setImageUrl]     = useState(null);
  const [opacity, setOpacity]       = useState(0.75);
  const [flipX, setFlipX]           = useState(false);
  const [flipY, setFlipY]           = useState(false);
  const [frontSide, setFrontSide]   = useState(null);  // "top"|"right"|"bottom"|"left" — rect mode only
  const [mapZoom, setMapZoom]       = useState(18);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [flipOpen, setFlipOpen] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => { transformRef.current = transform; }, [transform]);

  // Escape key
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onBack(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onBack]);

  // Reset front-side when switching modes
  useEffect(() => { if (mode !== "rect") setFrontSide(null); }, [mode]);

  // Initialise transform centred in container whenever mode changes
  useEffect(() => {
    if (!mode || !containerRef.current) return;

    const init = () => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (mode === "rect") {
        // Default block outline: ~25% of the smaller container dimension
        const side = Math.min(width, height) * 0.30;
        setTransform({ x: width / 2, y: height / 2, width: side * 1.4, height: side, rotation: 0 });
      } else if (mode === "image" && imageUrl) {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = Math.min(width, height) * 0.45;
          const s = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
          setTransform({ x: width / 2, y: height / 2, width: img.naturalWidth * s, height: img.naturalHeight * s, rotation: 0 });
        };
        img.src = imageUrl;
      }
    };

    // Small delay to allow container to render
    const id = setTimeout(init, 80);
    return () => clearTimeout(id);
  }, [mode, imageUrl]);

  // ── Unified drag/resize/rotate ────────────────────────────────────────────
  // handleLx/handleLy: local (pre-rotation) offset of the handle from overlay centre
  const startDrag = useCallback((e, type, handleLx = 0, handleLy = 0) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const t0 = transformRef.current;
    if (!t0) return;

    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (type === "move") {
        setTransform((prev) => ({ ...prev, x: t0.x + dx, y: t0.y + dy }));

      } else if (type === "rotate") {
        const raw   = Math.atan2(ev.clientY - t0.y, ev.clientX - t0.x) * 180 / Math.PI + 90;
        const angle = snapToCardinal(raw);
        setTransform((prev) => ({ ...prev, rotation: angle }));

      } else if (type === "scale") {
        // Opposite corner is the fixed anchor; only the dragged corner moves.
        const anchorLx = -handleLx, anchorLy = -handleLy;
        const anchorScreen = {
          x: t0.x + rotateVec(anchorLx, anchorLy, t0.rotation).x,
          y: t0.y + rotateVec(anchorLx, anchorLy, t0.rotation).y,
        };
        const cornerScreen = {
          x: t0.x + rotateVec(handleLx, handleLy, t0.rotation).x,
          y: t0.y + rotateVec(handleLx, handleLy, t0.rotation).y,
        };
        const diagVec = { x: cornerScreen.x - anchorScreen.x, y: cornerScreen.y - anchorScreen.y };
        const diagLen = Math.hypot(diagVec.x, diagVec.y);
        if (diagLen < 1) return;
        const diagUnit = { x: diagVec.x / diagLen, y: diagVec.y / diagLen };
        const mouseNew = { x: startX + dx, y: startY + dy };
        const proj = (mouseNew.x - anchorScreen.x) * diagUnit.x + (mouseNew.y - anchorScreen.y) * diagUnit.y;
        const scale = proj / diagLen;
        if (scale <= 0) return;
        const newW = Math.max(60, t0.width * scale);
        const newH = Math.max(50, t0.height * scale);
        const signCx = anchorLx < 0 ? 1 : -1;
        const signCy = anchorLy < 0 ? 1 : -1;
        const cv = rotateVec(signCx * newW / 2, signCy * newH / 2, t0.rotation);
        setTransform((prev) => ({
          ...prev,
          x: anchorScreen.x + cv.x,
          y: anchorScreen.y + cv.y,
          width: newW,
          height: newH,
        }));

      } else if (type === "side-n" || type === "side-s") {
        // Opposite side stays fixed; only the dragged side moves.
        const rad = t0.rotation * Math.PI / 180;
        const proj = -dx * Math.sin(rad) + dy * Math.cos(rad);
        const mult = type === "side-n" ? -1 : 1;
        const newH = Math.max(50, t0.height + mult * proj);
        const shift = mult * (newH - t0.height) / 2;
        setTransform((prev) => ({
          ...prev,
          height: newH,
          x: t0.x + shift * (-Math.sin(rad)),
          y: t0.y + shift * Math.cos(rad),
        }));

      } else if (type === "side-w" || type === "side-e") {
        // Opposite side stays fixed; only the dragged side moves.
        const rad = t0.rotation * Math.PI / 180;
        const proj = dx * Math.cos(rad) + dy * Math.sin(rad);
        const mult = type === "side-e" ? 1 : -1;
        const newW = Math.max(60, t0.width + mult * proj);
        const shift = mult * (newW - t0.width) / 2;
        setTransform((prev) => ({
          ...prev,
          width: newW,
          x: t0.x + shift * Math.cos(rad),
          y: t0.y + shift * Math.sin(rad),
        }));
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // Touch support
  const startTouch = useCallback((e, type, handleLx = 0, handleLy = 0) => {
    if (e.touches.length !== 1) return;
    e.preventDefault(); e.stopPropagation();
    const touch = e.touches[0];
    const startX = touch.clientX, startY = touch.clientY;
    const t0 = transformRef.current;
    if (!t0) return;

    const onMove = (ev) => {
      const tc = ev.touches[0];
      const dx = tc.clientX - startX, dy = tc.clientY - startY;
      if (type === "move") {
        setTransform((prev) => ({ ...prev, x: t0.x + dx, y: t0.y + dy }));

      } else if (type === "rotate") {
        const raw   = Math.atan2(tc.clientY - t0.y, tc.clientX - t0.x) * 180 / Math.PI + 90;
        const angle = snapToCardinal(raw);
        setTransform((prev) => ({ ...prev, rotation: angle }));

      } else if (type === "scale") {
        const anchorLx = -handleLx, anchorLy = -handleLy;
        const anchorScreen = {
          x: t0.x + rotateVec(anchorLx, anchorLy, t0.rotation).x,
          y: t0.y + rotateVec(anchorLx, anchorLy, t0.rotation).y,
        };
        const cornerScreen = {
          x: t0.x + rotateVec(handleLx, handleLy, t0.rotation).x,
          y: t0.y + rotateVec(handleLx, handleLy, t0.rotation).y,
        };
        const diagVec = { x: cornerScreen.x - anchorScreen.x, y: cornerScreen.y - anchorScreen.y };
        const diagLen = Math.hypot(diagVec.x, diagVec.y);
        if (diagLen < 1) return;
        const diagUnit = { x: diagVec.x / diagLen, y: diagVec.y / diagLen };
        const mouseNew = { x: startX + dx, y: startY + dy };
        const proj = (mouseNew.x - anchorScreen.x) * diagUnit.x + (mouseNew.y - anchorScreen.y) * diagUnit.y;
        const scale = proj / diagLen;
        if (scale <= 0) return;
        const newW = Math.max(60, t0.width * scale);
        const newH = Math.max(50, t0.height * scale);
        const signCx = anchorLx < 0 ? 1 : -1;
        const signCy = anchorLy < 0 ? 1 : -1;
        const cv = rotateVec(signCx * newW / 2, signCy * newH / 2, t0.rotation);
        setTransform((prev) => ({
          ...prev,
          x: anchorScreen.x + cv.x,
          y: anchorScreen.y + cv.y,
          width: newW,
          height: newH,
        }));

      } else if (type === "side-n" || type === "side-s") {
        const rad = t0.rotation * Math.PI / 180;
        const proj = -dx * Math.sin(rad) + dy * Math.cos(rad);
        const mult = type === "side-n" ? -1 : 1;
        const newH = Math.max(50, t0.height + mult * proj);
        const shift = mult * (newH - t0.height) / 2;
        setTransform((prev) => ({
          ...prev,
          height: newH,
          x: t0.x + shift * (-Math.sin(rad)),
          y: t0.y + shift * Math.cos(rad),
        }));

      } else if (type === "side-w" || type === "side-e") {
        const rad = t0.rotation * Math.PI / 180;
        const proj = dx * Math.cos(rad) + dy * Math.sin(rad);
        const mult = type === "side-e" ? 1 : -1;
        const newW = Math.max(60, t0.width + mult * proj);
        const shift = mult * (newW - t0.width) / 2;
        setTransform((prev) => ({
          ...prev,
          width: newW,
          x: t0.x + shift * Math.cos(rad),
          y: t0.y + shift * Math.sin(rad),
        }));
      }
    };
    const onEnd = () => {
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }, []);

  // ── Handle image upload ───────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setMode("image");
    setFlipX(false);
    setFlipY(false);
  };

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!transform || isConfirming) return;
    setIsConfirming(true);
    try {
      const rotation     = ((transform.rotation % 360) + 360) % 360;
      // northBearing: how many degrees clockwise from geographic north the
      // plan's "up" direction faces, after the user has rotated it on the map.
      const northBearing = ((360 - rotation) % 360 + 360) % 360;

      let planImageUrl = null;
      let planType     = mode;
      if (mode === "image") {
        planImageUrl = imageUrl;
      } else if (mode === "rect") {
        planImageUrl = makeBlockOutlinePng(transform.width, transform.height, frontSide);
        planType = "rectangle";
      }

      onConfirm({
        location,
        northBearing: Math.round(northBearing),
        northLocked: true,
        planType,
        planImageUrl,
        frontSide: mode === "rect" ? frontSide : null,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Handles for overlay ───────────────────────────────────────────────────
  // Side handles only shown for block outline (rect) — floor plan is corners-only (proportional)
  const handles = transform ? (() => {
    const { width: w, height: h, rotation } = transform;
    const hw = w / 2, hh = h / 2;
    const corners = [
      { id: "tl", lx: -hw, ly: -hh }, { id: "tr", lx: hw, ly: -hh },
      { id: "bl", lx: -hw, ly: hh  }, { id: "br", lx: hw, ly: hh  },
    ].map((c) => ({ ...c, ...rotateVec(c.lx, c.ly, rotation), type: "scale", isCorner: true }));
    const sides = mode === "rect" ? [
      { id: "sn", lx: 0,   ly: -hh, type: "side-n", cursor: "ns-resize" },
      { id: "ss", lx: 0,   ly:  hh, type: "side-s", cursor: "ns-resize" },
      { id: "sw", lx: -hw, ly: 0,   type: "side-w", cursor: "ew-resize" },
      { id: "se", lx:  hw, ly: 0,   type: "side-e", cursor: "ew-resize" },
    ].map((s) => ({ ...s, ...rotateVec(s.lx, s.ly, rotation), isSide: true })) : [];
    const rv = rotateVec(0, -hh - 36, rotation);
    return [...corners, ...sides, { id: "rot", ...rv, type: "rotate", isRotate: true }];
  })() : [];

  const northBearingDisplay = transform
    ? ((360 - ((transform.rotation % 360 + 360) % 360)) % 360) | 0
    : 0;
  const rotationDisplay = transform ? (((transform.rotation % 360) + 360) % 360) | 0 : 0;

  // useMemo keeps the same object reference until lat/lng actually change.
  // Without this, every setTransform() re-render creates a new {lat,lng} object,
  // which @react-google-maps/api treats as a changed center and calls map.panTo(),
  // snapping the map back to the original location mid-drag.
  const mapCenter = useMemo(
    () => location ? { lat: location.lat, lng: location.lng } : { lat: -31.95, lng: 115.86 },
    [location?.lat, location?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Hint message ──────────────────────────────────────────────────────────
  const hintText = mode === null
    ? "Choose whether to overlay a floor plan or use a simple block outline"
    : mode === "image"
    ? "Drag to move · Corner handles to resize (proportional) · ↻ amber handle to rotate"
    : "Drag to move · Corner handles to resize proportionally · Side handles to resize width or height independently · ↻ amber handle to rotate";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0f1117",
      display: "flex", flexDirection: "column",
      fontFamily: "inherit",
    }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        background: "#1a1d27",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Primary row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 12px", height: isMobile ? 48 : 54,
        }}>
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              height: 30, padding: "0 10px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)", cursor: "pointer",
              fontSize: 12, fontWeight: 500, flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.11)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <StepPip n={1} />
            <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.15)" }} />
            <StepPip n={2} active />
          </div>

          {/* Title — desktop only */}
          {!isMobile && (
            <div style={{ marginLeft: 4 }}>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Position your block</div>
              {location && (
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                  {location.suburb}{location.state ? `, ${location.state}` : ""}
                  {location.climateZone ? ` · NCC Zone ${location.climateZone}` : ""}
                </div>
              )}
            </div>
          )}

          {/* Location chip — mobile only */}
          {isMobile && location && (
            <div style={{
              color: "rgba(255,255,255,0.45)", fontSize: 11,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 100, flexShrink: 1,
            }}>
              {location.suburb}{location.state ? `, ${location.state}` : ""}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Desktop controls inline */}
          {!isMobile && mode && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <Pill onClick={() => setFlipX((f) => !f)} active={flipX} title="Flip horizontal">↔ Flip H</Pill>
                <Pill onClick={() => setFlipY((f) => !f)} active={flipY} title="Flip vertical">↕ Flip V</Pill>
              </div>
              <Sep />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, whiteSpace: "nowrap" }}>Opacity</span>
              <input
                type="range" min={0.1} max={1} step={0.05} value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                style={{ width: 70, accentColor: "#5b7fff", cursor: "pointer" }}
              />
              <Sep />
              {mode === "image" && (
                <Pill onClick={() => fileInputRef.current?.click()} title="Change floor plan image">📁 Change image</Pill>
              )}
              {mode === "rect" && (
                <Pill onClick={() => fileInputRef.current?.click()} title="Upload a floor plan instead">📐 Add floor plan</Pill>
              )}
              <Sep />
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!mode || !transform || isConfirming}
            style={{
              height: 32, padding: isMobile ? "0 12px" : "0 18px", borderRadius: 6,
              border: "none",
              background: (!mode || !transform || isConfirming) ? "rgba(91,127,255,0.25)" : "#5b7fff",
              color: (!mode || !transform || isConfirming) ? "rgba(255,255,255,0.35)" : "#fff",
              cursor: (!mode || !transform || isConfirming) ? "default" : "pointer",
              fontSize: isMobile ? 12 : 13, fontWeight: 600, letterSpacing: "-0.01em", flexShrink: 0,
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => { if (mode && transform && !isConfirming) e.currentTarget.style.background = "#6d8fff"; }}
            onMouseLeave={(e) => { if (mode && transform && !isConfirming) e.currentTarget.style.background = "#5b7fff"; }}
          >
            {isConfirming ? "…" : isMobile ? "Confirm →" : "Confirm block →"}
          </button>
        </div>

        {/* Secondary row — mobile controls (only when mode is active) */}
        {isMobile && mode && (
          <div style={{
            display: "flex", alignItems: "center",
            padding: "0 12px 10px", gap: 8,
          }}>
            {/* Flip dropdown — left aligned */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Pill
                onClick={() => setFlipOpen((f) => !f)}
                active={flipX || flipY || flipOpen}
                title="Flip options"
              >
                ↔↕ Flip {flipOpen ? "▴" : "▾"}
              </Pill>
              {flipOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 20,
                  background: "#1e2130",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  display: "flex", flexDirection: "column",
                }}>
                  <button
                    onClick={() => setFlipX((f) => !f)}
                    style={{
                      padding: "10px 16px", textAlign: "left", whiteSpace: "nowrap",
                      background: flipX ? "rgba(91,127,255,0.18)" : "transparent",
                      border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)",
                      color: flipX ? "#8ba4ff" : "rgba(255,255,255,0.75)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                    }}
                  >↔ Flip horizontal</button>
                  <button
                    onClick={() => setFlipY((f) => !f)}
                    style={{
                      padding: "10px 16px", textAlign: "left", whiteSpace: "nowrap",
                      background: flipY ? "rgba(91,127,255,0.18)" : "transparent",
                      border: "none",
                      color: flipY ? "#8ba4ff" : "rgba(255,255,255,0.75)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                    }}
                  >↕ Flip vertical</button>
                </div>
              )}
            </div>

            {/* Opacity slider — stretches between flip and add plan */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              {/* Half-circle opacity icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                <path d="M12 2a10 10 0 0 1 0 20z" fill="rgba(255,255,255,0.35)"/>
              </svg>
              <input
                type="range" min={0.1} max={1} step={0.05} value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#5b7fff", cursor: "pointer", minWidth: 0 }}
              />
            </div>

            {/* Add plan — right-aligned to sit under Confirm button */}
            {mode === "image" && (
              <Pill onClick={() => fileInputRef.current?.click()} title="Change floor plan image">📁 Change</Pill>
            )}
            {mode === "rect" && (
              <Pill onClick={() => fileInputRef.current?.click()} title="Upload a floor plan instead">📐 Add plan</Pill>
            )}
          </div>
        )}
      </div>

      {/* ── Map + overlay area ── */}
      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Map */}
        {loadError && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, textAlign: "center" }}>
            <span style={{ fontSize: 28 }}>🗺️</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Map failed to load. Check that the Maps JavaScript API is enabled.</span>
          </div>
        )}

        {!isLoaded && !loadError && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading map…</span>
          </div>
        )}

        {isLoaded && !loadError && (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={18}
            onLoad={(map) => { mapRef.current = map; }}
            onZoomChanged={() => { if (mapRef.current) setMapZoom(mapRef.current.getZoom()); }}
            options={{
              mapTypeId: "satellite",
              tilt: 0,
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: "greedy",
              keyboardShortcuts: false,
            }}
          />
        )}

        {/* ── Mode chooser (shows when mode is null) ── */}
        {isLoaded && !loadError && mode === null && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(8,11,16,0.72)",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              background: "#1a1d27",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: isMobile ? 14 : 18,
              padding: isMobile ? "24px 18px" : "36px 32px",
              maxWidth: 500, width: "90%", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 14, lineHeight: 1 }}>🏠</div>
              <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
                What would you like to place on the map?
              </h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6, margin: "0 0 26px" }}>
                Place your floor plan directly on the satellite imagery for the most accurate result,
                or use a simple block outline if you don't have a plan yet.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <ChoiceBtn
                  icon="📐"
                  label="Upload floor plan"
                  desc="JPG or PNG image"
                  color="#5b7fff"
                  onClick={() => fileInputRef.current?.click()}
                />
                <ChoiceBtn
                  icon="□"
                  label="Use block outline"
                  desc="Resize to fit your block"
                  color="#34D399"
                  onClick={() => setMode("rect")}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Plan / rectangle overlay ── */}
        {transform && mode && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

            {/* The plan image or rectangle */}
            <div
              onMouseDown={(e) => startDrag(e, "move")}
              onTouchStart={(e) => startTouch(e, "move")}
              style={{
                position: "absolute",
                left: transform.x, top: transform.y,
                width: transform.width, height: transform.height,
                transform: `translate(-50%, -50%) rotate(${transform.rotation}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`,
                opacity: mode === "rect" ? 1 : opacity,
                pointerEvents: "all",
                cursor: "grab",
                userSelect: "none",
                willChange: "transform",
                // Style for rect mode
                ...(mode === "rect" ? {
                  border: "2px dashed rgba(52,211,153,0.75)",
                  boxShadow: "0 0 0 1px rgba(52,211,153,0.2), 0 4px 24px rgba(0,0,0,0.5)",
                  background: "rgba(52,211,153,0.05)",
                } : {
                  boxShadow: "0 0 0 2px rgba(91,127,255,0.85), 0 6px 32px rgba(0,0,0,0.5)",
                }),
              }}
            >
              {mode === "image" && (
                <img
                  src={imageUrl}
                  draggable={false}
                  alt="Floor plan"
                  style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }}
                />
              )}
              {mode === "rect" && (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <span style={{ color: "rgba(52,211,153,0.6)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, userSelect: "none" }}>
                    Block outline
                  </span>
                </div>
              )}
            </div>

            {/* Dashed line from centre to rotation handle */}
            {(() => {
              const rv = rotateVec(0, -(transform.height / 2 + 36), transform.rotation);
              return (
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <line
                    x1={transform.x} y1={transform.y}
                    x2={transform.x + rv.x} y2={transform.y + rv.y}
                    stroke={mode === "rect" ? "rgba(52,211,153,0.45)" : "rgba(91,127,255,0.45)"}
                    strokeWidth={1.5} strokeDasharray="4 3"
                  />
                </svg>
              );
            })()}

            {/* Handles */}
            {handles.map((h) => {
              const accentColor = mode === "rect" ? "#34D399" : "#5b7fff";
              const sz   = h.isRotate ? 22 : h.isSide ? 10 : 12;
              const off  = h.isRotate ? 11 : h.isSide ? 5 : 6;
              // Side handles are pill-shaped — wider on their active axis
              const sideW = (h.type === "side-n" || h.type === "side-s") ? 20 : 10;
              const sideH = (h.type === "side-w" || h.type === "side-e") ? 20 : 10;
              const offW  = (h.type === "side-n" || h.type === "side-s") ? 10 : 5;
              const offH  = (h.type === "side-w" || h.type === "side-e") ? 10 : 5;
              return (
                <div
                  key={h.id}
                  onMouseDown={(e) => startDrag(e, h.type, h.lx, h.ly)}
                  onTouchStart={(e) => startTouch(e, h.type, h.lx, h.ly)}
                  style={{
                    position: "absolute",
                    left: transform.x + h.x - (h.isSide ? offW : off),
                    top:  transform.y + h.y - (h.isSide ? offH : off),
                    width:  h.isRotate ? 22 : h.isSide ? sideW : 12,
                    height: h.isRotate ? 22 : h.isSide ? sideH : 12,
                    borderRadius: h.isRotate ? "50%" : h.isSide ? 4 : 3,
                    background: h.isRotate ? "#F59E0B" : h.isSide ? "rgba(255,255,255,0.85)" : "#ffffff",
                    border: `2px solid ${h.isRotate ? "#d97706" : accentColor}`,
                    cursor: h.isRotate ? "grab" : h.cursor ?? "nwse-resize",
                    pointerEvents: "all",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.65)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, color: "#000", fontWeight: 800, lineHeight: 1,
                    zIndex: h.isSide ? 1 : 2,
                  }}
                >
                  {h.isRotate ? "↻" : null}
                </div>
              );
            })}

            {/* ── Front-side selector (rect mode only) ── */}
            {mode === "rect" && (() => {
              const { width: w, height: h, rotation } = transform;
              const hw = w / 2, hh = h / 2;
              // Four sides: local-coord endpoints + inset tap-target position
              // Push badges toward edges on mobile to reduce overlap on small blocks
              const edgeFactor = isMobile ? 0.72 : 0.6;
              const sides = [
                { id: "top",    p1: [-hw, -hh], p2: [hw, -hh],  tx: 0,                 ty: -hh * edgeFactor },
                { id: "bottom", p1: [-hw,  hh], p2: [hw,  hh],  tx: 0,                 ty:  hh * edgeFactor },
                { id: "left",   p1: [-hw, -hh], p2: [-hw, hh],  tx: -hw * edgeFactor,  ty: 0 },
                { id: "right",  p1: [ hw, -hh], p2: [ hw, hh],  tx:  hw * edgeFactor,  ty: 0 },
              ];
              return (
                <>
                  {/* Amber SVG line over the selected front edge */}
                  {frontSide && (() => {
                    const s = sides.find(s => s.id === frontSide);
                    const a = rotateVec(s.p1[0], s.p1[1], rotation);
                    const b = rotateVec(s.p2[0], s.p2[1], rotation);
                    return (
                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 4 }}>
                        <line
                          x1={transform.x + a.x} y1={transform.y + a.y}
                          x2={transform.x + b.x} y2={transform.y + b.y}
                          stroke="#F59E0B" strokeWidth={3}
                        />
                      </svg>
                    );
                  })()}

                  {/* Tap targets — clickable labels at each side midpoint (inset) */}
                  {sides.map((s) => {
                    const isFront = frontSide === s.id;
                    const pos = rotateVec(s.tx, s.ty, rotation);
                    return (
                      <div
                        key={s.id}
                        onClick={(e) => { e.stopPropagation(); setFrontSide(isFront ? null : s.id); }}
                        style={{
                          position: "absolute",
                          left: transform.x + pos.x - (isMobile ? 20 : 28),
                          top:  transform.y + pos.y - (isMobile ? 8 : 11),
                          width: isMobile ? 40 : 56, height: isMobile ? 16 : 22,
                          borderRadius: isMobile ? 8 : 11,
                          background: isFront ? "#F59E0B" : "rgba(10,12,18,0.82)",
                          border: `1.5px solid ${isFront ? "#d97706" : "rgba(245,158,11,0.45)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                          pointerEvents: "all",
                          color: isFront ? "#000" : "rgba(245,158,11,0.85)",
                          fontSize: isMobile ? 7 : 9, fontWeight: 700,
                          letterSpacing: "0.05em", textTransform: "uppercase",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.55)",
                          zIndex: 3, userSelect: "none",
                        }}
                      >
                        {isFront ? "✓ Front" : "Front?"}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {/* ── North badge (top right) ── */}
        <div style={{
          position: "absolute", top: 16, right: 60,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
          borderRadius: 8, padding: "8px 12px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          pointerEvents: "none", border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <svg width="16" height="22" viewBox="0 0 16 22">
            <polygon points="8,1 13,14 8,11 3,14" fill="#ef4444" />
            <polygon points="8,21 3,8 8,11 13,8" fill="rgba(255,255,255,0.3)" />
          </svg>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, letterSpacing: "0.06em", fontWeight: 700 }}>NORTH</span>
        </div>

        {/* ── Rotation / bearing readout (top left) ── */}
        {transform && mode && (
          <div style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            borderRadius: 8, padding: "10px 14px",
            pointerEvents: "none", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.06em", marginBottom: 4 }}>PLAN ROTATION</div>
            <div style={{ color: "#F59E0B", fontSize: 18, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.01em" }}>{rotationDisplay}°</div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 3 }}>
              North bearing → <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{northBearingDisplay}°</span>
            </div>
          </div>
        )}

        {/* ── Hint bar ── */}
        <div style={{
          position: "absolute", bottom: 12, left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
          color: "rgba(255,255,255,0.65)",
          fontSize: isMobile ? 11 : 12,
          padding: isMobile ? "7px 14px" : "9px 20px", borderRadius: 20,
          maxWidth: "calc(100vw - 32px)", textAlign: "center",
          pointerEvents: "none",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          {isMobile
            ? mode === null
              ? "Choose how to place your block on the map"
              : mode === "image"
              ? "Drag to move · handles to resize and rotate"
              : "Drag, resize or rotate · tap a side to set the street front"
            : hintText}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function Pill({ onClick, active, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        height: 28, padding: "0 10px", borderRadius: 6,
        border: `1px solid ${active ? "rgba(91,127,255,0.5)" : "rgba(255,255,255,0.12)"}`,
        background: active ? "rgba(91,127,255,0.18)" : "rgba(255,255,255,0.06)",
        color: active ? "#8ba4ff" : "rgba(255,255,255,0.65)",
        cursor: "pointer", fontSize: 11, fontWeight: 500,
        display: "flex", alignItems: "center", gap: 4,
        transition: "background 120ms ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />;
}

function ChoiceBtn({ icon, label, desc, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 170px", padding: "18px 16px",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${color}33`,
        borderRadius: 12, cursor: "pointer", textAlign: "center",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}11`;
        e.currentTarget.style.borderColor = `${color}66`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = `${color}33`;
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8, lineHeight: 1 }}>{icon}</div>
      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{desc}</div>
    </button>
  );
}

// ── Main export — orchestrates the two steps ──────────────────────────────────

export default function BlockMapModal({ onConfirm, onCancel }) {
  const [location, setLocation] = useState(null);

  if (!location) {
    return <LocationStep onSelect={setLocation} onCancel={onCancel} />;
  }

  return (
    <MapStep
      location={location}
      onBack={() => setLocation(null)}
      onConfirm={onConfirm}
    />
  );
}
