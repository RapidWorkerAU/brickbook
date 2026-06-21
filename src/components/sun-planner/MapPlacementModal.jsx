"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const GMAP_LIBRARIES = [];
const DEFAULT_ZOOM = 18;

// 15m × 12m default block rectangle
const RECT_W_M = 15;
const RECT_H_M = 12;

function rotateVec(x, y, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

// Loose snap to cardinal angles — pulls within 8° of 0/90/180/270
function snapToCardinal(angle) {
  const a = ((angle % 360) + 360) % 360;
  for (const snap of [0, 90, 180, 270, 360]) {
    const diff = Math.min(Math.abs(a - snap), 360 - Math.abs(a - snap));
    if (diff <= 8) return snap % 360;
  }
  return angle;
}

// pixels per metre at a given zoom level and latitude
function ppm(lat, zoom) {
  return (256 * Math.pow(2, zoom) * Math.cos((lat * Math.PI) / 180)) / 40075017;
}

function staticMapUrl(lat, lng, zoom, containerW, containerH) {
  const w = Math.min(640, Math.round(containerW));
  const h = Math.min(640, Math.round(containerH));
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&maptype=satellite&key=${key}`;
}

export default function MapPlacementModal({ imageUrl, selectedLocation, onConfirm, onClose }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GMAP_LIBRARIES,
  });

  const containerRef  = useRef(null);
  const transformRef  = useRef(null);
  const mapRef        = useRef(null); // Google Maps instance
  const initDoneRef   = useRef(false);

  // { x, y, width, height, rotation, flipH, flipV }
  const [transform, setTransform] = useState(null);
  const [opacity, setOpacity]     = useState(0.7);

  const isRectMode = !imageUrl;

  useEffect(() => { transformRef.current = transform; }, [transform]);

  // Escape closes modal
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Init transform once — either after map loads or on a short delay
  const initTransform = useCallback(() => {
    if (initDoneRef.current || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (!width || !height) return;
    initDoneRef.current = true;

    const lat  = selectedLocation?.lat ?? -27;
    const zoom = mapRef.current?.getZoom?.() ?? DEFAULT_ZOOM;

    if (isRectMode) {
      const pixPerM = ppm(lat, zoom);
      // Start at natural map scale but enforce a visible minimum
      const naturalW = RECT_W_M * pixPerM;
      const naturalH = RECT_H_M * pixPerM;
      const minPx    = 80;
      const boost    = Math.max(1, minPx / Math.min(naturalW, naturalH));
      setTransform({
        x: width / 2, y: height / 2,
        width:  Math.max(minPx, naturalW * boost),
        height: Math.max(minPx * (RECT_H_M / RECT_W_M), naturalH * boost),
        rotation: 0, flipH: false, flipV: false,
      });
    } else {
      const img    = new window.Image();
      img.onload   = () => {
        if (!containerRef.current) return;
        const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
        const nw     = img.naturalWidth;
        const nh     = img.naturalHeight;
        const maxDim = Math.min(cw, ch) * 0.45;
        const s      = maxDim / Math.max(nw, nh);
        setTransform({ x: cw / 2, y: ch / 2, width: nw * s, height: nh * s, rotation: 0, flipH: false, flipV: false });
      };
      img.src = imageUrl;
    }
  }, [imageUrl, isRectMode, selectedLocation]);

  // Trigger init once map is ready (small delay lets DOM settle)
  useEffect(() => {
    if (!isLoaded || loadError) return;
    const t = setTimeout(initTransform, 120);
    return () => clearTimeout(t);
  }, [isLoaded, loadError, initTransform]);

  // ── Drag logic ────────────────────────────────────────────────────────────────
  const startDrag = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();

    const startX   = e.clientX;
    const startY   = e.clientY;
    const t0       = transformRef.current;
    if (!t0) return;

    const origDist = Math.hypot(startX - t0.x, startY - t0.y);

    const onMove = (ev) => {
      if (type === "move") {
        setTransform((p) => ({
          ...p,
          x: t0.x + (ev.clientX - startX),
          y: t0.y + (ev.clientY - startY),
        }));
      } else if (type === "rotate") {
        const raw   = Math.atan2(ev.clientY - t0.y, ev.clientX - t0.x) * 180 / Math.PI + 90;
        const angle = snapToCardinal(raw);
        setTransform((p) => ({ ...p, rotation: angle }));
      } else if (type === "scale") {
        if (origDist < 1) return;
        const dist = Math.hypot(ev.clientX - t0.x, ev.clientY - t0.y);
        const s    = Math.max(0.1, dist / origDist);
        setTransform((p) => ({
          ...p,
          width:  Math.max(40, t0.width  * s),
          height: Math.max(40, t0.height * s),
        }));
      }
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, []);

  const toggleFlip = useCallback((axis) => {
    setTransform((p) => p ? { ...p, [axis]: !p[axis] } : p);
  }, []);

  // ── Confirm ───────────────────────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (!transform || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const cx   = rect.width  / 2;
    const cy   = rect.height / 2;

    const mapInst  = mapRef.current;
    const zoom     = mapInst?.getZoom?.()     ?? DEFAULT_ZOOM;
    const center   = mapInst?.getCenter?.();
    const centerLat = center?.lat?.() ?? selectedLocation?.lat ?? -27;
    const centerLng = center?.lng?.() ?? selectedLocation?.lng ?? 115.86;

    const pixPerM  = ppm(centerLat, zoom);

    // northBearing: plan rotated R° clockwise → top points R° E of N → NB = (360-R)
    const nb = ((360 - transform.rotation) % 360 + 360) % 360;

    onConfirm({
      northBearing:      Math.round(nb),
      northLocked:       true,
      planType:          isRectMode ? "rectangle" : "image",
      planTransform: {
        scaleX:        transform.flipH ? -1 : 1,
        scaleY:        transform.flipV ? -1 : 1,
        rotation:      transform.rotation,
        offsetXMetres: (transform.x - cx) / pixPerM,
        offsetYMetres: (transform.y - cy) / pixPerM,
      },
      planSize: {
        widthMetres:  transform.width  / pixPerM,
        heightMetres: transform.height / pixPerM,
      },
      planImageUrl:      imageUrl ?? null,
      mapCenter:         { lat: centerLat, lng: centerLng },
      mapPixelsPerMetre: pixPerM,
      mapSnapshot:       staticMapUrl(centerLat, centerLng, zoom, rect.width, rect.height),
    });
    onClose();
  }, [transform, selectedLocation, imageUrl, isRectMode, onConfirm, onClose]);

  // ── Handle descriptors ────────────────────────────────────────────────────────
  const handles = transform ? (() => {
    const { width: w, height: h, rotation } = transform;
    const hw = w / 2, hh = h / 2;
    const corners = [
      { id: "tl", lx: -hw, ly: -hh, cursor: "nwse-resize" },
      { id: "tr", lx:  hw, ly: -hh, cursor: "nesw-resize" },
      { id: "bl", lx: -hw, ly:  hh, cursor: "nesw-resize" },
      { id: "br", lx:  hw, ly:  hh, cursor: "nwse-resize" },
    ].map((c) => ({ ...c, ...rotateVec(c.lx, c.ly, rotation), type: "scale" }));

    const rv = rotateVec(0, -hh - 34, rotation);
    return [...corners, { id: "rot", ...rv, cursor: "grab", type: "rotate", isRotate: true }];
  })() : [];

  const mapCenter = selectedLocation
    ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
    : { lat: -31.95, lng: 115.86 };

  // Metres readout (live, uses DEFAULT_ZOOM since map zoom can change)
  const livePPM = ppm(selectedLocation?.lat ?? -27, mapRef.current?.getZoom?.() ?? DEFAULT_ZOOM);
  const widthM  = transform ? (transform.width  / livePPM).toFixed(1) : "--";
  const heightM = transform ? (transform.height / livePPM).toFixed(1) : "--";

  // ── Header button style ───────────────────────────────────────────────────────
  const hBtn = (active) => ({
    display: "flex", alignItems: "center", gap: 5,
    height: 30, padding: "0 10px", borderRadius: 6,
    border: `1px solid ${active ? "rgba(91,127,255,0.5)" : "rgba(255,255,255,0.12)"}`,
    background: active ? "rgba(91,127,255,0.18)" : "rgba(255,255,255,0.06)",
    color: active ? "#8ba4ff" : "rgba(255,255,255,0.7)",
    cursor: "pointer", fontSize: 12, fontWeight: 500, flexShrink: 0,
    transition: "background 150ms ease",
  });

  const divider = (
    <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0f1117",
      display: "flex", flexDirection: "column",
      fontFamily: "inherit",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 12px", minHeight: 52, flexShrink: 0,
        background: "#1a1d27",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexWrap: "wrap",
        rowGap: 6,
      }}>
        {/* Cancel */}
        <button onClick={onClose} style={hBtn(false)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Cancel
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {isRectMode ? "Position Block on Map" : "Position Floor Plan on Map"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
            {isRectMode
              ? "Drag and rotate the green block to match your property outline"
              : "Rotate to align with your block · Corner handles to resize"}
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Flip H */}
        <button onClick={() => toggleFlip("flipH")} style={hBtn(transform?.flipH)} title="Flip horizontally">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="3" x2="12" y2="21" />
            <polyline points="5 8 2 12 5 16" />
            <polyline points="19 8 22 12 19 16" />
          </svg>
          Flip H
        </button>

        {/* Flip V */}
        <button onClick={() => toggleFlip("flipV")} style={hBtn(transform?.flipV)} title="Flip vertically">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <polyline points="8 5 12 2 16 5" />
            <polyline points="8 19 12 22 16 19" />
          </svg>
          Flip V
        </button>

        {divider}

        {/* Opacity slider — image mode only */}
        {!isRectMode && (
          <>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, whiteSpace: "nowrap" }}>
              Opacity
            </span>
            <input
              type="range" min={0.1} max={1} step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: 72, accentColor: "#5b7fff", cursor: "pointer" }}
            />
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, minWidth: 28, textAlign: "right" }}>
              {Math.round(opacity * 100)}%
            </span>
            {divider}
          </>
        )}

        {/* Done */}
        <button
          onClick={handleDone}
          style={{
            height: 32, padding: "0 18px", borderRadius: 6,
            border: "none", background: "#5b7fff",
            color: "#ffffff", cursor: "pointer",
            fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em",
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#6d8fff")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#5b7fff")}
        >
          Done
        </button>
      </div>

      {/* ── Map + overlay ── */}
      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {loadError && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 10, padding: 32, textAlign: "center",
          }}>
            <span style={{ fontSize: 28 }}>🗺️</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
              Map failed to load. Check that the Maps JavaScript API is enabled for this key.
            </span>
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
            zoom={DEFAULT_ZOOM}
            onLoad={(map) => { mapRef.current = map; initTransform(); }}
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

        {/* ── Plan / block overlay ── */}
        {transform && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

            {/* The draggable element */}
            <div
              onMouseDown={(e) => startDrag(e, "move")}
              style={{
                position: "absolute",
                left: transform.x,
                top:  transform.y,
                width:  transform.width,
                height: transform.height,
                transform: `translate(-50%,-50%) rotate(${transform.rotation}deg) scaleX(${transform.flipH ? -1 : 1}) scaleY(${transform.flipV ? -1 : 1})`,
                opacity: isRectMode ? 0.88 : opacity,
                pointerEvents: "all",
                cursor: "grab",
                boxShadow: `0 0 0 2px ${isRectMode ? "rgba(52,211,153,0.85)" : "rgba(91,127,255,0.85)"}, 0 6px 32px rgba(0,0,0,0.5)`,
                userSelect: "none",
                willChange: "transform",
              }}
            >
              {isRectMode ? (
                <div style={{
                  width: "100%", height: "100%",
                  background: "rgba(52,211,153,0.14)",
                  border: "2px solid rgba(52,211,153,0.55)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                  <span style={{ color: "rgba(52,211,153,0.9)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", pointerEvents: "none", userSelect: "none" }}>
                    BLOCK
                  </span>
                  <span style={{ color: "rgba(52,211,153,0.6)", fontSize: 9, pointerEvents: "none", userSelect: "none" }}>
                    {widthM}m × {heightM}m
                  </span>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  draggable={false}
                  alt="Floor plan"
                  style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }}
                />
              )}
            </div>

            {/* Dashed line from center to rotation handle */}
            {(() => {
              const rv = rotateVec(0, -(transform.height / 2 + 34), transform.rotation);
              return (
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <line
                    x1={transform.x} y1={transform.y}
                    x2={transform.x + rv.x} y2={transform.y + rv.y}
                    stroke="rgba(91,127,255,0.5)" strokeWidth={1.5} strokeDasharray="4 3"
                  />
                </svg>
              );
            })()}

            {/* Corner + rotation handles */}
            {handles.map((h) => (
              <div
                key={h.id}
                onMouseDown={(e) => startDrag(e, h.type)}
                style={{
                  position: "absolute",
                  left:   transform.x + h.x - (h.isRotate ? 10 : 6),
                  top:    transform.y + h.y - (h.isRotate ? 10 : 6),
                  width:  h.isRotate ? 20 : 12,
                  height: h.isRotate ? 20 : 12,
                  borderRadius: h.isRotate ? "50%" : 3,
                  background: h.isRotate ? "#F59E0B" : "#ffffff",
                  border: `2px solid ${h.isRotate ? "#d97706" : (isRectMode ? "#34d399" : "#5b7fff")}`,
                  cursor: h.cursor,
                  pointerEvents: "all",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.65)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "#000", fontWeight: 800, lineHeight: 1,
                  zIndex: 2,
                }}
              >
                {h.isRotate ? "↻" : null}
              </div>
            ))}
          </div>
        )}

        {/* ── Hint bar ── */}
        <div style={{
          position: "absolute", bottom: 16, left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
          color: "rgba(255,255,255,0.72)", fontSize: 12, padding: "8px 18px",
          borderRadius: 20, whiteSpace: "nowrap", pointerEvents: "none",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          {isRectMode
            ? "Zoom in · Drag to move · Corners to resize · ↻ amber handle to rotate · Flip H/V above"
            : "Drag to move · Corners to resize · ↻ amber handle to rotate · Flip H/V above"}
        </div>

        {/* ── North indicator ── */}
        <div style={{
          position: "absolute", top: 16, right: 60,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
          borderRadius: 8, padding: "8px 10px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          pointerEvents: "none", border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <svg width="16" height="22" viewBox="0 0 16 22">
            <polygon points="8,1 13,14 8,11 3,14" fill="#ef4444" />
            <polygon points="8,21 3,8 8,11 13,8"  fill="rgba(255,255,255,0.3)" />
          </svg>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, letterSpacing: "0.06em", fontWeight: 700 }}>
            NORTH
          </span>
        </div>

        {/* ── Live readout ── */}
        {transform && (
          <div style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            borderRadius: 8, padding: "8px 14px",
            pointerEvents: "none", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: "0.06em", marginBottom: 3 }}>
              {isRectMode ? "BLOCK" : "PLAN"} ROTATION
            </div>
            <div style={{ color: "#F59E0B", fontSize: 16, fontWeight: 700, fontFamily: "'SF Mono','Fira Code',monospace" }}>
              {((transform.rotation % 360) + 360) % 360 | 0}°
            </div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, marginTop: 2 }}>
              N bearing → {(((360 - transform.rotation) % 360) + 360) % 360 | 0}°
            </div>
            {isRectMode && (
              <div style={{ color: "rgba(52,211,153,0.6)", fontSize: 9, marginTop: 3 }}>
                {widthM}m × {heightM}m
              </div>
            )}
            {(transform.flipH || transform.flipV) && (
              <div style={{ color: "rgba(91,127,255,0.65)", fontSize: 9, marginTop: 2 }}>
                Flipped: {[transform.flipH && "H", transform.flipV && "V"].filter(Boolean).join(" + ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
