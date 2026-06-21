"use client";

import { Group, Rect } from "react-konva";

/**
 * How dark the "night" base is at a given sun altitude.
 */
function getNightOpacity(alt) {
  if (alt <= -20) return 0.88;
  if (alt < 0) {
    const t = (alt + 20) / 20;
    return 0.88 - t * 0.30;
  }
  if (alt < 25) {
    const t = alt / 25;
    const ease = t * t * (3 - 2 * t);
    return 0.58 - ease * 0.54;
  }
  return 0.04;
}

/**
 * Warm sun-glow colour and peak opacity.
 */
function getGlowConfig(alt, hour) {
  if (alt < 0)  return { rgb: [255, 80,  5],  alpha: 0.58 };
  if (alt < 8)  return { rgb: [255, 55,  0],  alpha: 0.72 };
  if (alt < 15) return { rgb: [255, 120, 8],  alpha: 0.65 };
  if (hour < 10 || hour > 16.5) return { rgb: [255, 140, 16], alpha: 0.60 };
  if (hour >= 11.5 && hour <= 13.5) return { rgb: [255, 215, 70], alpha: 0.50 };
  if (hour > 13.5) return { rgb: [255, 155, 20], alpha: 0.58 };
  return { rgb: [255, 185, 42], alpha: 0.55 };
}

/**
 * Extra shadow opacity on the side away from the sun.
 */
function getShadowAlpha(alt) {
  if (alt <= 0)  return 0;
  if (alt < 15)  return 0.38 * (alt / 15);
  if (alt < 40)  return 0.38;
  return 0.28;
}

export default function SunLightLayer({
  azimuth,
  altitude,
  decHour,
  northBearing,
  canvasWidth,
  canvasHeight,
}) {
  if (altitude == null || !canvasWidth || !canvasHeight) return null;

  const nightOp    = getNightOpacity(altitude);
  const showGlow   = altitude > -8;
  const showShadow = altitude > 0;

  const cx = canvasWidth  / 2;
  const cy = canvasHeight / 2;

  const planAz = ((azimuth - northBearing) + 360) % 360;
  const rad    = (planAz * Math.PI) / 180;
  const dx     =  Math.sin(rad);   // direction FROM center TO sun
  const dy     = -Math.cos(rad);

  const ext = Math.max(canvasWidth, canvasHeight) * 1.4;
  const gx1 = cx + dx * ext;
  const gy1 = cy + dy * ext;
  const gx2 = cx - dx * ext;
  const gy2 = cy - dy * ext;

  let glowStops   = null;
  let shadowStops = null;

  if (showGlow) {
    const hour = ((decHour % 24) + 24) % 24;
    const ramp = Math.min(1, Math.max(0, (altitude + 8) / 18));
    const { rgb, alpha } = getGlowConfig(altitude, hour);
    const [r, g, b] = rgb;
    const a  = +(alpha * ramp).toFixed(3);
    const a2 = +(a * 0.42).toFixed(3);
    const a3 = +(a * 0.10).toFixed(3);
    glowStops = [
      0,    `rgba(${r},${g},${b},${a})`,
      0.30, `rgba(${r},${g},${b},${a2})`,
      0.55, `rgba(${r},${g},${b},${a3})`,
      0.68, `rgba(0,0,0,0)`,
      1,    `rgba(0,0,0,0)`,
    ];
  }

  if (showShadow) {
    const sa  = +getShadowAlpha(altitude).toFixed(3);
    const sa2 = +(sa * 0.5).toFixed(3);
    shadowStops = [
      0,    `rgba(4,6,32,${sa})`,
      0.28, `rgba(4,6,32,${sa2})`,
      0.50, `rgba(0,0,0,0)`,
      1,    `rgba(0,0,0,0)`,
    ];
  }

  return (
    <Group listening={false}>
      {/* Ambient darkness: night/day cycle */}
      <Rect
        x={0} y={0}
        width={canvasWidth} height={canvasHeight}
        fill={`rgba(5,8,40,${nightOp.toFixed(3)})`}
        listening={false}
      />

      {/* Shadow gradient: dark side away from sun */}
      {shadowStops && (
        <Rect
          x={0} y={0}
          width={canvasWidth} height={canvasHeight}
          fillLinearGradientStartPoint={{ x: gx2, y: gy2 }}
          fillLinearGradientEndPoint={{ x: gx1, y: gy1 }}
          fillLinearGradientColorStops={shadowStops}
          listening={false}
        />
      )}

      {/* Warm glow: sun side */}
      {glowStops && (
        <Rect
          x={0} y={0}
          width={canvasWidth} height={canvasHeight}
          fillLinearGradientStartPoint={{ x: gx1, y: gy1 }}
          fillLinearGradientEndPoint={{ x: gx2, y: gy2 }}
          fillLinearGradientColorStops={glowStops}
          listening={false}
        />
      )}
    </Group>
  );
}
