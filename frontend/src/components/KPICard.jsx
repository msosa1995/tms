import React from "react";
import useCountUp from "../hooks/useCountUp";

export default function KPICard({ titulo, valor, rawValue, formatFn, icono, color, variacion, variacionLabel }) {
  const animated = useCountUp(rawValue ?? 0);
  const display = formatFn ? formatFn(animated) : (rawValue !== undefined ? animated.toLocaleString("es-PY") : valor);
  const up = variacion >= 0;

  return (
    <div className="fade-in-up" style={{
      background: "linear-gradient(145deg, #0C1422 0%, #111D2E 100%)",
      border: `1px solid rgba(255,255,255,0.07)`,
      borderTop: `2px solid ${color}`,
      borderRadius: 14,
      padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 10,
      position: "relative", overflow: "hidden",
    }}>
      {/* Glow background */}
      <div style={{
        position: "absolute", top: -30, right: -30, width: 100, height: 100,
        background: `radial-gradient(circle, ${color}14 0%, transparent 70%)`,
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          {icono}
        </div>
        {variacion != null && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: up ? "#00D4AA" : "#FF5B5B",
            background: up ? "rgba(0,212,170,0.10)" : "rgba(255,91,91,0.10)",
            border: `1px solid ${up ? "rgba(0,212,170,0.2)" : "rgba(255,91,91,0.2)"}`,
            padding: "3px 8px", borderRadius: 20,
          }}>
            {up ? "▲" : "▼"} {Math.abs(variacion).toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{
        fontSize: 23, fontWeight: 700, color,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: -0.5,
        textShadow: `0 0 30px ${color}40`,
        lineHeight: 1.2,
        position: "relative",
      }}>
        {display}
      </div>

      <div style={{ fontSize: 12, fontWeight: 500, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {titulo}
      </div>

      {variacionLabel && (
        <div style={{ fontSize: 11, color: "#334155", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
          {variacionLabel}
        </div>
      )}
    </div>
  );
}
