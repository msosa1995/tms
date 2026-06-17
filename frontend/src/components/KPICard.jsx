import React from "react";

export default function KPICard({ titulo, valor, icono, color, variacion, variacionLabel }) {
  const up = variacion >= 0;
  return (
    <div style={{
      background: "#fff",
      border: "0.5px solid #E2E8F0",
      borderRadius: 12,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
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
            color: up ? "#1D9E75" : "#E24B4A",
            background: up ? "rgba(29,158,117,0.10)" : "rgba(226,75,74,0.10)",
            padding: "2px 8px", borderRadius: 20,
          }}>
            {up ? "▲" : "▼"} {Math.abs(variacion).toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{ fontSize: 20, fontWeight: 500, color: "#1E293B", lineHeight: 1.25 }}>
        {valor}
      </div>

      <div style={{ fontSize: 12, fontWeight: 400, color: "#64748B" }}>{titulo}</div>

      {variacionLabel && (
        <div style={{ fontSize: 11, fontWeight: 400, color: "#94A3B8" }}>{variacionLabel}</div>
      )}
    </div>
  );
}
