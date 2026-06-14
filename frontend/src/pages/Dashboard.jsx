import React, { useEffect, useState } from "react";
import api from "../api/client";

function fmt(n) {
  if (n == null) return "₲ 0";
  return "₲ " + Number(n).toLocaleString("es-PY");
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/").then(r => { setData(r.data.results?.[0] || r.data); setLoading(false); })
      .catch(() => { setError("No se pudo cargar el dashboard"); setLoading(false); });
  }, []);

  if (loading) return <div className="loading">Cargando dashboard...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return null;

  const margen = data.margen_porcentaje ?? 0;
  const margenColor = margen >= 20 ? "#1e8449" : margen >= 10 ? "#9a7d0a" : "#922b21";

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <span style={{ color: "#7f8c9a", fontSize: 13 }}>
          {data.periodo?.inicio} — {data.periodo?.fin}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card" style={{ borderLeftColor: "#2ecc71" }}>
          <div className="label">Ingresos del Mes</div>
          <div className="value" style={{ color: "#1e8449" }}>{fmt(data.ingresos_mes)}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#e74c3c" }}>
          <div className="label">Gastos del Mes</div>
          <div className="value" style={{ color: "#922b21" }}>{fmt(data.gastos_mes)}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#f39c12" }}>
          <div className="label">Ganancia Neta</div>
          <div className="value" style={{ color: margenColor }}>{fmt(data.ganancia_neta)}</div>
          <div className="sub">Margen: {margen.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Viajes Realizados</div>
          <div className="value">{data.viajes_realizados ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Km Recorridos</div>
          <div className="value">{Number(data.km_recorridos || 0).toLocaleString("es-PY")}</div>
          <div className="sub">Costo/km: ₲ {Number(data.costo_por_km || 0).toFixed(0)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {data.gastos_por_categoria && Object.keys(data.gastos_por_categoria).length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 14, color: "#1a5276", fontWeight: 700 }}>Gastos por Categoría</h3>
            {Object.entries(data.gastos_por_categoria)
              .sort(([,a], [,b]) => b - a)
              .map(([cat, total]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f3f7" }}>
                  <span style={{ textTransform: "capitalize", color: "#2c3e50" }}>{cat}</span>
                  <span style={{ fontWeight: 600, color: "#1a5276" }}>{fmt(total)}</span>
                </div>
              ))}
          </div>
        )}

        {data.top_clientes && data.top_clientes.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 14, color: "#1a5276", fontWeight: 700 }}>Top Clientes (año)</h3>
            {data.top_clientes.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0f3f7" }}>
                <span style={{ color: "#2c3e50" }}>
                  <span style={{ color: "#7f8c9a", marginRight: 8 }}>#{i + 1}</span>
                  {c.cliente__razon_social}
                </span>
                <span style={{ fontWeight: 600, color: "#1a5276" }}>{fmt(c.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
