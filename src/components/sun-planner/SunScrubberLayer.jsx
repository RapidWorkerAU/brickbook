"use client";

import { useMemo } from "react";
import { Group, Circle, Line, Text } from "react-konva";
import { getSolarPosition, getSeasonDates } from "@/lib/sun-planner/sunPath";

const SEASON_CONFIG = {
  summer:  { color: "#F59E0B", solstice: "summerSolstice" },
  equinox: { color: "#34D399", solstice: "marchEquinox"   },
  winter:  { color: "#60A5FA", solstice: "winterSolstice" },
};

function project(azimuth, altitude, northBearing, cx, cy, R) {
  const a = ((azimuth + northBearing) * Math.PI) / 180;
  const r = R * (1 - altitude / 90);
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

export default function SunScrubberLayer({
  lat, lng, northBearing,
  canvasWidth, canvasHeight,
  activeSeasons, scrubberTime,
}) {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const R  = Math.min(canvasWidth, canvasHeight) * 0.38;

  const positions = useMemo(() => {
    if (lat == null || lng == null || scrubberTime == null) return [];
    const year  = new Date().getFullYear();
    const dates = getSeasonDates(year);
    return (activeSeasons ?? [])
      .filter((s) => SEASON_CONFIG[s])
      .map((s) => {
        const date = dates[SEASON_CONFIG[s].solstice];
        const { azimuth, altitude } = getSolarPosition(lat, lng, date, scrubberTime);
        return { season: s, color: SEASON_CONFIG[s].color, azimuth, altitude };
      })
      .filter((p) => p.altitude > -2);
  }, [lat, lng, activeSeasons, scrubberTime]);

  if (!positions.length) return null;

  const primary = positions[0];

  return (
    <Group listening={false}>
      {positions.map(({ season, color, azimuth, altitude }) => {
        const { x, y } = project(azimuth, altitude, northBearing, cx, cy, R);
        const isPrimary = season === primary.season;
        return (
          <Group key={season} x={x} y={y}>
            {/* White halo for contrast */}
            <Circle radius={8.5} fill="rgba(0,0,0,0.55)" />
            {/* Rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
              const a = (d * Math.PI) / 180;
              return (
                <Line
                  key={d}
                  points={[
                    Math.sin(a) * 9,  -Math.cos(a) * 9,
                    Math.sin(a) * 15, -Math.cos(a) * 15,
                  ]}
                  stroke={color}
                  strokeWidth={1.75}
                  opacity={0.95}
                />
              );
            })}
            {/* Disc */}
            <Circle radius={6} fill={color} opacity={1} />
            {/* Az · Alt label (primary season only) */}
            {isPrimary && (
              <Text
                x={17}
                y={-8}
                text={`Az ${Math.round(azimuth)}°  Alt ${Math.round(altitude)}°`}
                fontSize={9.5}
                fontFamily="'SF Mono','Fira Code',monospace"
                fill={color}
                opacity={0.92}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}
