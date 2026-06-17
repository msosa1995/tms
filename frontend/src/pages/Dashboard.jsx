import React, { useEffect, useState } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import api from "../api/client";
import KPICard from "../components/KPICard";
import ViajesRecientes from "../components/ViajesRecientes";

const MESES_CORTOS = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const PERIODOS = [
  { key: "todo", label: "Todo" },
  { key: "anio", label: "Este año" },
  { key: "6m",   label: "6 meses" },
  { key: "3m",   label: "3 meses" },
];

const COLORES_DONUT = ["#00D4AA","#4DA6FF","#FFB800","#FF5B5B","#A78BFA","#64748B"];

function fmt(n) {
  return "₲ " + Number(n || 0).toLocaleString("es-PY");
}

function agruparPorMes(items) {
  const mapa = {};
  items.forEach(i => {
    const [y, m] = i.fecha.split("-");
    const k = `${y}-${m.padStart(2,"0")}`;
    mapa[k] = (mapa[k] || 0) + Number(i.monto || 0);
  });
  return mapa;
}

function periodStart(key) {
  const hoy = new Date();
  if (key === "anio") return `${hoy.getFullYear()}-01-01`;
  if (key === "6m") {
    const d = new Date(hoy); d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0,10);
  }
  if (key === "3m") {
    const d = new Date(hoy); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0,10);
  }
  return null;
}

function filtrar(items, desde) {
  if (!desde) return items;
  return items.filter(i => i.fecha >= desde);
}

