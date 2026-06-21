"use client";

import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import principlesData from "@/data/sun-planner/design-principles.json";

// ── Lucide icon renderer ──────────────────────────────────────────────────────
// JSON uses kebab-case icon names matching Lucide's naming convention.
// Map known exceptions where the JSON name differs from the PascalCase export.
const ICON_NAME_OVERRIDES = {
  window: "AppWindow",
  sliders: "SlidersHorizontal",
};

function toPascalCase(kebab) {
  return kebab.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

function LucideIcon({ name, size = 14, color = "currentColor", strokeWidth = 1.75 }) {
  const resolved = ICON_NAME_OVERRIDES[name] ?? toPascalCase(name);
  const Icon = LucideIcons[resolved] ?? LucideIcons.Circle;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

// ── Zone colour palette ───────────────────────────────────────────────────────
const ZONE_COLORS = {
  1: "#e84040", 2: "#e86b40", 3: "#e8a040", 4: "#d4b800",
  5: "#4fa84a", 6: "#3d90d4", 7: "#6b5fd4", 8: "#a0a0c0",
};

// ── Compass helper ────────────────────────────────────────────────────────────
// Returns the nearest 8-point cardinal for an angle in degrees (0 = N, CW).
function compassPoint8(deg) {
  const d = ((deg % 360) + 360) % 360;
  const pts = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return pts[Math.round(d / 45) % 8];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DesignPanel({ isOpen, onClose, selectedLocation, northBearing }) {
  const [expanded, setExpanded] = useState({});

  const zone = selectedLocation?.climateZone;
  const zoneData = zone != null ? principlesData[String(zone)] : null;

  // The cardinal direction closest to northBearing is where North sits on the
  // plan, which is the direction the living areas most likely face in a
  // passive-solar layout (living areas face North).
  const facingDirection = useMemo(
    () => (northBearing != null ? compassPoint8(northBearing) : null),
    [northBearing]
  );

  const sortedPrinciples = useMemo(() => {
    if (!zoneData?.principles) return [];
    return [...zoneData.principles].sort((a, b) => {
      // When a bearing is set, float orientation-relevant cards to the top.
      if (facingDirection) {
        const aRel = Array.isArray(a.orientationRelevant)
          && a.orientationRelevant.includes(facingDirection) ? 0 : 1;
        const bRel = Array.isArray(b.orientationRelevant)
          && b.orientationRelevant.includes(facingDirection) ? 0 : 1;
        if (aRel !== bRel) return aRel - bRel;
      }
      return (a.priority ?? 99) - (b.priority ?? 99);
    });
  }, [zoneData, facingDirection]);

  const isRelevant = (p) =>
    facingDirection != null
    && Array.isArray(p.orientationRelevant)
    && p.orientationRelevant.includes(facingDirection);

  const toggle = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      {/* Backdrop — click to close */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            zIndex: 19,
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 320,
          height: "100vh",
          background: "#1a1d27",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          zIndex: 20,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          {/* Title row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: zoneData ? 14 : 0,
          }}>
            <span style={{
              color: "#e8eaf2",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}>
              Design Principles
            </span>
            <button
              onClick={onClose}
              title="Close panel"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: 5,
                background: "none",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.35)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <LucideIcon name="x" size={13} />
            </button>
          </div>

          {zoneData ? (
            <>
              {/* Zone badge + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${ZONE_COLORS[zone]}18`,
                  border: `1px solid ${ZONE_COLORS[zone]}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: ZONE_COLORS[zone], fontSize: 13, fontWeight: 700,
                }}>
                  {zone}
                </div>
                <div>
                  <div style={{ color: "#e8eaf2", fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
                    {zoneData.zoneName}
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 2,
                    letterSpacing: "0.01em",
                  }}>
                    Zone {zone} · {zoneData.zoneStates}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <p style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 11.5,
                lineHeight: 1.6,
                margin: 0,
              }}>
                {zoneData.summary}
              </p>
            </>
          ) : null}
        </div>

        {/* ── Principles list or empty state ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {zoneData ? (
            sortedPrinciples.map((p) => {
              const relevant  = isRelevant(p);
              const open      = !!expanded[p.id];

              return (
                <div
                  key={p.id}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    borderLeft: relevant ? "3px solid #F59E0B" : "3px solid transparent",
                    transition: "border-left-color 200ms ease",
                  }}
                >
                  {/* Card header — click to expand */}
                  <button
                    onClick={() => toggle(p.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px 12px 13px",
                      background: open ? "rgba(255,255,255,0.025)" : "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 100ms ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!open) e.currentTarget.style.background = "none";
                    }}
                  >
                    {/* Icon */}
                    <span style={{
                      flexShrink: 0,
                      marginTop: 1,
                      color: relevant ? "#F59E0B" : "rgba(255,255,255,0.4)",
                      transition: "color 200ms ease",
                    }}>
                      <LucideIcon name={p.icon} size={14} color="currentColor" />
                    </span>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                        <span style={{
                          color: relevant ? "#f0d090" : "#c8cad8",
                          fontSize: 12,
                          fontWeight: 500,
                          lineHeight: 1.35,
                          flex: 1,
                          transition: "color 200ms ease",
                        }}>
                          {p.title}
                        </span>
                        {/* Chevron */}
                        <span style={{
                          flexShrink: 0,
                          color: "rgba(255,255,255,0.25)",
                          transform: open ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 150ms ease",
                          display: "flex",
                          alignItems: "center",
                          marginTop: 1,
                        }}>
                          <LucideIcon name="chevron-down" size={13} />
                        </span>
                      </div>

                      {/* Orientation label */}
                      {relevant && (
                        <div style={{
                          marginTop: 4,
                          color: "#F59E0B",
                          fontSize: 10,
                          fontWeight: 500,
                          opacity: 0.8,
                          letterSpacing: "0.01em",
                        }}>
                          Relevant to your orientation
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Body text */}
                  {open && (
                    <div style={{
                      padding: "0 14px 13px 37px",
                    }}>
                      <p style={{
                        color: "rgba(255,255,255,0.48)",
                        fontSize: 12,
                        lineHeight: 1.65,
                        margin: 0,
                      }}>
                        {p.body}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* ── Empty state ── */
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "40px 28px",
              textAlign: "center",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
                color: "rgba(255,255,255,0.2)",
              }}>
                <LucideIcons.Compass size={22} strokeWidth={1.5} />
              </div>
              <p style={{
                color: "rgba(255,255,255,0.28)",
                fontSize: 13,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 220,
              }}>
                Select your location to see passive design principles for your climate zone
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
