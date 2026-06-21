"use client";
import { useState, useEffect } from "react";

export default function LaunchModal({ onBlock, onPlan }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const cardPad   = isMobile ? "14px 14px 16px" : "24px 22px 22px";
  const iconSize  = isMobile ? 22 : 30;
  const iconMb    = isMobile ? 10 : 14;
  const titleSize = isMobile ? 14 : 17;
  const titleMb   = isMobile ? 6  : 10;
  const descSize  = isMobile ? 11 : 13;
  const descMb    = isMobile ? 12 : 20;
  const tagsMb    = isMobile ? 12 : 22;
  const ctaPad    = isMobile ? "7px 14px" : "9px 18px";
  const ctaFont   = isMobile ? 12 : 13;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "#080b10",
      overflowY: "auto",
      fontFamily: "inherit",
    }}>
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100%",
      padding: isMobile ? "24px 12px 32px" : "32px 16px 40px",
      boxSizing: "border-box",
    }}>
      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? 20 : 28 }}>
        <div style={{ fontSize: isMobile ? 28 : 36, lineHeight: 1, marginBottom: isMobile ? 10 : 12 }}>☀️</div>
        <h1 style={{
          color: "#ffffff", fontSize: isMobile ? 20 : 26, fontWeight: 700,
          letterSpacing: "-0.03em", margin: "0 0 6px",
        }}>
          Sun Planner
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.38)", fontSize: isMobile ? 12 : 14,
          margin: 0, lineHeight: 1.5,
        }}>
          How would you like to get started?
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: "flex", gap: isMobile ? 10 : 12, width: "100%", maxWidth: 680,
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {/* Block card */}
        <button
          onClick={onBlock}
          style={{
            flex: "1 1 240px", maxWidth: 320,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14, padding: cardPad,
            cursor: "pointer", textAlign: "left",
            transition: "border-color 180ms ease, background 180ms ease",
            position: "relative", overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(91,127,255,0.5)";
            e.currentTarget.style.background = "rgba(91,127,255,0.07)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
        >
          <div style={{ fontSize: iconSize, marginBottom: iconMb, lineHeight: 1 }}>🗺️</div>
          <div style={{
            color: "#ffffff", fontSize: titleSize, fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: titleMb,
          }}>
            I have a block in mind
          </div>
          <p style={{
            color: "rgba(255,255,255,0.42)", fontSize: descSize,
            lineHeight: 1.6, margin: `0 0 ${descMb}px`,
          }}>
            Search for a property or suburb. We will centre a satellite map on your block so you can align your floor plan and set north automatically.
          </p>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 5, marginBottom: tagsMb,
          }}>
            {["📍 Search address", "🧭 Auto north", "📐 Overlay floor plan"].map((tag) => (
              <span key={tag} style={{
                fontSize: isMobile ? 10 : 11, padding: isMobile ? "2px 7px" : "3px 8px", borderRadius: 5,
                background: "rgba(91,127,255,0.12)",
                border: "1px solid rgba(91,127,255,0.22)",
                color: "#8ba4ff", whiteSpace: "nowrap",
              }}>{tag}</span>
            ))}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: ctaPad, borderRadius: 8,
            background: "#5b7fff", color: "#fff",
            fontSize: ctaFont, fontWeight: 600, letterSpacing: "-0.01em",
          }}>
            Start with map
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </button>

        {/* Plan card */}
        <button
          onClick={onPlan}
          style={{
            flex: "1 1 240px", maxWidth: 320,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14, padding: cardPad,
            cursor: "pointer", textAlign: "left",
            transition: "border-color 180ms ease, background 180ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)";
            e.currentTarget.style.background = "rgba(245,158,11,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
        >
          <div style={{ fontSize: iconSize, marginBottom: iconMb, lineHeight: 1 }}>📐</div>
          <div style={{
            color: "#ffffff", fontSize: titleSize, fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: titleMb,
          }}>
            I already have a floor plan
          </div>
          <p style={{
            color: "rgba(255,255,255,0.42)", fontSize: descSize,
            lineHeight: 1.6, margin: `0 0 ${descMb}px`,
          }}>
            Upload a JPG or PNG of your floor plan directly and set your north bearing manually. Great if you already know your orientation.
          </p>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 5, marginBottom: tagsMb,
          }}>
            {["📁 Upload image", "🔄 Manual north", "⚡ Start instantly"].map((tag) => (
              <span key={tag} style={{
                fontSize: isMobile ? 10 : 11, padding: isMobile ? "2px 7px" : "3px 8px", borderRadius: 5,
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.22)",
                color: "#F59E0B", whiteSpace: "nowrap",
              }}>{tag}</span>
            ))}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: ctaPad, borderRadius: 8,
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.35)",
            color: "#F59E0B",
            fontSize: ctaFont, fontWeight: 600, letterSpacing: "-0.01em",
          }}>
            Upload floor plan
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </button>
      </div>

      {/* Footer hint */}
      <p style={{
        color: "rgba(255,255,255,0.2)", fontSize: isMobile ? 10 : 11,
        marginTop: isMobile ? 20 : 32, textAlign: "center",
      }}>
        Australian NCC climate zones · Solar arc calculations · Passive design analysis
      </p>
    </div>
    </div>
  );
}