function varPct(actual, anterior) {
  if (!anterior || anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

export default function Dashboard() {
  const [ingresos, setIngresos]   = useState([]);
  const [gastos, setGastos]       = useState([]);
  const [combustible, setCombustible] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [periodo, setPeriodo]     = useState("todo");

  useEffect(() => {
    Promise.all([
      api.get("/ingresos/",    { params: { page_size: 500 } }),
      api.get("/gastos/",      { params: { page_size: 500 } }),
      api.get("/combustible/", { params: { page_size: 500 } }),
    ]).then(([ri, rg, rc]) => {
      setIngresos(ri.data.results || ri.data);
      setGastos(rg.data.results   || rg.data);
      setCombustible(rc.data.results || rc.data);
    }).finally(() => setLoading(false));
  }, []);

  function exportarCSV() {
    const desde = periodStart(periodo);
    const ing = filtrar(ingresos, desde);
    const gas = filtrar(gastos, desde);
    const rows = [
      ["Tipo","Fecha","Monto","Descripcion"],
      ...ing.map(i => ["Ingreso", i.fecha, i.monto, i.descripcion || ""]),
      ...gas.map(g => ["Gasto",   g.fecha, g.monto, g.descripcion || ""]),
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `alas_${periodo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const desde = periodStart(periodo);
  const ing   = filtrar(ingresos, desde);
  const gas   = filtrar(gastos, desde);

  const mapaI = agruparPorMes(ing);
  const mapaG = agruparPorMes(gas);
  const meses = [...new Set([...Object.keys(mapaI), ...Object.keys(mapaG)])].sort();
  const ultimos8 = meses.slice(-8);

  const totalI  = Object.values(mapaI).reduce((a, b) => a + b, 0);
  const totalG  = Object.values(mapaG).reduce((a, b) => a + b, 0);
  const ganancia = totalI - totalG;
  const margen   = totalI > 0 ? (ganancia / totalI) * 100 : 0;

  // KPIs del mes actual
  const hoy       = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
  const mesPrev   = hoy.getMonth() === 0
    ? `${hoy.getFullYear()-1}-12`
    : `${hoy.getFullYear()}-${String(hoy.getMonth()).padStart(2,"0")}`;

  const ingMes    = mapaI[mesActual] || 0;
  const gasMes    = mapaG[mesActual] || 0;
  const ganMes    = ingMes - gasMes;
  const ingPrev   = mapaI[mesPrev]  || 0;
  const gasPrev   = mapaG[mesPrev]  || 0;
  const ganPrev   = ingPrev - gasPrev;
  const margenMes = ingMes > 0 ? (ganMes / ingMes) * 100 : 0;

  const labels = ultimos8.map(k => {
    const [y, m] = k.split("-");
    return `${MESES_CORTOS[parseInt(m)]} ${y.slice(2)}`;
  });

  const chartBarData = {
    labels,
    datasets: [
      {
        label: "Ingresos",
        data: ultimos8.map(k => mapaI[k] || 0),
        backgroundColor: "rgba(0,212,170,0.75)",
        borderRadius: 6,
      },
      {
        label: "Gastos",
        data: ultimos8.map(k => mapaG[k] || 0),
        backgroundColor: "rgba(255,91,91,0.75)",
        borderRadius: 6,
      },
    ],
  };

  const gananciaData = ultimos8.map(k => (mapaI[k] || 0) - (mapaG[k] || 0));
  const chartLineData = {
    labels,
    datasets: [{
      label: "Ganancia neta",
      data: gananciaData,
      borderColor: "#4DA6FF",
      backgroundColor: "rgba(77,166,255,0.08)",
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: gananciaData.map(v => v >= 0 ? "#1D9E75" : "#E24B4A"),
      borderWidth: 2,
    }],
  };

  // Donut: gastos por categoría
  const mapaCategoria = {};
  gas.forEach(g => {
    const cat = g.categoria || g.tipo || "Otros";
    mapaCategoria[cat] = (mapaCategoria[cat] || 0) + Number(g.monto || 0);
  });
  const catKeys   = Object.keys(mapaCategoria);
  const catValues = catKeys.map(k => mapaCategoria[k]);
  const chartDonutData = {
    labels: catKeys.length ? catKeys : ["Sin datos"],
    datasets: [{
      data: catValues.length ? catValues : [1],
      backgroundColor: COLORES_DONUT.slice(0, Math.max(catKeys.length, 1)),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const darkTooltip = {
    backgroundColor: "#1A2234",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    titleColor: "#E2E8F0",
    bodyColor: "#94A3B8",
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12 }, boxWidth: 12, padding: 12, color: "#64748B" } },
      tooltip: { ...darkTooltip, callbacks: { label: ctx => " ₲ " + Number(ctx.raw).toLocaleString("es-PY") } },
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#64748B", font: { size: 11 } } },
      y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#64748B", callback: v => "₲ " + Number(v).toLocaleString("es-PY"), font: { size: 11 } } },
    },
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12 }, boxWidth: 12, padding: 10, color: "#64748B" } },
      tooltip: { ...darkTooltip, callbacks: { label: ctx => ` ${ctx.label}: ₲ ${Number(ctx.raw).toLocaleString("es-PY")}` } },
    },
  };

  if (loading) return <div className="loading">Cargando dashboard...</div>;

  return (
    <div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#E2E8F0" }}>Dashboard</h2>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
            {MESES_CORTOS[hoy.getMonth()+1]} {hoy.getFullYear()} · R-SOSA Soluciones Logísticas
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Selector de período */}
          <div style={{ display: "flex", background: "#fff", border: "0.5px solid #E2E8F0", borderRadius: 8, padding: 3, gap: 2 }}>
            {PERIODOS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: periodo === p.key ? "#1D9E75" : "transparent",
                  color: periodo === p.key ? "#fff" : "#64748B",
                  border: "none", cursor: "pointer", transition: "all 0.12s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportarCSV}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: "#fff", border: "0.5px solid #E2E8F0", color: "#64748B",
              cursor: "pointer", transition: "all 0.12s",
            }}
          >
            ↓ Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        <KPICard
          titulo="Ingresos del período"
          valor={fmt(totalI)}
          icono="💰"
          color="#1D9E75"
          variacion={varPct(ingMes, ingPrev)}
          variacionLabel={`Mes actual: ${fmt(ingMes)}`}
        />
        <KPICard
          titulo="Gastos del período"
          valor={fmt(totalG)}
          icono="💸"
          color="#E24B4A"
          variacion={gasPrev ? varPct(gasMes, gasPrev) : null}
          variacionLabel={`Mes actual: ${fmt(gasMes)}`}
        />
        <KPICard
          titulo="Ganancia neta"
          valor={fmt(ganancia)}
          icono="📈"
          color="#378ADD"
          variacion={ganPrev ? varPct(ganMes, ganPrev) : null}
          variacionLabel={`Mes actual: ${fmt(ganMes)}`}
        />
        <KPICard
          titulo="Margen general"
          valor={`${margen.toFixed(1)}%`}
          icono="📊"
          color="#8B5CF6"
          variacion={null}
          variacionLabel={`Mes actual: ${margenMes.toFixed(1)}% · ${meses.length} meses`}
        />
      </div>

      {/* Gráficos fila 1: Bar + Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0", marginBottom: 16 }}>
            Ingresos vs Gastos — últimos 8 meses
          </div>
          <div style={{ height: 260 }}>
            <Bar data={chartBarData} options={chartOpts} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0", marginBottom: 16 }}>
            Distribución de gastos
          </div>
          <div style={{ height: 260 }}>
            <Doughnut data={chartDonutData} options={donutOpts} />
          </div>
        </div>
      </div>

      {/* Gráficos fila 2: Line + Viajes recientes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0", marginBottom: 16 }}>
            Evolución de ganancia neta
          </div>
          <div style={{ height: 240 }}>
            <Line data={chartLineData} options={chartOpts} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#E2E8F0" }}>Viajes recientes</div>
            <a href="/viajes" style={{ fontSize: 12, color: "#1D9E75", textDecoration: "none", fontWeight: 500 }}>
              Ver todos →
            </a>
          </div>
          <ViajesRecientes />
        </div>
      </div>

    </div>
  );
}
