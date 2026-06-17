import React, { useEffect, useState } from "react";
import api from "../api/client";

const ESTADO_STYLE = {
  finalizado: { bg: "rgba(29,158,117,0.10)",  text: "#1D9E75" },
  en_curso:   { bg: "rgba(55,138,221,0.10)",  text: "#378ADD" },
  programado: { bg: "rgba(239,159,39,0.10)",  text: "#EF9F27" },
  cancelado:  { bg: "rgba(226,75,74,0.10)",   text: "#E24B4A" },
};
const ESTADO_LABEL = {
  finalizado: "Finalizado",
  en_curso:   "En Curso",
  programado: "Programado",
  cancelado:  "Cancelado",
};

export default function ViajesRecientes() {
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/viajes/", { params: { page_size: 5, ordering: "-fecha_salida" } })
      .then(r => setViajes((r.data.results || r.data).slice(0, 5)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ color: "#94A3B8", fontSize: 13, padding: "20px 0" }}>Cargando...</div>
  );

  if (!viajes.length) return (
    <div style={{ color: "#94A3B8", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
      No hay viajes registrados.
    </div>
  );

  return (
    <div>
      {viajes.map((v, i) => {
        const s = ESTADO_STYLE[v.estado] || ESTADO_STYLE.programado;
        const label = ESTADO_LABEL[v.estado] || v.estado;
        const cliente = v.cliente_info?.razon_social || v.cliente_info?.nombre || "—";
        return (
          <div key={v.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: i < viajes.length - 1 ? "0.5px solid #E2E8F0" : "none",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 500, color: "#1E293B",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {v.origen} → {v.destino}
              </div>
              <div style={{ fontSize: 12, fontWeight: 400, color: "#64748B", marginTop: 2 }}>
                {cliente} · {v.fecha_salida}
              </div>
            </div>
            <span style={{
              marginLeft: 12, padding: "3px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
              background: s.bg, color: s.text,
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
