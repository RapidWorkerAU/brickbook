"use client";

import { useRef, useEffect } from "react";
import { getSunPathArc, getSunriseSet, getSolarPosition, getSeasonDates } from "@/lib/sun-planner/sunPath";

const DEFAULT_LAT = -31.95;
const DEFAULT_LNG = 115.86;

const SEASON_CFG = {
  summer:  { color: "#F59E0B", key: "summerSolstice" },
  equinox: { color: "#34D399", key: "marchEquinox"   },
  winter:  { color: "#60A5FA", key: "winterSolstice" },
};
const SEASONS = ["summer", "equinox", "winter"];

const CARDINALS = [
  { label: "N",  deg: 0   },
  { label: "NE", deg: 45  },
  { label: "E",  deg: 90  },
  { label: "SE", deg: 135 },
  { label: "S",  deg: 180 },
  { label: "SW", deg: 225 },
  { label: "W",  deg: 270 },
  { label: "NW", deg: 315 },
];

// Compass azimuth → standard canvas radians (0 = right, clockwise positive)
function azToRad(az, northBearing) {
  return ((az + northBearing - 90) * Math.PI) / 180;
}

function fmtHour(decHour) {
  const hr   = Math.round(decHour) % 24;
  const disp = hr % 12 || 12;
  return `${disp}${hr < 12 ? "am" : "pm"}`;
}

// Given a unit direction (tsx, tsy) from planCenter outward, find where the
// ray exits the plan rectangle (returns the t parameter; point = center + t*dir).
function rectExitT(planCx, planCy, pr, tsx, tsy) {
  const candidates = [];
  if (tsx > 0)  candidates.push((pr.x + pr.width  - planCx) / tsx);
  if (tsx < 0)  candidates.push((pr.x              - planCx) / tsx);
  if (tsy > 0)  candidates.push((pr.y + pr.height - planCy) / tsy);
  if (tsy < 0)  candidates.push((pr.y              - planCy) / tsy);
  return Math.min(...candidates.filter((t) => t > 0));
}

