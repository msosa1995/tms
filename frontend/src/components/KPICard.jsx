import React from "react";
import useCountUp from "../hooks/useCountUp";

export default function KPICard({ titulo, rawValue, formatFn, icon: Icon, color, variacion, variacionLabel }) {
  const animated = useCountUp(rawValue ?? 0);
  const display  = formatFn ? formatFn(animated) : animated.toLocaleString("es-PY");
  const up       = variacion >= 0;

  return (
    <div className="fade-in-up" style={{
      background: "linear-gradient(145deg, #0C1020 0%, #101628 100%)",
      border: "1px solid rgba(255,255,255,0.055)",
      borderTop: `1px solid ${color}50`,
      borderRadius: 12,
      padding: "18px 20px",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Glow */}
      <div style={{ position:"absolute", top:-40, right:-40, width:110, height:110, background:`radial-gradient(circle, ${color}10 0%, transparent 70%)`, borderRadius:"50%", pointerEvents:"none" }} />

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative" }}>
        <div style={{ width:34, height:34, borderRadius:8, background:`${color}12`, border:`1px solid ${color}20`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {Icon && <Icon size={16} color={color} strokeWidth={2} />}
        </div>
        {variacion != null && (
          <span style={{
            fontSize:11, fontWeight:600,
            color:  up ? "#00D4AA" : "#F05252",
            background: up ? "rgba(0,212,170,0.09)" : "rgba(240,82,82,0.09)",
            border: `1px solid ${up ? "rgba(0,212,170,0.18)" : "rgba(240,82,82,0.18)"}`,
            padding:"2px 8px", borderRadius:20,
          }}>
            {up ? "▲" : "▼"} {Math.abs(variacion).toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{ position:"relative" }}>
        <div style={{ fontSize:25, fontWeight:700, color, fontVariantNumeric:"tabular-nums", letterSpacing:-0.5, lineHeight:1.1, textShadow:`0 0 28px ${color}30` }}>
          {display}
        </div>
        <div style={{ fontSize:11, fontWeight:500, color:"#3D4E6A", textTransform:"uppercase", letterSpacing:0.7, marginTop:6 }}>
          {titulo}
        </div>
      </div>

      {variacionLabel && (
        <div style={{ fontSize:11, color:"#2D3A52", borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:8 }}>
          {variacionLabel}
        </div>
      )}
    </div>
  );
}
