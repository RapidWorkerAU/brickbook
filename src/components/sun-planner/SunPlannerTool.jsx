"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import LocationPicker from "./LocationPicker";
import LaunchModal from "./LaunchModal";
import DesignPanel from "./DesignPanel";
import SunCommentaryCard from "./SunCommentaryCard";
import OrreryRing from "./OrreryRing";
import { getSunriseSet, getSeasonDates, getSolarPosition } from "@/lib/sun-planner/sunPath";
import { generateSunCommentary, getCommentaryBucket, BUCKET_LABELS } from "@/lib/sun-planner/sunCommentary";

const PlanCanvas           = dynamic(() => import("./PlanCanvas"),           { ssr: false });
const MapPlacementModal    = dynamic(() => import("./MapPlacementModal"),    { ssr: false });
const BlockMapModal        = dynamic(() => import("./BlockMapModal"),        { ssr: false });

const ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";

const SEASON_SOLSTICE = {
  summer:  "summerSolstice",
  equinox: "marchEquinox",
  winter:  "winterSolstice",
};

const SEASONS = [
  { id: "summer",  label: "Summer",  color: "#F59E0B", activeBg: "rgba(245,158,11,0.12)",  activeBorder: "rgba(245,158,11,0.4)"  },
  { id: "equinox", label: "Equinox", color: "#34D399", activeBg: "rgba(52,211,153,0.1)",   activeBorder: "rgba(52,211,153,0.4)"  },
  { id: "winter",  label: "Winter",  color: "#60A5FA", activeBg: "rgba(96,165,250,0.1)",   activeBorder: "rgba(96,165,250,0.4)"  },
];

