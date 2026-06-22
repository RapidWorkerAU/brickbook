"use client";

import { useCallback } from "react";
import { Group, Circle, Line, Text } from "react-konva";

const R = 44; // backdrop circle radius

function normDeg(d) {
  return ((Math.round(d) % 360) + 360) % 360;
}

export default function NorthArrow({ x, y, bearing, onChange }) {
  const label = `N ${String(normDeg(bearing)).padStart(3, "0")}°`;

  const handleMouseDown = useCallback(
    (e) => {
      if (e.evt.button !== 0 || !onChange) return;
      e.evt.preventDefault();
      e.cancelBubble = true; // don't let Stage start a pan drag

      const stage = e.target.getStage();
      const rect = stage.container().getBoundingClientRect();

      // compass centre in page coords
      const cx = rect.left + x;
      const cy = rect.top + y;

      const updateBearing = (clientX, clientY) => {
        const dx = clientX - cx;
        const dy = clientY - cy;
        // atan2(dx, -dy): 0 = pointing up, clockwise positive
        const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
        onChange(normDeg(deg));
      };

      const onMove = (ev) => updateBearing(ev.clientX, ev.clientY);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        stage.container().style.cursor = "";
      };

      stage.container().style.cursor = "grabbing";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [x, y, onChange]
  );

  const handleTouchStart = useCallback(
    (e) => {
      if (!onChange) return;
      e.evt.preventDefault();
      e.cancelBubble = true;
      const touch = e.evt.touches[0];
      if (!touch) return;

      const stage = e.target.getStage();
      const rect  = stage.container().getBoundingClientRect();
      const cx    = rect.left + x;
      const cy    = rect.top  + y;

      const updateBearing = (clientX, clientY) => {
        const dx  = clientX - cx;
        const dy  = clientY - cy;
        const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
        onChange(normDeg(deg));
      };

      const onMove = (ev) => {
        const t = ev.touches[0];
        if (t) updateBearing(t.clientX, t.clientY);
      };
      const onEnd = () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend",  onEnd);
      };

      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend",  onEnd);
    },
    [x, y, onChange]
  );

  const setCursorGrab = useCallback((e) => {
    e.target.getStage().container().style.cursor = "grab";
  }, []);

  const clearCursor = useCallback((e) => {
    e.target.getStage().container().style.cursor = "";
  }, []);

  return (
    <Group x={x} y={y}>
      {/* Backdrop */}
      <Circle
        radius={R}
        fill="rgba(15,17,23,0.82)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseEnter={setCursorGrab}
        onMouseLeave={clearCursor}
      />

      {/* Tick marks at N/E/S/W */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const inner = R - 7;
        return (
          <Line
            key={deg}
            points={[
              Math.sin(rad) * inner,
              -Math.cos(rad) * inner,
              Math.sin(rad) * (R - 1),
              -Math.cos(rad) * (R - 1),
            ]}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1.5}
            listening={false}
          />
        );
      })}

      {/* Rotating needle + N label */}
      <Group rotation={bearing} listening={false}>
        {/* North half — white */}
        <Line
          points={[0, -36, 10, 2, 0, -4, -10, 2]}
          closed
          fill="#ffffff"
          strokeWidth={0}
        />
        {/* South half — muted */}
        <Line
          points={[0, 36, 10, -2, 0, 4, -10, -2]}
          closed
          fill="rgba(255,255,255,0.22)"
          strokeWidth={0}
        />
        {/* Centre pin */}
        <Circle radius={3} fill="rgba(255,255,255,0.7)" />

        {/* N label — rides with the needle so always marks north tip */}
        <Text
          text="N"
          x={-4}
          y={-53}
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="bold"
          fill="#ffffff"
        />
      </Group>

      {/* Static bearing readout */}
      <Text
        text={label}
        x={-28}
        y={R + 9}
        width={56}
        align="center"
        fontSize={10}
        fontFamily="'SF Mono', 'Fira Code', monospace"
        fill="rgba(255,255,255,0.45)"
        listening={false}
      />
    </Group>
  );
}
