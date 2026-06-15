import React, { useEffect, useState } from "react";
import api from "../api/client";

function fmt(n) { return "₲ " + Number(n || 0).toLocaleString("es-PY"); }
const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function agruparPorMes(items) {
  const mapa = {};
  items.forEach(i => {
    const [y, m] = i.fecha.split("-");
    const k = `${y}-${m.padStart(2,"0")}`;
    mapa[k] = (mapa[k] || 0) + Number(i.monto || 0);
  });
  return mapa;
}

export default function Resumen() {
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    const params = { page_size: 500 };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    setLoading(true);
    Promise.all([
      api.get("/ingresos/", { params }),
      api.get("/gastos/", { params }),
    ]).then(([ri, rg]) => {
      setIngresos(ri.data.results || ri.data);
      setGastos(rg.data.results || rg.data);
    }).finally(() => setLoading(false));
  }, [fechaDesde, fechaHasta]);

  const mapaI = agruparPorMes(ingresos);
  const mapaG = agruparPorMes(gastos);
  const meses = [...new Set([...Object.keys(mapaI), ...Object.keys(mapaG)])].sort().reverse();

  const totalI = Object.values(mapaI).reduce((a, b) => a + b, 0);
  const totalG = Object.values(mapaG).reduce((a, b) => a + b, 0);
  const totalN = totalI - totalG;
  const margenTotal = totalI > 0 ? ((totalN / totalI) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Resumen Financiero</h2>
      </div>

      {/* KPIs globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Ingresos", value: fmt(totalI), color: "#1e8449" },
          { label: "Total Gastos", value: fmt(totalG), color: "#922b21" },
          { label: "Ganancia Neta", value: fmt(totalN), color: totalN >= 0 ? "#1a5276" : "#922b21" },
          { label: "Margen", value: `${margenTotal}%`, color: Number(margenTotal) >= 20 ? "#1e8449" : "#e67e22" },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: "16px 20px" }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 12, padding: "12px 20px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#666", fontSize: 13 }}>Desde:</span>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: 140 }} />
          <span style={{ color: "#666", fontSize: 13 }}>Hasta:</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: 140 }} />
          {(fechaDesde || fechaHasta) && (
            <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => { setFechaDesde(""); setFechaHasta(""); }}>Limpiar</button>
          )}
        </div>
      </div>

      {/* Tabla mensual */}
      <div className="card">
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th style={{ textAlign: "right", color: "#1e8449" }}>Ingresos</th>
                  <th style={{ textAlign: "right", color: "#922b21" }}>Gastos</th>
                  <th style={{ textAlign: "right", color: "#1a5276" }}>Ganancia Neta</th>
                  <th style={{ textAlign: "right" }}>Margen %</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {meses.map(k => {
                  const [y, m] = k.split("-");
                  const ing = mapaI[k] || 0;
                  const gas = mapaG[k] || 0;
                  const neto = ing - gas;
                  const margen = ing > 0 ? ((neto / ing) * 100).toFixed(1) : 0;
                  const pct = ing > 0 ? Math.min(100, Math.max(0, (gas / ing) * 100)) : 0;
                  return (
                    <tr key={k}>
                      <td style={{ fontWeight: 600 }}>{MESES[parseInt(m)]} {y}</td>
                      <td style={{ textAlign: "right", color: "#1e8449", fontWeight: 600 }}>{fmt(ing)}</td>
                      <td style={{ textAlign: "right", color: "#922b21", fontWeight: 600 }}>{fmt(gas)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: neto >= 0 ? "#1a5276" : "#c0392b" }}>{fmt(neto)}</td>
                      <td style={{ textAlign: "right", color: Number(margen) >= 20 ? "#1e8449" : "#e67e22", fontWeight: 600 }}>{margen}%</td>
                      <td style={{ width: 140 }}>
                        <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#c0392b" : pct > 60 ? "#e67e22" : "#27ae60", borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{pct.toFixed(0)}% gastado</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td>TOTAL</td>
                  <td style={{ textAlign: "right", color: "#1e8449" }}>{fmt(totalI)}</td>
                  <td style={{ textAlign: "right", color: "#922b21" }}>{fmt(totalG)}</td>
                  <td style={{ textAlign: "right", color: totalN >= 0 ? "#1a5276" : "#c0392b" }}>{fmt(totalN)}</td>
                  <td style={{ textAlign: "right", color: Number(margenTotal) >= 20 ? "#1e8449" : "#e67e22" }}>{margenTotal}%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
