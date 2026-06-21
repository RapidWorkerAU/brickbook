"use client";

import { useEffect, useRef, useState } from "react";

const SEVERITY_COLOR = {
  warning: "#f87171",
  caution: "#F59E0B",
  good:    "#34D399",
  info:    "#60A5FA",
  neutral: "rgba(255,255,255,0.25)",
};

const FACE_SEVERITY_COLOR = {
  "night":    "rgba(255,255,255,0.12)",
  "horizon":  "#a78bfa",
  "direct":   "#F59E0B",
  "partial":  "#60A5FA",
  "shaded":   "rgba(255,255,255,0.20)",
};

// mode="card" → absolute-positioned overlay (desktop default)
// mode="panel" → relative, full-width (used inside full-screen mobile overlay)
export default function SunCommentaryCard({ commentary, mode = "card" }) {
  const { icon, severity, headline, detail, tip, otherFaces } = commentary;
  const color = SEVERITY_COLOR[severity] ?? SEVERITY_COLOR.neutral;

  // Fade-in when commentary changes
  const [visible, setVisible] = useState(false);
  const prevHeadline = useRef(null);

  useEffect(() => {
    if (headline !== prevHeadline.current) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 40);
      prevHeadline.current = headline;
      return () => clearTimeout(t);
    }
  }, [headline]);

  useEffect(() => { setVisible(true); }, []);

  const cardStyle = mode === "card" ? {
    position: "absolute", bottom: 20, left: 20, width: 292,
    zIndex: 8, pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(6px)",
    transition: "opacity 350ms ease, transform 350ms ease",
  } : {
    position: "relative", width: "100%",
  };

  return (
    <div
      style={{
        ...cardStyle,
        background: "rgba(15, 17, 23, 0.90)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: "11px 14px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
          {icon}
        </span>
        <span style={{
          color: "#e8eaf2",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.35,
        }}>
          {headline}
        </span>
      </div>

      {/* Detail */}
      <div style={{
        padding: "9px 14px",
        color: "rgba(255,255,255,0.55)",
        fontSize: 11,
        lineHeight: 1.65,
        borderBottom: (tip || (otherFaces && otherFaces.length)) ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}>
        {detail}
      </div>

      {/* Tip */}
      {tip && (
        <div style={{
          padding: "8px 14px 10px",
          display: "flex", gap: 6, alignItems: "flex-start",
          borderBottom: (otherFaces && otherFaces.length) ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
          <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>💡</span>
          <span style={{
            color: "rgba(255,255,255,0.38)",
            fontSize: 10.5,
            lineHeight: 1.6,
            letterSpacing: "0.01em",
          }}>
            {tip}
          </span>
        </div>
      )}

      {/* All-faces NCC grid */}
      {otherFaces && otherFaces.length > 0 && (
        <div style={{ padding: "8px 14px 10px" }}>
          <div style={{
            color: "rgba(255,255,255,0.22)",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            marginBottom: 7,
          }}>
            All faces · NCC design guidance
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {otherFaces.map((face) => {
              const faceColor = FACE_SEVERITY_COLOR[face.illum] ?? FACE_SEVERITY_COLOR.shaded;
              return (
                <div key={face.dir} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                  {/* Face initial badge */}
                  <div style={{
                    flexShrink: 0,
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: faceColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: face.illum === "night" || face.illum === "shaded"
                      ? "rgba(255,255,255,0.50)"
                      : "rgba(0,0,0,0.75)",
                    marginTop: 1,
                  }}>
                    {face.label[0]}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex", alignItems: "baseline", gap: 4,
                      color: "rgba(255,255,255,0.65)",
                      fontSize: 10,
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}>
                      <span style={{ marginRight: 1 }}>{face.icon}</span>
                      <span>{face.statusLabel}</span>
                    </div>
                    {face.rooms && (
                      <div style={{
                        color: "rgba(255,255,255,0.30)",
                        fontSize: 9.5,
                        lineHeight: 1.45,
                        marginTop: 2,
                      }}>
                        {face.rooms}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