export default function OrreryRing({
  lat,
  lng,
  northBearing = 0,
  season = "summer",
  timePercent = 62,
  planRect,
  waypoints,
}) {
  const canvasRef       = useRef(null);
  const rayAngleRef     = useRef(0);
  const pulsePhaseRef   = useRef(0);
  const rafRef          = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const useLat = lat ?? DEFAULT_LAT;
    const useLng = lng ?? DEFAULT_LNG;
    const year   = new Date().getFullYear();
    const dates  = getSeasonDates(year);

    // Pre-compute arc endpoints for all seasons
    const arcData = {};
    for (const s of SEASONS) {
      const date = dates[SEASON_CFG[s].key];
      const { sunrise, sunset } = getSunriseSet(useLat, useLng, date);
      if (sunrise == null) continue;
      const risePos = getSolarPosition(useLat, useLng, date, sunrise);
      const setPos  = getSolarPosition(useLat, useLng, date, sunset);
      arcData[s] = {
        sunrise, sunset, date,
        sunriseAz: risePos.azimuth,
        sunsetAz:  setPos.azimuth,
      };
    }

    // Current sun canvas angle for the active season
    const activeArc = arcData[season];
    let sunCanvasAngle = azToRad(90, northBearing);
    if (activeArc) {
      const t   = activeArc.sunrise + (activeArc.sunset - activeArc.sunrise) * timePercent / 100;
      const pos = getSolarPosition(useLat, useLng, activeArc.date, t);
      sunCanvasAngle = azToRad(pos.azimuth, northBearing);
    }

    // Southern hemisphere: sun transits north → counterclockwise on canvas
    const anticlockwise = useLat < 0;

    function draw() {
      const dpr  = window.devicePixelRatio || 1;
      const cssW = canvas.offsetWidth;
      const cssH = canvas.offsetHeight;
      if (cssW === 0 || cssH === 0) return;

      const needW = Math.round(cssW * dpr);
      const needH = Math.round(cssH * dpr);
      if (canvas.width !== needW || canvas.height !== needH) {
        canvas.width  = needW;
        canvas.height = needH;
      }

      const ctx    = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const cx     = cssW / 2;
      const cy     = cssH / 2;
      const RING_R = Math.min(cssW, cssH) * 0.36;

      const seasonColor = SEASON_CFG[season]?.color ?? "#F59E0B";

      // Sun position on ring
      const sunX = cx + Math.cos(sunCanvasAngle) * RING_R;
      const sunY = cy + Math.sin(sunCanvasAngle) * RING_R;

      // Plan rect (real or placeholder)
      const pr     = planRect || { x: cx - 60, y: cy - 45, width: 120, height: 90 };
      const planCx = pr.x + pr.width  / 2;
      const planCy = pr.y + pr.height / 2;

      // Direction from plan center → sun (normalised)
      const dToPlanX = sunX - planCx;
      const dToPlanY = sunY - planCy;
      const dLen     = Math.sqrt(dToPlanX * dToPlanX + dToPlanY * dToPlanY);
      const tsx      = dLen > 0.1 ? dToPlanX / dLen : 1;
      const tsy      = dLen > 0.1 ? dToPlanY / dLen : 0;

      // Plan boundary points: lit face (toward sun) and shaded face (away)
      const tLit  = rectExitT(planCx, planCy, pr,  tsx,  tsy);
      const tShad = rectExitT(planCx, planCy, pr, -tsx, -tsy);
      const litX  = planCx + tLit  * tsx;
      const litY  = planCy + tLit  * tsy;
      const shadX = planCx - tShad * tsx;
      const shadY = planCy - tShad * tsy;

      // Lit wall edge endpoints
      const vertical = Math.abs(tsx) >= Math.abs(tsy);
      let edgeX1, edgeY1, edgeX2, edgeY2;
      if (vertical) {
        const ex = tsx > 0 ? pr.x + pr.width : pr.x;
        edgeX1 = ex;        edgeY1 = pr.y;
        edgeX2 = ex;        edgeY2 = pr.y + pr.height;
      } else {
        const ey = tsy > 0 ? pr.y + pr.height : pr.y;
        edgeX1 = pr.x;             edgeY1 = ey;
        edgeX2 = pr.x + pr.width;  edgeY2 = ey;
      }

      // ── Vignette ───────────────────────────────────────────────────────────
      const vigGrad = ctx.createRadialGradient(
        cx, cy, RING_R * 0.5,
        cx, cy, Math.max(cssW, cssH) * 0.75,
      );
      vigGrad.addColorStop(0, "rgba(0,0,0,0)");
      vigGrad.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, cssW, cssH);

      // ── Beam — wide soft bands (drawn behind ring) ─────────────────────────
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(litX, litY);
      ctx.strokeStyle = seasonColor;
      ctx.lineWidth   = 60;
      ctx.globalAlpha = 0.04;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(litX, litY);
      ctx.lineWidth   = 20;
      ctx.globalAlpha = 0.07;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.lineCap     = "butt";

      // ── Plan directional wash ──────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.rect(pr.x, pr.y, pr.width, pr.height);
      ctx.clip();

      const washGrad = ctx.createLinearGradient(litX, litY, shadX, shadY);
      washGrad.addColorStop(0,    "rgba(245,158,11,0.32)");
      washGrad.addColorStop(0.35, "rgba(245,158,11,0.10)");
      washGrad.addColorStop(1,    "rgba(20,30,60,0.18)");
      ctx.fillStyle   = washGrad;
      ctx.globalAlpha = 1;
      ctx.fillRect(pr.x, pr.y, pr.width, pr.height);
      ctx.restore();

      // ── 1. Background ring track ───────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, RING_R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth   = 28;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, RING_R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth   = 1;
      ctx.stroke();

      // ── 2. Compass ticks and labels ────────────────────────────────────────
      for (const { label, deg } of CARDINALS) {
        const a  = azToRad(deg, northBearing);
        const x1 = cx + Math.cos(a) * (RING_R - 14);
        const y1 = cy + Math.sin(a) * (RING_R - 14);
        const x2 = cx + Math.cos(a) * (RING_R + 6);
        const y2 = cy + Math.sin(a) * (RING_R + 6);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth   = 0.5;
        ctx.stroke();

        const lx = cx + Math.cos(a) * (RING_R + 18);
        const ly = cy + Math.sin(a) * (RING_R + 18);
        ctx.font         = "9px sans-serif";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle    = label === "N" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)";
        ctx.fillText(label, lx, ly);

        if (label === "N") {
          const tx   = cx + Math.cos(a) * (RING_R + 31);
          const ty   = cy + Math.sin(a) * (RING_R + 31);
          const perp = a + Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + Math.cos(perp) * 4, ty + Math.sin(perp) * 4);
          ctx.lineTo(tx - Math.cos(perp) * 4, ty - Math.sin(perp) * 4);
          ctx.closePath();
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fill();
        }
      }

      // ── 3. Inactive season arcs (25% opacity) ─────────────────────────────
      for (const s of SEASONS) {
        if (s === season) continue;
        const arc = arcData[s];
        if (!arc) continue;
        const startA = azToRad(arc.sunriseAz, northBearing);
        const endA   = azToRad(arc.sunsetAz,  northBearing);
        ctx.beginPath();
        ctx.arc(cx, cy, RING_R, startA, endA, anticlockwise);
        ctx.strokeStyle = SEASON_CFG[s].color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.25;
        ctx.lineCap     = "round";
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineCap     = "butt";
      }

      // ── 4. Active season arc ───────────────────────────────────────────────
      const activeData = arcData[season];
      if (activeData) {
        const startA = azToRad(activeData.sunriseAz, northBearing);
        const endA   = azToRad(activeData.sunsetAz,  northBearing);

        // Outer glow
        ctx.beginPath();
        ctx.arc(cx, cy, RING_R, startA, endA, anticlockwise);
        ctx.strokeStyle = seasonColor;
        ctx.lineWidth   = 22;
        ctx.globalAlpha = 0.1;
        ctx.lineCap     = "round";
        ctx.stroke();

        // Mid glow
        ctx.beginPath();
        ctx.arc(cx, cy, RING_R, startA, endA, anticlockwise);
        ctx.strokeStyle = seasonColor;
        ctx.lineWidth   = 6;
        ctx.globalAlpha = 0.45;
        ctx.lineCap     = "round";
        ctx.stroke();

        // Inner bright
        ctx.beginPath();
        ctx.arc(cx, cy, RING_R, startA, endA, anticlockwise);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.2;
        ctx.lineCap     = "round";
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineCap     = "butt";

        // Horizon glow at arc endpoints
        for (const a of [startA, endA]) {
          const hx   = cx + Math.cos(a) * RING_R;
          const hy   = cy + Math.sin(a) * RING_R;
          const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
          grad.addColorStop(0, seasonColor + "88");
          grad.addColorStop(1, seasonColor + "00");
          ctx.beginPath();
          ctx.arc(hx, hy, 10, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // ── 5. Hour dot markers ──────────────────────────────────────────────
        const hourPts = getSunPathArc(useLat, useLng, activeData.date, 60);
        for (const pt of hourPts) {
          if (pt.altitude < -0.5) continue;
          const ptA  = azToRad(pt.azimuth, northBearing);
          const ptX  = cx + Math.cos(ptA) * RING_R;
          const ptY  = cy + Math.sin(ptA) * RING_R;
          const hr   = Math.round(pt.time);
          const even = hr % 2 === 0;

          ctx.beginPath();
          ctx.arc(ptX, ptY, even ? 2.5 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle   = even ? seasonColor : "rgba(255,255,255,0.3)";
          ctx.globalAlpha = even ? 0.8 : 1;
          ctx.fill();
          ctx.globalAlpha = 1;

          if (even) {
            const labelR = RING_R - 22;
            const lx     = cx + Math.cos(ptA) * labelR;
            const ly     = cy + Math.sin(ptA) * labelR;
            ctx.font         = "8px sans-serif";
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle    = "rgba(255,255,255,0.25)";
            ctx.fillText(fmtHour(hr), lx, ly);
          }
        }
      }

      // ── Waypoint markers (section-transition dots on the arc) ─────────────
      if (waypoints?.length > 0) {
        for (const wp of waypoints) {
          const wpA = azToRad(wp.azimuth, northBearing);
          const wpX = cx + Math.cos(wpA) * RING_R;
          const wpY = cy + Math.sin(wpA) * RING_R;

          // Soft outer glow
          const grd = ctx.createRadialGradient(wpX, wpY, 0, wpX, wpY, 10);
          grd.addColorStop(0, "rgba(255,255,255,0.22)");
          grd.addColorStop(1, "rgba(255,255,255,0)");
          ctx.beginPath();
          ctx.arc(wpX, wpY, 10, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          // Season-colour ring
          ctx.beginPath();
          ctx.arc(wpX, wpY, 5.5, 0, Math.PI * 2);
          ctx.strokeStyle = seasonColor;
          ctx.lineWidth   = 1.5;
          ctx.globalAlpha = 0.75;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // White centre dot
          ctx.beginPath();
          ctx.arc(wpX, wpY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle   = "#ffffff";
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ── Plan rect outline / placeholder ───────────────────────────────────
      if (planRect) {
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth   = 1;
        ctx.strokeRect(planRect.x, planRect.y, planRect.width, planRect.height);
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth   = 1;
        ctx.strokeRect(pr.x, pr.y, pr.width, pr.height);
      }

      // ── Beam — crisp dashed centre line (drawn over ring) ─────────────────
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(litX, litY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.25;
      ctx.lineCap     = "round";
      ctx.setLineDash([4, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.lineCap     = "butt";

      // ── Lit wall edge glow (with pulse) ───────────────────────────────────
      // Oscillates between 0.5 and 0.85 opacity
      const edgeOpacity = 0.675 + 0.175 * Math.sin(pulsePhaseRef.current);

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(edgeX1, edgeY1);
      ctx.lineTo(edgeX2, edgeY2);
      ctx.strokeStyle = seasonColor;
      ctx.lineWidth   = 12;
      ctx.globalAlpha = 0.15;
      ctx.lineCap     = "round";
      ctx.stroke();

      // Bright edge line
      ctx.beginPath();
      ctx.moveTo(edgeX1, edgeY1);
      ctx.lineTo(edgeX2, edgeY2);
      ctx.strokeStyle = seasonColor;
      ctx.lineWidth   = 3;
      ctx.globalAlpha = edgeOpacity * 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap     = "butt";

      // ── Sun icon ───────────────────────────────────────────────────────────
      const rayAngle = rayAngleRef.current;

      // Outer glow
      ctx.beginPath();
      ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
      ctx.fillStyle   = seasonColor;
      ctx.globalAlpha = 0.08;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Mid glow
      ctx.beginPath();
      ctx.arc(sunX, sunY, 16, 0, Math.PI * 2);
      ctx.fillStyle   = seasonColor;
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Rotating rays
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.strokeStyle = seasonColor;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.55;
      ctx.lineCap     = "round";
      for (let i = 0; i < 8; i++) {
        const a = rayAngle + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
        ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Core white circle
      ctx.beginPath();
      ctx.arc(sunX, sunY, 6, 0, Math.PI * 2);
      ctx.fillStyle   = "#ffffff";
      ctx.globalAlpha = 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Core season tint
      ctx.beginPath();
      ctx.arc(sunX, sunY, 6, 0, Math.PI * 2);
      ctx.fillStyle   = seasonColor;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function animate() {
      rayAngleRef.current   += 0.008;
      pulsePhaseRef.current += 0.03;
      draw();
      rafRef.current = requestAnimationFrame(animate);
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [lat, lng, northBearing, season, timePercent, planRect, waypoints]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}