function normDeg(d) {
  return ((Math.round(d) % 360) + 360) % 360;
}
function formatBearing(d) {
  return `${String(normDeg(d)).padStart(3, "0")}°`;
}
function formatTimeOfDay(decHour) {
  if (decHour == null) return "--:--";
  const total  = Math.round(decHour * 60);
  const hh     = Math.floor(total / 60) % 24;
  const mm     = total % 60;
  const period = hh < 12 ? "am" : "pm";
  const dh     = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${dh}:${String(mm).padStart(2, "0")} ${period}`;
}
function useWindowWidth() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    setW(window.innerWidth);
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ── Toolbar primitives ────────────────────────────────────────────────────────

function ToolbarBtn({ onClick, title, children, style, active }) {
  const base  = active ? "rgba(91,127,255,0.18)" : "rgba(255,255,255,0.06)";
  const hover = active ? "rgba(91,127,255,0.28)" : "rgba(255,255,255,0.12)";
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        height: 28, minWidth: 28, borderRadius: 5,
        border: active ? "1px solid rgba(91,127,255,0.4)" : "1px solid rgba(255,255,255,0.12)",
        background: base,
        color: active ? "#8ba4ff" : "#c8cad4",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: 13, lineHeight: 1,
        padding: "0 6px", gap: 5,
        transition: "background 150ms ease",
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = base)}
    >
      {children}
    </button>
  );
}

function ToolbarDivider({ hidden }) {
  if (hidden) return null;
  return <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />;
}

function UploadIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SunPlannerTool() {
  // Launch mode: null = show modal, "plan" = normal, "block" = block mode
  const [launchMode, setLaunchMode]       = useState(null);
  const [blockMapOpen, setBlockMapOpen]   = useState(false);
  // Persisted block mode data (location, northBearing locked, map context)
  const [blockModeData, setBlockModeData] = useState(null);

  // Canvas state
  const [imageUrl, setImageUrl]         = useState(null);
  const [pdfError, setPdfError]         = useState(false);
  const [draggingOver, setDraggingOver] = useState(false);
  const [scale, setScale]               = useState(1);
  const [position, setPosition]         = useState({ x: 0, y: 0 });
  const [northBearing, setNorthBearing] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Orrery state
  const [season, setSeason]           = useState("summer");
  const [timePercent, setTimePercent] = useState(62);
  const [planRect, setPlanRect]       = useState(null);

  // Playback
  const [isPlaying, setIsPlaying]   = useState(false);
  const playRafRef                  = useRef(null);
  const playLastTsRef               = useRef(null);
  const pauseUntilRef               = useRef(0);
  const prevBucketRef               = useRef(null);

  // Refs that let the rAF tick read current state without stale closures
  const timePercentRef      = useRef(62);
  const scrubberRangeRef    = useRef(null);
  const selectedLocationRef = useRef(null);
  const seasonRef           = useRef("summer");

  // Canvas area size — needed to position waypoint hit targets
  const canvasAreaRef                       = useRef(null);
  const [canvasAreaSize, setCanvasAreaSize] = useState({ width: 0, height: 0 });

  // North is locked when coming from block mode
  const northLocked = blockModeData?.northLocked ?? false;

  const activePlanRect = planRect;

  // UI state
  const [designPanelOpen, setDesignPanelOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen]       = useState(false);
  const [mobileOk, setMobileOk]               = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen]   = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [toast, setToast]                     = useState(null);

  // Refs
  const fileInputRef   = useRef(null);
  const toolbarRef     = useRef(null);
  const commentaryStripRef = useRef(null);
  const [toolbarH, setToolbarH]         = useState(56);
  const [commentaryStripH, setCommentaryStripH] = useState(0);
  const [stage, setStage]       = useState(null);

  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth < 768;
  const isTiny      = windowWidth < 480;

  // ── Suppress body bottom-padding (mobile tab bar) for full-screen tool ──────
  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "0";
    return () => { document.body.style.paddingBottom = prev; };
  }, []);

  // ── Toolbar height ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setToolbarH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Commentary strip height (dynamic — text length varies by sun position) ──
  useEffect(() => {
    const el = commentaryStripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCommentaryStripH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Keep state-derived refs in sync (used inside rAF without stale closures)
  useEffect(() => { timePercentRef.current      = timePercent;      }, [timePercent]);
  useEffect(() => { selectedLocationRef.current = selectedLocation; }, [selectedLocation]);
  useEffect(() => { seasonRef.current           = season;           }, [season]);

  // ── Canvas area dimensions (for waypoint button positioning) ─────────────
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasAreaSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Sunrise/sunset for current season + location ──────────────────────────
  const scrubberRange = useMemo(() => {
    if (!selectedLocation) return null;
    const key = SEASON_SOLSTICE[season];
    if (!key) return null;
    const dates = getSeasonDates(new Date().getFullYear());
    const date  = dates[key];
    const { sunrise, sunset } = getSunriseSet(selectedLocation.lat, selectedLocation.lng, date);
    if (sunrise == null) return null;
    return { sunrise, sunset, date };
  }, [selectedLocation, season]);

  // scrubberRange ref — must be declared after the useMemo above
  useEffect(() => { scrubberRangeRef.current = scrubberRange; }, [scrubberRange]);

  // Derived scrubber time from timePercent
  const scrubberTime = useMemo(() => {
    if (!scrubberRange) return null;
    return scrubberRange.sunrise + (scrubberRange.sunset - scrubberRange.sunrise) * timePercent / 100;
  }, [scrubberRange, timePercent]);

  // Current sun position for commentary + light layer
  const sunPosition = useMemo(() => {
    if (scrubberTime == null || !selectedLocation) return null;
    const key = SEASON_SOLSTICE[season];
    if (!key) return null;
    const dates = getSeasonDates(new Date().getFullYear());
    return getSolarPosition(selectedLocation.lat, selectedLocation.lng, dates[key], scrubberTime);
  }, [scrubberTime, selectedLocation, season]);

  // Commentary — derived once and shared between desktop card, mobile strip, mobile overlay
  const commentary = useMemo(() => {
    if (!selectedLocation || !sunPosition || timePercent <= 0) return null;
    return generateSunCommentary({
      azimuth:     sunPosition.azimuth,
      altitude:    sunPosition.altitude,
      climateZone: selectedLocation.climateZone,
      northBearing,
      season,
    });
  }, [selectedLocation, sunPosition, northBearing, season, timePercent]);

  // ── Arc waypoints ─────────────────────────────────────────────────────────
  const waypoints = useMemo(() => {
    if (!selectedLocation || !scrubberRange) return [];
    const { sunrise, sunset, date } = scrubberRange;
    const { lat, lng } = selectedLocation;
    const STEPS  = 240;
    const result = [];
    let prevBucket = null;
    for (let i = 0; i <= STEPS; i++) {
      const tp  = (i / STEPS) * 100;
      const t   = sunrise + (sunset - sunrise) * tp / 100;
      const pos = getSolarPosition(lat, lng, date, t);
      const bkt = getCommentaryBucket(pos.azimuth, pos.altitude);
      if (bkt !== prevBucket) {
        result.push({ timePercent: tp, azimuth: pos.azimuth, altitude: pos.altitude, bucket: bkt });
        prevBucket = bkt;
      }
    }
    return result;
  }, [selectedLocation, scrubberRange]);

  // ── Play loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) { prevBucketRef.current = null; return; }
    function tick(ts) {
      if (playLastTsRef.current == null) playLastTsRef.current = ts;
      const dtMs = ts - playLastTsRef.current;
      playLastTsRef.current = ts;
      if (Date.now() < pauseUntilRef.current) {
        playRafRef.current = requestAnimationFrame(tick); return;
      }
      const prev    = timePercentRef.current;
      const rawNext = prev + (dtMs / 30000) * 100;
      const newTP   = rawNext > 100 ? 0 : rawNext;
      const sr  = scrubberRangeRef.current;
      const loc = selectedLocationRef.current;
      if (sr && loc) {
        const t   = sr.sunrise + (sr.sunset - sr.sunrise) * newTP / 100;
        const pos = getSolarPosition(loc.lat, loc.lng, sr.date, t);
        const bkt = getCommentaryBucket(pos.azimuth, pos.altitude);
        if (prevBucketRef.current !== null && bkt !== prevBucketRef.current) {
          pauseUntilRef.current = Date.now() + 2500;
        }
        prevBucketRef.current = rawNext > 100 ? null : bkt;
      }
      timePercentRef.current = newTP;
      setTimePercent(newTP);
      playRafRef.current = requestAnimationFrame(tick);
    }
    prevBucketRef.current = null;
    playLastTsRef.current = null;
    playRafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(playRafRef.current); playLastTsRef.current = null; };
  }, [isPlaying]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  // ── Session restore + URL params ──────────────────────────────────────────
  useEffect(() => {
    let fromUrl = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const lat_   = parseFloat(params.get("lat"));
      const lng_   = parseFloat(params.get("lng"));
      const zone_  = parseInt(params.get("zone"), 10);
      const name_  = params.get("name");
      const state_ = params.get("state") || "";
      const bear_  = parseFloat(params.get("bearing"));
      const seas_  = params.get("seasons");
      if (name_ && !isNaN(lat_) && !isNaN(lng_) && !isNaN(zone_)) {
        setSelectedLocation({ lat: lat_, lng: lng_, climateZone: zone_, suburb: name_, state: state_ });
        setLaunchMode("plan");
        fromUrl = true;
      }
      if (!isNaN(bear_)) { setNorthBearing(bear_); fromUrl = true; }
      if (seas_) {
        const valid = ["summer", "equinox", "winter"];
        const first = seas_.split(",").find((s) => valid.includes(s));
        if (first) setSeason(first);
      }
    } catch {}

    if (!fromUrl) {
      try {
        const raw = sessionStorage.getItem("sun-planner");
        if (raw) {
          const { northBearing: nb, selectedLocation: sl, season: se, launchMode: lm, blockModeData: bd } = JSON.parse(raw);
          if (typeof nb === "number") setNorthBearing(nb);
          if (sl?.suburb) setSelectedLocation(sl);
          if (se && ["summer", "equinox", "winter"].includes(se)) setSeason(se);
          if (lm) {
            setLaunchMode(lm);
            if (bd) setBlockModeData(bd);
          }
          // If we restored session data, skip the launch modal
          if (lm) fromUrl = true;
        }
      } catch {}
    }

    setSessionRestored(true);
  }, []);

  // ── Session persist ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionRestored || launchMode === null) return;
    try {
      sessionStorage.setItem("sun-planner", JSON.stringify({
        northBearing, selectedLocation, season, launchMode, blockModeData,
      }));
    } catch {}
  }, [northBearing, selectedLocation, season, launchMode, blockModeData, sessionRestored]);

  // ── Launch handlers ───────────────────────────────────────────────────────
  const handleLaunchPlan = useCallback(() => {
    setLaunchMode("plan");
    setTimeout(() => fileInputRef.current?.click(), 80);
  }, []);

  const handleLaunchBlock = useCallback(() => {
    setLaunchMode("block");
    setBlockMapOpen(true);
  }, []);

  const handleBlockConfirm = useCallback((data) => {
    setBlockModeData(data);
    setBlockMapOpen(false);
    if (data.location) setSelectedLocation(data.location);
    setNorthBearing(data.northBearing);
    if (data.planImageUrl) {
      setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return data.planImageUrl; });
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setPlanRect(null);
      setStage(null);
    }
    showToast(`Block set · North bearing ${data.northBearing}° locked from map`);
  }, [showToast]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (file.type === "application/pdf") {
      setPdfError(true);
      setImageUrl(null);
      return;
    }
    setPdfError(false);
    setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setPlanRect(null);
    setStage(null);
    if (launchMode === null) setLaunchMode("plan");
  }, [launchMode]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDraggingOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, [handleFile]);

  const handleInputChange = useCallback((e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  }, [handleFile]);

  const resetToDropzone = useCallback(() => {
    setImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPdfError(false);
    setPlanRect(null);
    setStage(null);
  }, []);

  // Full reset — back to launch modal
  const handleStartOver = useCallback(() => {
    resetToDropzone();
    setBlockModeData(null);
    setSelectedLocation(null);
    setNorthBearing(0);
    setLaunchMode(null);
    try { sessionStorage.removeItem("sun-planner"); } catch {}
  }, [resetToDropzone]);

  // ── Bearing ───────────────────────────────────────────────────────────────
  const nudgeBearing = useCallback((delta) => {
    setNorthBearing((prev) => normDeg(prev + delta));
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const el = canvasAreaRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const captureScale = isMobile ? (window.devicePixelRatio ?? 2) : 2;
      const full = await html2canvas(el, {
        backgroundColor: "#080b10",
        scale: captureScale,
        useCORS: false,
        allowTaint: true,
        logging: false,
      });

      let exportCanvas = full;

      // On mobile the canvas area is tall portrait — crop to a square around the
      // orrery ring so the export isn't dominated by empty dark space.
      if (isMobile && canvasAreaSize.width > 0 && canvasAreaSize.height > 0) {
        const s    = captureScale;
        const cx   = (canvasAreaSize.width  / 2) * s;
        const cy   = (canvasAreaSize.height / 2) * s;
        const ringR = Math.min(canvasAreaSize.width, canvasAreaSize.height) * 0.36 * s;
        const pad  = ringR * 0.38;
        const half = Math.round(ringR + pad);
        const size = half * 2;
        const x0   = Math.max(0, Math.round(cx - half));
        const y0   = Math.max(0, Math.round(cy - half));

        exportCanvas = document.createElement("canvas");
        exportCanvas.width  = size;
        exportCanvas.height = size;
        const ctx2 = exportCanvas.getContext("2d");
        ctx2.fillStyle = "#080b10";
        ctx2.fillRect(0, 0, size, size);
        ctx2.drawImage(full, x0, y0, size, size, 0, 0, size, size);
      }

      const dataUrl = exportCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const loc = selectedLocation
        ? `${selectedLocation.suburb.replace(/\s+/g, "-").toLowerCase()}-${selectedLocation.state.toLowerCase()}`
        : "sun-planner";
      a.download = `sun-planner-${loc}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn("Export failed:", err);
    }
  }, [canvasAreaRef, selectedLocation, isMobile, canvasAreaSize]);

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedLocation) {
      params.set("lat",   selectedLocation.lat);
      params.set("lng",   selectedLocation.lng);
      params.set("zone",  selectedLocation.climateZone);
      params.set("name",  selectedLocation.suburb);
      params.set("state", selectedLocation.state ?? "");
    }
    params.set("bearing", normDeg(northBearing));
    params.set("seasons", season);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url)
      .then(() => showToast("Link copied to clipboard"))
      .catch(() => showToast("Copy failed"));
  }, [selectedLocation, northBearing, season, showToast]);

  // ── Render ────────────────────────────────────────────────────────────────
  const TIME_BAR_H      = isMobile ? 64  : 48;
  const MOBILE_SEASON_H = isMobile ? 52 : 0;
  const MOBILE_STRIP_H  = isMobile ? commentaryStripH : 0;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#080b10" }}>

      {/* ── Launch modal — shown until user chooses a mode ── */}
      {sessionRestored && launchMode === null && (
        <LaunchModal onBlock={handleLaunchBlock} onPlan={handleLaunchPlan} />
      )}

      {/* ── Block map modal — shown after choosing "block" mode or clicking "Change block" ── */}
      {blockMapOpen && (
        <BlockMapModal
          onConfirm={handleBlockConfirm}
          onCancel={() => {
            setBlockMapOpen(false);
            // If they cancel before setting anything, go back to launch modal
            if (!blockModeData) setLaunchMode(null);
          }}
        />
      )}

      {/* ── Toolbar ── */}
      <div
        ref={toolbarRef}
        style={{
          position: "absolute", top: 0, left: 0, width: "100%",
          background: "#1a1d27",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 10, boxSizing: "border-box",
          display: "flex", flexDirection: "column",
        }}
      >
        {isMobile ? (
          /* ── Mobile toolbar: single compact row ── */
          <div style={{ display: "flex", alignItems: "center", padding: "0 12px", height: 52, gap: 8 }}>
            {/* Upload / map-pin action */}
            {launchMode === "plan" && (
              <ToolbarBtn onClick={() => { resetToDropzone(); setTimeout(() => fileInputRef.current?.click(), 50); }} title="Upload new floor plan" style={{ width: 36, height: 36 }}>
                <UploadIcon />
              </ToolbarBtn>
            )}
            {launchMode === "block" && (
              <ToolbarBtn onClick={() => setBlockMapOpen(true)} title="Change block" style={{ width: 36, height: 36 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </ToolbarBtn>
            )}

            {/* Title + mode badge */}
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", flexShrink: 0 }}>Sun Planner</span>
            {launchMode === "block" && (
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.28)", color: "#34D399", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>Block</span>
            )}

            {/* Location chip */}
            {selectedLocation && (
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                📍 {selectedLocation.suburb}{selectedLocation.state ? `, ${selectedLocation.state}` : ""}
              </span>
            )}
            {!selectedLocation && launchMode === "plan" && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <LocationPicker selectedLocation={selectedLocation} onSelect={setSelectedLocation} />
              </div>
            )}
            {!selectedLocation && launchMode !== "plan" && <div style={{ flex: 1 }} />}

            {/* N bearing + menu */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>N</span>
              <span style={{ color: "#fff", fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: "0.02em" }}>{formatBearing(northBearing)}</span>
              <button
                onClick={() => setMobileMenuOpen(true)}
                style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, lineHeight: 1 }}
              >⋮</button>
            </div>
          </div>
        ) : (
          /* ── Desktop toolbar: existing layout ── */
          <div style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "nowrap",
            padding: "0 16px",
            gap: 8,
            minHeight: 56,
          }}>

            {/* Left — upload + title */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, height: 40 }}>
              {launchMode === "plan" && (
                <ToolbarBtn
                  onClick={() => { resetToDropzone(); setTimeout(() => fileInputRef.current?.click(), 50); }}
                  title="Upload new floor plan"
                  style={{ width: 32, height: 32 }}
                >
                  <UploadIcon />
                </ToolbarBtn>
              )}
              {launchMode === "block" && (
                <ToolbarBtn
                  onClick={() => setBlockMapOpen(true)}
                  title="Change block or floor plan"
                  style={{ width: 32, height: 32 }}
                >
                  {/* Map pin icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </ToolbarBtn>
              )}

              <span style={{ color: "#ffffff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", userSelect: "none" }}>
                Sun Planner
              </span>

              {/* Block mode badge */}
              {launchMode === "block" && (
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 5,
                  background: "rgba(52,211,153,0.12)",
                  border: "1px solid rgba(52,211,153,0.28)",
                  color: "#34D399", fontWeight: 600, letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>
                  Block mode
                </span>
              )}

              {/* Start over link */}
              <button
                onClick={handleStartOver}
                title="Return to start screen"
                style={{
                  background: "none", border: "none",
                  color: "rgba(255,255,255,0.22)", fontSize: 11,
                  cursor: "pointer", padding: "2px 4px",
                  textDecoration: "underline",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
              >
                New session
              </button>

              <ToolbarDivider />
            </div>

            {/* Centre — location + season toggles */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              flex: 1, minWidth: 0, height: 40,
              overflow: "visible",
            }}>
              {/* In block mode, location is locked — show as a read-only badge */}
              {launchMode === "block" && selectedLocation ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  height: 30, padding: "0 10px", borderRadius: 6,
                  border: "1px solid rgba(52,211,153,0.25)",
                  background: "rgba(52,211,153,0.07)",
                  color: "#34D399", fontSize: 12, fontWeight: 500,
                  flexShrink: 0, userSelect: "none",
                }}>
                  📍 {selectedLocation.suburb}{selectedLocation.state ? ` ${selectedLocation.state}` : ""}
                  {selectedLocation.climateZone ? (
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>· Zone {selectedLocation.climateZone}</span>
                  ) : null}
                </div>
              ) : (
                <LocationPicker selectedLocation={selectedLocation} onSelect={setSelectedLocation} />
              )}

              <ToolbarDivider />

              {SEASONS.map(({ id, label, color, activeBg, activeBorder }) => {
                const active = season === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSeason(id)}
                    title={`Show ${label} sun arc`}
                    style={{
                      height: 24, padding: "0 8px", borderRadius: 5,
                      border: `1px solid ${active ? activeBorder : "rgba(255,255,255,0.12)"}`,
                      background: active ? activeBg : "transparent",
                      color: active ? color : "rgba(255,255,255,0.4)",
                      cursor: "pointer", fontSize: 11, fontWeight: 500,
                      flexShrink: 0, transition: "all 120ms ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Right — north bearing + actions */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0, height: 40,
            }}>
              <ToolbarDivider />

              <span style={{
                color: "rgba(255,255,255,0.35)", fontSize: 10,
                letterSpacing: "0.05em", textTransform: "uppercase",
                userSelect: "none", flexShrink: 0,
              }}>N</span>

              <span style={{
                color: "#ffffff", fontSize: 13,
                fontFamily: "'SF Mono','Fira Code',monospace",
                minWidth: 38, textAlign: "center",
                letterSpacing: "0.02em", userSelect: "none",
              }}>
                {formatBearing(northBearing)}
              </span>

              {/* North nudge arrows OR lock badge */}
              {northLocked ? (
                <div
                  title="North bearing locked from satellite map"
                  style={{
                    height: 28, padding: "0 7px", borderRadius: 5,
                    border: "1px solid rgba(52,211,153,0.3)",
                    background: "rgba(52,211,153,0.1)",
                    color: "#34D399", fontSize: 10, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 4,
                    letterSpacing: "0.04em", userSelect: "none", flexShrink: 0,
                  }}
                >
                  🔒 MAP
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <ToolbarBtn
                    onClick={() => nudgeBearing(1)}
                    title="Rotate north 1° clockwise"
                    style={{ width: 22, height: 13, fontSize: 8, borderRadius: 3, padding: 0, minWidth: 0 }}
                  >▲</ToolbarBtn>
                  <ToolbarBtn
                    onClick={() => nudgeBearing(-1)}
                    title="Rotate north 1° counter-clockwise"
                    style={{ width: 22, height: 13, fontSize: 8, borderRadius: 3, padding: 0, minWidth: 0 }}
                  >▼</ToolbarBtn>
                </div>
              )}

              <ToolbarDivider />

              <ToolbarBtn
                onClick={() => setDesignPanelOpen((o) => !o)}
                title="Design principles"
                active={designPanelOpen}
                style={{ gap: 5, padding: "0 9px", fontSize: 12 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span>Principles</span>
              </ToolbarBtn>

              {/* Map button — only in plan mode (block mode uses the pin icon in the left section) */}
              {launchMode === "plan" && imageUrl && selectedLocation && (
                <>
                  <ToolbarDivider />
                  <ToolbarBtn
                    onClick={() => setMapModalOpen(true)}
                    title="Position floor plan on satellite map to auto-set north bearing"
                    style={{ gap: 5, padding: "0 9px", fontSize: 12 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                      <line x1="9"  y1="3"  x2="9"  y2="18" />
                      <line x1="15" y1="6"  x2="15" y2="21" />
                    </svg>
                    <span>Map</span>
                  </ToolbarBtn>
                </>
              )}

              {imageUrl && (
                <>
                  <ToolbarDivider />
                  <ToolbarBtn
                    onClick={handleExport}
                    title="Save as PNG"
                    style={{ gap: 5, padding: "0 9px", fontSize: 12 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Save PNG</span>
                  </ToolbarBtn>
                </>
              )}

              <ToolbarDivider />
              <ToolbarBtn
                onClick={handleShare}
                title="Copy shareable link"
                style={{ gap: 5, padding: "0 9px", fontSize: 12 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5"  r="3" />
                  <circle cx="6"  cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
                </svg>
                <span>Share</span>
              </ToolbarBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── Canvas area ── */}
      <div
        ref={canvasAreaRef}
        style={{
          position: "absolute",
          top: toolbarH, left: 0, right: 0,
          bottom: TIME_BAR_H + MOBILE_SEASON_H + MOBILE_STRIP_H,
          background: "#080b10",
        }}
      >
        {imageUrl ? (
          <PlanCanvas
            imageUrl={imageUrl}
            scale={scale}
            position={position}
            onScaleChange={setScale}
            onPositionChange={setPosition}
            northBearing={northBearing}
            onBearingChange={northLocked ? undefined : setNorthBearing}
            lat={selectedLocation?.lat}
            lng={selectedLocation?.lng}
            showHourMarkers={true}
            onStageReady={setStage}
            sunAzimuth={sunPosition?.azimuth}
            sunAltitude={sunPosition?.altitude}
            sunDecHour={scrubberTime}
            onPlanRectChange={setPlanRect}
          />
        ) : (
          /* ── Dropzone (plan mode) or Block setup prompt (block mode) ── */
          <div
            onDrop={launchMode === "plan" ? handleDrop : undefined}
            onDragOver={launchMode === "plan" ? (e) => { e.preventDefault(); setDraggingOver(true); } : undefined}
            onDragLeave={launchMode === "plan" ? () => setDraggingOver(false) : undefined}
            onClick={launchMode === "plan" ? () => fileInputRef.current?.click() : undefined}
            style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: launchMode === "plan" ? "pointer" : "default",
              userSelect: "none",
            }}
          >
            {launchMode === "plan" ? (
              /* Plan mode dropzone */
              <div style={{
                border: `2px dashed ${draggingOver ? "#5b7fff" : "rgba(255,255,255,0.14)"}`,
                borderRadius: 16, padding: "48px 64px",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 16,
                background: draggingOver ? "rgba(91,127,255,0.06)" : "transparent",
                transition: "border-color 150ms ease, background 150ms ease",
                maxWidth: 420, width: "90%",
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#ffffff", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
                    {draggingOver ? "Drop to upload" : "Upload your floor plan"}
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    Drag & drop or click to browse<br />JPG or PNG
                  </p>
                </div>
                {pdfError && (
                  <p style={{
                    color: "#f87171", fontSize: 12, margin: 0,
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 6, padding: "8px 12px", textAlign: "center",
                  }}>
                    PDF not supported. Export your floor plan as JPG or PNG first.
                  </p>
                )}
              </div>
            ) : (
              /* Block mode — block is set but no plan uploaded yet */
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 14,
                textAlign: "center", maxWidth: 380, width: "90%",
              }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>🗺️</div>
                <div>
                  <p style={{ color: "#ffffff", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
                    Block set — solar arc is ready
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    Select a season and move the time slider to see the solar arc for your block.
                    You can also upload a floor plan overlay.
                  </p>
                </div>
                <button
                  onClick={() => setBlockMapOpen(true)}
                  style={{
                    padding: "9px 20px", borderRadius: 8,
                    border: "1px solid rgba(52,211,153,0.35)",
                    background: "rgba(52,211,153,0.1)",
                    color: "#34D399", cursor: "pointer",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  Add floor plan overlay
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Front-of-block label (block boundary mode only) ── */}
        {launchMode === "block" && blockModeData?.frontSide && activePlanRect && (() => {
          const { x, y, width, height } = activePlanRect;
          const side = blockModeData.frontSide;
          const GAP  = 10;
          const style = {
            position: "absolute", zIndex: 9, pointerEvents: "none",
            background: "#F59E0B", color: "#000",
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.07em", textTransform: "uppercase",
            padding: "3px 9px", borderRadius: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.55)",
            whiteSpace: "nowrap",
          };
          if (side === "top")    return <div style={{ ...style, left: x + width / 2, top: y - GAP, transform: "translate(-50%,-100%)" }}>Street front</div>;
          if (side === "bottom") return <div style={{ ...style, left: x + width / 2, top: y + height + GAP, transform: "translate(-50%,0)" }}>Street front</div>;
          if (side === "left")   return <div style={{ ...style, left: x - GAP, top: y + height / 2, transform: "translate(-100%,-50%)" }}>Street front</div>;
          if (side === "right")  return <div style={{ ...style, left: x + width + GAP, top: y + height / 2, transform: "translate(0,-50%)" }}>Street front</div>;
          return null;
        })()}

        {/* ── OrreryRing overlay ── */}
        <OrreryRing
          lat={selectedLocation?.lat}
          lng={selectedLocation?.lng}
          northBearing={northBearing}
          season={season}
          timePercent={timePercent}
          planRect={activePlanRect}
          waypoints={waypoints}
        />

        {/* ── Waypoint hit targets ── */}
        {canvasAreaSize.width > 0 && waypoints.map((wp, i) => {
          const cx     = canvasAreaSize.width  / 2;
          const cy     = canvasAreaSize.height / 2;
          const RING_R = Math.min(canvasAreaSize.width, canvasAreaSize.height) * 0.36;
          const angle  = (wp.azimuth + northBearing - 90) * Math.PI / 180;
          const x      = cx + Math.cos(angle) * RING_R;
          const y      = cy + Math.sin(angle) * RING_R;
          const label  = BUCKET_LABELS[wp.bucket] ?? wp.bucket;
          return (
            <button
              key={i}
              title={label}
              onClick={() => { setTimePercent(wp.timePercent); setIsPlaying(false); pauseUntilRef.current = 0; }}
              style={{
                position: "absolute", left: x - 12, top: y - 12,
                width: 24, height: 24, borderRadius: "50%",
                background: "transparent", border: "none",
                cursor: "pointer", zIndex: 7, padding: 0,
              }}
            />
          );
        })}

        {/* ── Sun commentary card (desktop) ── */}
        {!isMobile && commentary && (
          <SunCommentaryCard commentary={commentary} />
        )}

        {/* ── Mobile commentary strip (always visible when commentary exists) ── */}
        {isMobile && commentary && (
          <div ref={commentaryStripRef} style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 9,
            padding: "10px 12px 11px",
            background: "rgba(8, 11, 16, 0.92)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
            {/* Headline row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{commentary.icon}</span>
              <span style={{
                flex: 1, minWidth: 0,
                color: "#e8eaf2", fontSize: 12, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}>
                {commentary.headline}
              </span>
              <button
                onClick={() => setMobileInfoOpen(true)}
                style={{
                  flexShrink: 0, height: 26, padding: "0 9px", borderRadius: 5,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 500,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >See more</button>
            </div>
            {/* Detail paragraph — full text */}
            <div style={{
              color: "rgba(255,255,255,0.48)", fontSize: 11, lineHeight: 1.55,
              paddingLeft: 23,
            }}>
              {commentary.detail}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile season bar (shown only on mobile, sits between canvas and time bar) ── */}
      {isMobile && (
        <div style={{
          position: "absolute",
          bottom: TIME_BAR_H,
          left: 0, right: 0,
          height: MOBILE_SEASON_H,
          background: "#111520",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center",
          padding: "0 12px", gap: 8, boxSizing: "border-box",
          zIndex: 10,
        }}>
          {SEASONS.map(({ id, label, color, activeBg, activeBorder }) => {
            const active = season === id;
            return (
              <button
                key={id}
                onClick={() => setSeason(id)}
                style={{
                  flex: 1, height: 36, borderRadius: 8,
                  border: `1px solid ${active ? activeBorder : "rgba(255,255,255,0.1)"}`,
                  background: active ? activeBg : "transparent",
                  color: active ? color : "rgba(255,255,255,0.45)",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  transition: "all 120ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Time bar ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: TIME_BAR_H, background: "#111520",
        borderTop: "0.5px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", boxSizing: "border-box", zIndex: 10,
      }}>
        <button
          onClick={() => setIsPlaying((p) => !p)}
          title={isPlaying ? "Pause" : "Play sun movement"}
          style={{
            width: isMobile ? 36 : 26, height: isMobile ? 36 : 26, borderRadius: 5, flexShrink: 0,
            border: isPlaying ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.14)",
            background: isPlaying ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)",
            color: isPlaying ? "#F59E0B" : "rgba(255,255,255,0.5)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
          }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "'SF Mono','Fira Code',monospace", flexShrink: 0, minWidth: 52 }}>
          {scrubberRange ? formatTimeOfDay(scrubberRange.sunrise) : "--:--"}
        </span>

        <input
          type="range" min={0} max={100} step={0.1} value={timePercent}
          onChange={(e) => { setIsPlaying(false); pauseUntilRef.current = 0; setTimePercent(parseFloat(e.target.value)); }}
          style={{ flex: 1, accentColor: "#F59E0B", cursor: "pointer", height: isMobile ? 20 : 3 }}
        />

        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "'SF Mono','Fira Code',monospace", flexShrink: 0, minWidth: 52, textAlign: "right" }}>
          {scrubberRange ? formatTimeOfDay(scrubberRange.sunset) : "--:--"}
        </span>

        <span style={{ color: "#F59E0B", fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", fontWeight: 500, flexShrink: 0, minWidth: 60, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {scrubberTime != null ? formatTimeOfDay(scrubberTime) : "--:--"}
        </span>
      </div>

      {/* ── Design Principles panel ── */}
      <DesignPanel
        isOpen={designPanelOpen}
        onClose={() => setDesignPanelOpen(false)}
        selectedLocation={selectedLocation}
        northBearing={northBearing}
      />

      {/* ── Map Placement modal (plan mode only — for manual north bearing adjustment) ── */}
      {mapModalOpen && (
        <MapPlacementModal
          imageUrl={imageUrl}
          selectedLocation={selectedLocation}
          onConfirm={({ northBearing: nb }) => {
            setNorthBearing(nb);
            showToast(`North bearing set to ${nb}°`);
          }}
          onClose={() => setMapModalOpen(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 28 + TIME_BAR_H + MOBILE_SEASON_H + MOBILE_STRIP_H,
          left: "50%", transform: "translateX(-50%)",
          background: "#1a1d27", border: "1px solid rgba(255,255,255,0.14)",
          color: "#e8eaf2", fontSize: 13, fontWeight: 500,
          padding: "10px 20px", borderRadius: 8, zIndex: 100,
          pointerEvents: "none", letterSpacing: "-0.01em",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          {toast}
        </div>
      )}

      {/* ── Mobile commentary full-screen overlay ── */}
      {isMobile && mobileInfoOpen && commentary && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "#0a0c14",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 16px 12px", flexShrink: 0,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>{commentary.icon}</span>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>
                Sun Position Detail
              </span>
            </div>
            <button
              onClick={() => setMobileInfoOpen(false)}
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.7)", fontSize: 20, lineHeight: 1,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >×</button>
          </div>

          {/* Commentary content */}
          <div style={{ padding: "16px 16px 40px", flex: 1 }}>
            <SunCommentaryCard commentary={commentary} mode="panel" />
          </div>
        </div>
      )}

      {/* ── Mobile ⋮ bottom sheet ── */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "#1a1d27",
              borderRadius: "16px 16px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              padding: "12px 0 32px",
            }}
          >
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 12px" }} />

            {/* Location info */}
            {selectedLocation && (
              <div style={{ padding: "10px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Location</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                  {selectedLocation.suburb}{selectedLocation.state ? `, ${selectedLocation.state}` : ""}
                  {selectedLocation.climateZone && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 400, marginLeft: 6 }}>Zone {selectedLocation.climateZone}</span>}
                </div>
              </div>
            )}

            {/* North bearing — show nudge controls if not locked */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>North Bearing</div>
                <div style={{ color: "#fff", fontSize: 20, fontFamily: "'SF Mono','Fira Code',monospace", fontWeight: 600 }}>{formatBearing(northBearing)}</div>
              </div>
              {northLocked ? (
                <div style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34D399", fontSize: 11, fontWeight: 600 }}>🔒 From map</div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => nudgeBearing(-1)} style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontSize: 16 }}>◀</button>
                  <button onClick={() => nudgeBearing(1)}  style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontSize: 16 }}>▶</button>
                </div>
              )}
            </div>

            {/* Action list */}
            {[
              { label: "Design Principles", icon: "📖", onClick: () => { setDesignPanelOpen(true); setMobileMenuOpen(false); } },
              ...(launchMode === "plan" && imageUrl && selectedLocation ? [{ label: "Position on Map", icon: "🗺️", onClick: () => { setMapModalOpen(true); setMobileMenuOpen(false); } }] : []),
              ...((imageUrl || launchMode === "block") ? [{ label: "Save PNG", icon: "💾", onClick: () => { handleExport(); setMobileMenuOpen(false); } }] : []),
              { label: "Copy Share Link", icon: "🔗", onClick: () => { handleShare(); setMobileMenuOpen(false); } },
              { label: "New Session", icon: "↩️", onClick: () => { handleStartOver(); setMobileMenuOpen(false); } },
            ].map(({ label, icon, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  width: "100%", padding: "16px 20px",
                  background: "none", border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  color: "#e8eaf2", cursor: "pointer", fontSize: 15, textAlign: "left",
                }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={handleInputChange}
      />
    </div>
  );
}
