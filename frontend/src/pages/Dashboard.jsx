import React, { useEffect, useState } from "react";
import api from "../api/client";

function fmt(n) {
  if (n == null) return "₲ 0";
  return "₲ " + Number(n).toLocaleString("es-PY");
}

const CAT_COLOR = {
  combustible: "#e67e22", peajes: "#8e44ad", viaticos: "#27ae60",
  reparaciones: "#c0392b", neumaticos: "#2980b9", mantenimiento: "#16a085",
  seguros: "#f39c12", impuestos: "#7f8c8d", otros: "#34495e",
};
const CAT_LABEL = {
  combustible: "Combustible", peajes: "Peajes", viaticos: "Viáticos",
  reparaciones: "Reparaciones", neumaticos: "Neumáticos", mantenimiento: "Mantenimiento",
  seguros: "Seguros", impuestos: "Impuestos", otros: "Otros",
};

function MesLabel(mes) {
  if (!mes) return "";
  const [y, m] = mes.split("-");
  const nombres = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${nombres[parseInt(m)]} ${y}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/")
      .then(r => { setData(r.data.results?.[0] || r.data); setLoading(false); })
      .catch(() => { setError("No se pudo cargar el dashboard"); setLoading(false); });
  }, []);

  if (loading) return <div className="loading">Cargando dashboard...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return null;

  const margen = data.margen_porcentaje ?? 0;
  const margenColor = margen >= 40 ? "#1e8449" : margen >= 20 ? "#9a7d0a" : "#922b21";

  // Datos para el gráfico de barras manual
  const mesesIngresos = {};
  (data.evolucion_ingresos || []).forEach(r => { mesesIngresos[r.mes] = r.total; });
  const mesesGastos = {};
  (data.evolucion_gastos || []).forEach(r => { mesesGastos[r.mes] = r.total; });
  const todosMeses = [...new Set([
    ...Object.keys(mesesIngresos),
    ...Object.keys(mesesGastos),
  ])].sort();
  const maxVal = Math.max(
    ...todosMeses.map(m => Math.max(mesesIngresos[m] || 0, mesesGastos[m] || 0)),
    1
  );

  const gastosCateg = Object.entries(data.gastos_por_categoria || {})
    .sort(([, a], [, b]) => b - a);
  const totalGastos = gastosCateg.reduce((s, [, v]) => s + v, 0);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dashboard — Camión ALAS</h2>
        <span style={{ color: "#7f8c9a", fontSize: 13 }}>Resumen general del negocio</span>
      </div>

      {/* KPIs principales */}
      <div className="stat-grid">
        <div className="stat-card" style={{ borderLeftColor: "#2ecc71" }}>
          <div className="label">Total Facturado (ALAS)</div>
          <div className="value" style={{ color: "#1e8449" }}>{fmt(data.total_ingresos)}</div>
          <div className="sub">Acumulado total</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#e74c3c" }}>
          <div className="label">Total Gastos</div>
          <div className="value" style={{ color: "#922b21" }}>{fmt(data.total_gastos)}</div>
          <div className="sub">Último trimestre: {fmt(data.gastos_90d)}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#f39c12" }}>
          <div className="label">Ganancia Neta</div>
          <div className="value" style={{ color: margenColor }}>{fmt(data.ganancia_total)}</div>
          <div className="sub">Margen: {margen.toFixed(1)}%</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#3498db" }}>
          <div className="label">Último Cobro ALAS</div>
          <div className="value" style={{ fontSize: 20 }}>{fmt(data.ultimo_ingreso?.monto)}</div>
          <div className="sub">{data.ultimo_ingreso?.periodo || data.ultimo_ingreso?.fecha || "—"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Gráfico de barras ingresos vs gastos por mes */}
        {todosMeses.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16, color: "#1a5276", fontWeight: 700 }}>Ingresos vs Gastos por Mes</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, paddingBottom: 4 }}>
              {todosMeses.map(mes => (
                <div key={mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 120 }}>
                    <div style={{
                      flex: 1, background: "#2ecc71",
                      height: `${((mesesIngresos[mes] || 0) / maxVal) * 100}%`,
                      minHeight: 2, borderRadius: "2px 2px 0 0",
                    }} title={`Ingreso: ${fmt(mesesIngresos[mes] || 0)}`} />
                    <div style={{
                      flex: 1, background: "#e74c3c",
                      height: `${((mesesGastos[mes] || 0) / maxVal) * 100}%`,
                      minHeight: 2, borderRadius: "2px 2px 0 0",
                    }} title={`Gasto: ${fmt(mesesGastos[mes] || 0)}`} />
                  </div>
                  <span style={{ fontSize: 9, color: "#7f8c9a", whiteSpace: "nowrap" }}>{MesLabel(mes)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "#7f8c9a" }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#2ecc71", borderRadius: 2, marginRight: 4 }} />Ingresos</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#e74c3c", borderRadius: 2, marginRight: 4 }} />Gastos</span>
            </div>
          </div>
        )}

        {/* Gastos por categoría */}
        {gastosCateg.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 14, color: "#1a5276", fontWeight: 700 }}>Gastos por Categoría</h3>
            {gastosCateg.map(([cat, total]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: "#2c3e50", fontWeight: 600 }}>{CAT_LABEL[cat] || cat}</span>
                  <span style={{ color: "#7f8c9a" }}>{fmt(total)}</span>
                </div>
                <div style={{ background: "#f0f3f7", borderRadius: 4, height: 6 }}>
                  <div style={{
                    width: `${(total / totalGastos) * 100}%`,
                    height: "100%",
                    background: CAT_COLOR[cat] || "#95a5a6",
                    borderRadius: 4,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gastos recientes */}
      {data.gastos_recientes?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 14, color: "#1a5276", fontWeight: 700 }}>Gastos Recientes</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th></tr>
              </thead>
              <tbody>
                {data.gastos_recientes.map((g, i) => (
                  <tr key={i}>
                    <td>{g.fecha}</td>
                    <td>{g.descripcion}</td>
                    <td>
                      <span className="badge" style={{ background: CAT_COLOR[g.categoria] || "#95a5a6", color: "#fff" }}>
                        {CAT_LABEL[g.categoria] || g.categoria}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#922b21" }}>{fmt(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
