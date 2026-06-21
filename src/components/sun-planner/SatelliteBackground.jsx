"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES = [];

const MAP_OPTIONS_BASE = {
  mapTypeId:              "satellite",
  tilt:                   0,
  disableDefaultUI:       true,
  gestureHandling:        "none",
  keyboardShortcuts:      false,
  clickableIcons:         false,
  draggable:              false,
  scrollwheel:            false,
  disableDoubleClickZoom: true,
  zoomControl:            false,
};

const CONTAINER_STYLE = { width: "100%", height: "100%", pointerEvents: "none" };

export default function SatelliteBackground({
  mapCenter,
  mapZoom,           // fallback only — real zoom is computed from container + block size
  blockWidthMeters,
  blockHeightMeters,
  northBearing = 0,
  planImageUrl,      // pre-rotated plan image (baked in BlockMapModal)
  onPlanRectChange,  // (rect) → void — lets SunPlannerTool size OrreryRing
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  });

  const outerRef                             = useRef(null);
  const [containerSize, setContainerSize]    = useState({ width: 0, height: 0 });

  // Track container dimensions so zoom and plan pixel size can be derived from them.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const center = useMemo(
    () => ({ lat: mapCenter.lat, lng: mapCenter.lng }),
    [mapCenter.lat, mapCenter.lng]
  );

  // Choose a zoom so the plan's longer axis spans ≈ 75 % of the orrery ring diameter.
  // Ring radius = min(w,h) * 0.36  →  diameter = min(w,h) * 0.72
  // Target plan size = diameter * 0.75 = min(w,h) * 0.54
  const zoom = useMemo(() => {
    const { width: cw, height: ch } = containerSize;
    if (!cw || !ch || !blockWidthMeters || !blockHeightMeters) return mapZoom ?? 18;
    const targetMaxPx  = Math.min(cw, ch) * 0.54;
    const maxMeters    = Math.max(blockWidthMeters, blockHeightMeters);
    const metersPerPx  = maxMeters / targetMaxPx;
    const raw          = Math.log2(
      (156543.03 * Math.cos(center.lat * Math.PI / 180)) / metersPerPx
    );
    return Math.max(14, Math.min(22, raw));
  }, [containerSize, blockWidthMeters, blockHeightMeters, center.lat, mapZoom]);

  // Convert block real-world size to pixel dimensions at the chosen zoom.
  // These exactly match what the satellite map shows for that geographic area.
  const planPx = useMemo(() => {
    const { width: cw, height: ch } = containerSize;
    if (!cw || !ch || !blockWidthMeters || !blockHeightMeters) return null;
    const metersPerPx = (156543.03 * Math.cos(center.lat * Math.PI / 180)) / Math.pow(2, zoom);
    const w = blockWidthMeters  / metersPerPx;
    const h = blockHeightMeters / metersPerPx;
    return {
      x:      cw / 2 - w / 2,
      y:      ch / 2 - h / 2,
      width:  w,
      height: h,
    };
  }, [zoom, containerSize, blockWidthMeters, blockHeightMeters, center.lat]);

  // Tell parent the plan's pixel rect so OrreryRing can size itself to match.
  useEffect(() => {
    if (planPx && onPlanRectChange) onPlanRectChange(planPx);
  }, [planPx, onPlanRectChange]);

  const mapOptions = MAP_OPTIONS_BASE;

  return (
    <div ref={outerRef} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={CONTAINER_STYLE}
          center={center}
          zoom={zoom}
          options={mapOptions}
        />
      )}

      {/* Dark vignette — keeps UI legible while map provides spatial context */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(8, 11, 16, 0.68)",
        pointerEvents: "none",
      }} />

      {/* Geo-anchored plan image — exactly sized to blockWidthMeters × blockHeightMeters
          at the chosen satellite zoom, centred on blockCenter. */}
      {planImageUrl && planPx && (
        <div style={{
          position:      "absolute",
          left:          planPx.x,
          top:           planPx.y,
          width:         planPx.width,
          height:        planPx.height,
          pointerEvents: "none",
          zIndex:        2,
        }}>
          <img
            src={planImageUrl}
            draggable={false}
            alt="Floor plan"
            style={{
              width:       "100%",
              height:      "100%",
              display:     "block",
              opacity:     0.85,
              userSelect:  "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
