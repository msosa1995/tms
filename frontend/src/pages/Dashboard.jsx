import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import "chart.js/auto";
import api from "../api/client";

function fmt(n) { return "₲ " + Number(n || 0).toLocaleString("es-PY"); }
const MESES_CORTOS = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function agruparPorMes(items) {
  const mapa = {};
  items.forEach(i => {
    const [y, m] = i.fecha.split("-");
    const k = `${y}-${m.padStart(2,"0")}`;
    mapa[k] = (mapa[k] || 0) + Number(i.monto || 0);
  });
  return mapa;
}

export default function Dashboard() {
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [combustible, setCombustible] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/ingresos/", { params: { page_size: 500 } }),
      api.get("/gastos/", { params: { page_size: 500 } }),
      api.get("/combustible/", { params: { page_size: 500 } }),
    ]).then(([ri, rg, rc]) => {
      setIngresos(ri.data.results || ri.data);
      setGastos(rg.data.results || rg.data);
      setCombustible(rc.data.results || rc.data);
    }).finally(() => setLoading(false));
  }, []);

  const mapaI = agruparPorMes(ingresos);
  const mapaG = agruparPorMes(gastos);
  const meses = [...new Set([...Object.keys(mapaI), ...Object.keys(mapaG)])].sort();
  const ultimos8 = meses.slice(-8);

  const totalI = Object.values(mapaI).reduce((a, b) => a + b, 0);
  const totalG = Object.values(mapaG).reduce((a, b) => a + b, 0);
  const ganancia = totalI - totalG;
  const margen = totalI > 0 ? ((ganancia / totalI) * 100).toFixed(1) : 0;

  // KPIs del mes actual
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
  const ingMes = mapaI[mesActual] || 0;
  const gasMes = mapaG[mesActual] || 0;
  const ganMes = ingMes - gasMes;

  const labels = ultimos8.map(k => {
    const [y, m] = k.split("-");
    return `${MESES_CORTOS[parseInt(m)]} ${y.slice(2)}`;
  });

  const chartIngrGastos = {
    labels,
    datasets: [
      {
        label: "Ingresos",
        data: ultimos8.map(k => mapaI[k] || 0),
        backgroundColor: "rgba(30,132,73,0.75)",
        borderRadius: 6,
      },
      {
        label: "Gastos",
        data: ultimos8.map(k => mapaG[k] || 0),
        backgroundColor: "rgba(192,57,43,0.75)",
        borderRadius: 6,
      },
    ],
  };

  const gananciaData = ultimos8.map(k => (mapaI[k] || 0) - (mapaG[k] || 0));
  const chartGanancia = {
    labels,
    datasets: [{
      label: "Ganancia neta",
      data: gananciaData,
      borderColor: "#2e86c1",
      backgroundColor: "rgba(46,134,193,0.15)",
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: gananciaData.map(v => v >= 0 ? "#1e8449" : "#c0392b"),
    }],
  };

  const chartOpts = {
    responsive: true,
    plugins: { legend: { position: "bottom" }, tooltip: {
      callbacks: { label: ctx => "₲ " + Number(ctx.raw).toLocaleString("es-PY") }
    }},
    scales: { y: { ticks: { callback: v => "₲ " + Number(v).toLocaleString("es-PY") } } },
  };

  if (loading) return <div className="loading">Cargando dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Ingresos totales", value: fmt(totalI), color: "#1e8449", sub: `Mes actual: ${fmt(ingMes)}` },
          { label: "Gastos totales", value: fmt(totalG), color: "#922b21", sub: `Mes actual: ${fmt(gasMes)}` },
          { label: "Ganancia neta", value: fmt(ganancia), color: ganancia >= 0 ? "#1a5276" : "#c0392b", sub: `Mes actual: ${fmt(ganMes)}` },
          { label: "Margen general", value: `${margen}%`, color: Number(margen) >= 20 ? "#1e8449" : "#e67e22", sub: `${meses.length} meses registrados` },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: "16px 20px" }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: "#333" }}>Ingresos vs Gastos (últimos 8 meses)</div>
          <div style={{ position: "relative", height: 280 }}>
            <Bar data={chartIngrGastos} options={{ ...chartOpts, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: "#333" }}>Evolución de ganancia neta</div>
          <div style={{ position: "relative", height: 280 }}>
            <Line data={chartGanancia} options={{ ...chartOpts, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Resumen rápido del mes */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: "#333" }}>
          Mes actual — {MESES_CORTOS[hoy.getMonth()+1]} {hoy.getFullYear()}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Ingresos</div>
            <div style={{ fontWeight: 700, color: "#1e8449", fontSize: 18 }}>{fmt(ingMes)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Gastos</div>
            <div style={{ fontWeight: 700, color: "#922b21", fontSize: 18 }}>{fmt(gasMes)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Ganancia</div>
            <div style={{ fontWeight: 700, color: ganMes >= 0 ? "#1a5276" : "#c0392b", fontSize: 18 }}>{fmt(ganMes)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Margen</div>
            <div style={{ fontWeight: 700, color: "#e67e22", fontSize: 18 }}>
              {ingMes > 0 ? ((ganMes / ingMes) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Cargas combustible</div>
            <div style={{ fontWeight: 700, color: "#2980b9", fontSize: 18 }}>
              {combustible.filter(c => c.fecha?.startsWith(mesActual)).length} cargas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
