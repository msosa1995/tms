import React from "react";

export default function KPICard({ titulo, valor, icono, color, variacion, variacionLabel }) {
  const up = variacion >= 0;
  return (
    <div style={{
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.07)",
      borderTop: `2px solid ${color}`,
      borderRadius: 12,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 19,
        }}>
          {icono}
        </div>
        {variacion != null && (
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: up ? "#00D4AA" : "#FF5B5B",
            background: up ? "rgba(0,212,170,0.10)" : "rgba(255,91,91,0.10)",
            padding: "2px 8px", borderRadius: 20,
          }}>
            {up ? "▲" : "▼"} {Math.abs(variacion).toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{
        fontSize: 22, fontWeight: 500,
        color: color,
        fontFamily: "'Courier New', monospace",
        lineHeight: 1.2,
        textShadow: `0 0 24px ${color}50`,
      }}>
        {valor}
      </div>

      <div style={{ fontSize: 12, fontWeight: 400, color: "#64748B" }}>{titulo}</div>

      {variacionLabel && (
        <div style={{ fontSize: 11, fontWeight: 400, color: "#374151" }}>{variacionLabel}</div>
      )}
    </div>
  );
}
