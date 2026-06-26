"use client";

import { useState, useMemo, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import principlesData from "@/data/sun-planner/design-principles.json";

// ── Lucide icon renderer ──────────────────────────────────────────────────────
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

// ── Climate strip chart ───────────────────────────────────────────────────────
const MONTHS_SHORT = ["J","F","M","A","M","J","J","A","S","O","N","D"];
const TEMP_SCALE_MIN = -10;
const TEMP_SCALE_MAX = 42;
const TEMP_SCALE_RANGE = TEMP_SCALE_MAX - TEMP_SCALE_MIN;

function ClimateStrip({ data, zoneColor }) {
  const W      = 276;
  const COL    = W / 12;
  const BAR_W  = 13;
  const TEMP_H = 36;
  const RAIN_H = 12;
  const SVG_H  = TEMP_H + RAIN_H;

  const tY = (t) => {
    const clamped = Math.max(TEMP_SCALE_MIN, Math.min(TEMP_SCALE_MAX, t));
    return TEMP_H - ((clamped - TEMP_SCALE_MIN) / TEMP_SCALE_RANGE) * TEMP_H;
  };

  const maxRain    = Math.max(...data.map((d) => d.avg_rainfall_mm), 1);
  const rH         = (r) => (r / maxRain) * (RAIN_H - 2);
  const zeroY      = tY(0);
  const showZero   = zeroY >= 2 && zeroY <= TEMP_H - 2;
  const avgHumid    = Math.round(data.reduce((s, d) => s + (d.avg_humidity_pct   ?? 0), 0) / data.length);
  const avgWind     = Math.round(data.reduce((s, d) => s + (d.avg_wind_speed_kmh ?? 0), 0) / data.length);
  const annualMax   = Math.round(Math.max(...data.map((d) => d.avg_max_c)));
  const annualMin   = Math.round(Math.min(...data.map((d) => d.avg_min_c)));
  const peakRainRow = data.reduce((best, d) => d.avg_rainfall_mm > best.avg_rainfall_mm ? d : best, data[0]);
  const peakRain    = Math.round(peakRainRow.avg_rainfall_mm);
  const peakMonth   = MONTHS_SHORT[(peakRainRow.month ?? 1) - 1];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${SVG_H}`} style={{ display: "block", overflow: "visible" }}>
        {showZero && (
          <line
            x1={0} y1={zeroY} x2={W} y2={zeroY}
            stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} strokeDasharray="2 3"
          />
        )}
        {data.map((d, i) => {
          const x        = i * COL + (COL - BAR_W) / 2;
          const yT       = tY(d.avg_max_c);
          const yB       = tY(d.avg_min_c);
          const bH       = Math.max(yB - yT, 1.5);
          const rainBarH = Math.max(rH(d.avg_rainfall_mm), 0.5);
          const rainY    = SVG_H - rainBarH;
          return (
            <g key={d.month}>
              <rect x={x} y={yT} width={BAR_W} height={bH}
                fill={zoneColor} opacity={0.28} rx={1.5} />
              <rect x={x} y={yT} width={BAR_W} height={2}
                fill={zoneColor} opacity={0.85} rx={1} />
              <rect x={x + 1} y={Math.max(yB - 1.5, yT + 3.5)} width={BAR_W - 2} height={1.5}
                fill={zoneColor} opacity={0.45} rx={0.5} />
              <rect x={x + 2} y={rainY} width={BAR_W - 4} height={rainBarH}
                fill="#60a5fa" opacity={0.6} rx={1} />
            </g>
          );
        })}
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", marginTop: 3 }}>
        {MONTHS_SHORT.map((m, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.22)", lineHeight: 1 }}>
            {m}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 5, background: zoneColor, opacity: 0.65, borderRadius: 1.5 }} />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
            {annualMin}–{annualMax}°C
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 5, background: "#60a5fa", opacity: 0.65, borderRadius: 1.5 }} />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
            {peakRain}mm peak ({peakMonth})
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {avgHumid > 0 && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>{avgHumid}% humid</span>
          )}
          {avgWind > 0 && (
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>{avgWind} km/h wind</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Zone colour palette ───────────────────────────────────────────────────────
const ZONE_COLORS = {
  1: "#e84040", 2: "#e86b40", 3: "#e8a040", 4: "#d4b800",
  5: "#4fa84a", 6: "#3d90d4", 7: "#6b5fd4", 8: "#a0a0c0",
};

// ── Compass helper ────────────────────────────────────────────────────────────
function compassPoint8(deg) {
  const d   = ((deg % 360) + 360) % 360;
  const pts = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return pts[Math.round(d / 45) % 8];
}

// ── Accordion section ─────────────────────────────────────────────────────────
function AccordionSection({ label, badge, isOpen, onToggle, children }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      flex: isOpen ? 1 : "0 0 auto",
      minHeight: 0,
      overflow: "hidden",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          background: isOpen ? "rgba(255,255,255,0.025)" : "none",
          border: "none",
          borderTop: "none",
          cursor: "pointer",
          textAlign: "left",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: isOpen ? "#e8eaf2" : "rgba(255,255,255,0.45)",
          }}>
            {label}
          </span>
          {badge != null && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.07)",
              padding: "1px 5px",
              borderRadius: 3,
              lineHeight: 1.5,
            }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{
          color: "rgba(255,255,255,0.25)",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 150ms ease",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}>
          <LucideIcons.ChevronDown size={13} strokeWidth={2} />
        </span>
      </button>

      {isOpen && (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DesignPanel({ isOpen, onClose, selectedLocation, northBearing }) {
  const [expandedSection, setExpandedSection] = useState("principles");
  const [expanded, setExpanded]               = useState({});
  const [zoneProfile, setZoneProfile]         = useState(null);

  const zone     = selectedLocation?.climateZone;
  const zoneData = zone != null ? principlesData[String(zone)] : null;

  // Reset to default section when zone changes
  useEffect(() => { setExpandedSection("principles"); }, [zone]);

  const toggleSection = (key) =>
    setExpandedSection((prev) => (prev === key ? null : key));

  useEffect(() => {
    if (!zone) { setZoneProfile(null); return; }
    let cancelled = false;
    const lat = selectedLocation?.lat;
    const lng = selectedLocation?.lng;
    const params = new URLSearchParams({ zone: String(zone) });
    if (lat != null && lng != null) { params.set("lat", String(lat)); params.set("lng", String(lng)); }
    fetch(`/api/sun-planner/zone-profile?${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setZoneProfile(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [zone]);

  const facingDirection = useMemo(
    () => (northBearing != null ? compassPoint8(northBearing) : null),
    [northBearing]
  );

  const sortedPrinciples = useMemo(() => {
    if (!zoneData?.principles) return [];
    return [...zoneData.principles].sort((a, b) => {
      if (facingDirection) {
        const aRel = Array.isArray(a.orientationRelevant) && a.orientationRelevant.includes(facingDirection) ? 0 : 1;
        const bRel = Array.isArray(b.orientationRelevant) && b.orientationRelevant.includes(facingDirection) ? 0 : 1;
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

  const hasFanReq = zoneProfile?.ceilingFanSummary?.required;

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
      )}

      <div style={{
        position: "fixed",
        top: 0, right: 0,
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
      }}>

        {/* ── Fixed header: panel title + zone identity ── */}
        <div style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: zoneData ? 12 : 0,
          }}>
            <span style={{ color: "#e8eaf2", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>
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

          {zoneData && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 2, letterSpacing: "0.01em" }}>
                  Zone {zone} · {zoneData.zoneStates}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Accordion body ── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}>
          {zoneData ? (
            <>
              {/* ── Section 1: Climate overview ── */}
              <AccordionSection
                label="Climate overview"
                isOpen={expandedSection === "climate"}
                onToggle={() => toggleSection("climate")}
              >
                <div style={{ padding: "14px 16px 16px" }}>
                  <p style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 11.5,
                    lineHeight: 1.6,
                    margin: "0 0 12px",
                  }}>
                    {zoneData.summary}
                  </p>

                  {zoneProfile?.profile?.feel_description && (
                    <div style={{
                      padding: "10px 11px",
                      borderRadius: 7,
                      background: `${ZONE_COLORS[zone]}0e`,
                      border: `1px solid ${ZONE_COLORS[zone]}25`,
                      marginBottom: 10,
                    }}>
                      <div style={{
                        color: ZONE_COLORS[zone],
                        fontSize: 9.5,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 5,
                        opacity: 0.85,
                      }}>
                        What it feels like to live here
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, lineHeight: 1.65, margin: 0 }}>
                        {zoneProfile.profile.feel_description}
                      </p>
                    </div>
                  )}

                  {zoneProfile?.monthlyClimate?.length === 12 && (
                    <div style={{
                      padding: "10px 11px",
                      borderRadius: 7,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}>
                        <div style={{
                          fontSize: 9.5,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,0.3)",
                        }}>
                          Monthly climate
                        </div>
                        {zoneProfile.climateCity && (
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>
                            {zoneProfile.climateCity.name}, {zoneProfile.climateCity.state}
                          </div>
                        )}
                      </div>
                      <ClimateStrip data={zoneProfile.monthlyClimate} zoneColor={ZONE_COLORS[zone]} />
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* ── Section 2: NCC requirements (only when applicable) ── */}
              {hasFanReq && (
                <AccordionSection
                  label="NCC requirements"
                  isOpen={expandedSection === "ncc"}
                  onToggle={() => toggleSection("ncc")}
                >
                  <div style={{ padding: "14px 16px 16px" }}>
                    <div style={{
                      padding: "10px 11px",
                      borderRadius: 7,
                      background: "rgba(96,165,250,0.07)",
                      border: "1px solid rgba(96,165,250,0.2)",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}>
                      <span style={{ color: "#60a5fa", flexShrink: 0, marginTop: 1 }}>
                        <LucideIcons.Wind size={12} strokeWidth={2} />
                      </span>
                      <div>
                        <div style={{ color: "#93c5fd", fontSize: 10.5, fontWeight: 500, lineHeight: 1.4 }}>
                          {zoneProfile.ceilingFanSummary.summary}
                        </div>
                        {zoneProfile.ceilingFanSummary.stateNote && (
                          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 3 }}>
                            {zoneProfile.ceilingFanSummary.stateNote}
                          </div>
                        )}
                        <div style={{ color: "rgba(255,255,255,0.22)", fontSize: 9.5, marginTop: 3 }}>
                          NCC 2025 Table 13.5.2
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionSection>
              )}

              {/* ── Section 3: Design principles ── */}
              <AccordionSection
                label="Design principles"
                badge={sortedPrinciples.length > 0 ? String(sortedPrinciples.length) : undefined}
                isOpen={expandedSection === "principles"}
                onToggle={() => toggleSection("principles")}
              >
                {sortedPrinciples.map((p) => {
                  const relevant = isRelevant(p);
                  const open     = !!expanded[p.id];
                  return (
                    <div
                      key={p.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        borderLeft: relevant ? "3px solid #F59E0B" : "3px solid transparent",
                        transition: "border-left-color 200ms ease",
                      }}
                    >
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
                        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "none"; }}
                      >
                        <span style={{
                          flexShrink: 0,
                          marginTop: 1,
                          color: relevant ? "#F59E0B" : "rgba(255,255,255,0.4)",
                          transition: "color 200ms ease",
                        }}>
                          <LucideIcon name={p.icon} size={14} color="currentColor" />
                        </span>
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

                      {open && (
                        <div style={{ padding: "0 14px 13px 37px" }}>
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
                })}
              </AccordionSection>
            </>
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
