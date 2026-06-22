import React, { useEffect, useState } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import api from "../api/client";
import KPICard from "../components/KPICard";
import ViajesRecientes from "../components/ViajesRecientes";
import useCountUp from "../hooks/useCountUp";

const MESES_CORTOS = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const PERIODOS = [
  { key: "todo", label: "Todo" },
  { key: "anio", label: "Este año" },
  { key: "6m",   label: "6 meses" },
  { key: "3m",   label: "3 meses" },
];
const COLORES_DONUT = ["#00D4AA","#4DA6FF","#FFB800","#FF5B5B","#A78BFA","#64748B"];
const PRIMARY = "#00D4AA";

function fmt(n) { return "₲ " + Number(n || 0).toLocaleString("es-PY"); }

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
  if (key === "6m") { const d = new Date(hoy); d.setMonth(d.getMonth()-6); return d.toISOString().slice(0,10); }
  if (key === "3m") { const d = new Date(hoy); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); }
  return null;
}

function filtrar(items, desde) { return desde ? items.filter(i => i.fecha >= desde) : items; }
function varPct(a, b) { return (!b || b === 0) ? null : ((a - b) / b) * 100; }

function timeSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  const diff = (Date.now() - then.getTime()) / 1000;
  if (diff < 60)   return "hace menos de 1 min";
  if (diff < 3600) return `hace ${Math.round(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff/3600)} h`;
  return `hace ${Math.round(diff/86400)} días`;
}

// ── Status Card ──────────────────────────────────────────────────────
function StatusCard({ icon, label, estado, detail, delay = 0 }) {
  const cfg = {
    ok:      { color: "#00D4AA", bg: "rgba(0,212,170,0.06)",  text: "Operativo" },
    warning: { color: "#FFB800", bg: "rgba(255,184,0,0.06)",  text: "Atención" },
    error:   { color: "#FF5B5B", bg: "rgba(255,91,91,0.06)",  text: "Alerta" },
    offline: { color: "#334155", bg: "rgba(51,65,85,0.06)",   text: "Sin datos" },
  };
  const c = cfg[estado] || cfg.offline;

  return (
    <div style={{
      flex: 1, minWidth: 120,
      background: c.bg,
      border: `1px solid ${c.color}25`,
      borderRadius: 12,
      padding: "14px 15px",
      animation: `fadeInUp 0.4s ease-out ${delay}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            display: "inline-block", width: 7, height: 7, borderRadius: "50%",
            background: c.color,
            boxShadow: `0 0 6px ${c.color}`,
            animation: estado === "ok" ? "pulseDot 2s ease-in-out infinite" : "none",
          }} />
          <span style={{ fontSize: 10, color: c.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {c.text}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, marginBottom: 2 }}>{label}</div>
      {detail && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{detail}</div>}
    </div>
  );
}

// ── GPS Panel ────────────────────────────────────────────────────────
function GPSPanel({ posicion, gpsEstado, loadingGPS }) {
  const isOnline = !!posicion?.lat;
  const tiempoAtras = posicion?.timestamp ? timeSince(posicion.timestamp) : null;

  return (
    <div style={{
      background: "linear-gradient(145deg, #0C1422 0%, #0F1C30 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16,
      padding: 24,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📍</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1" }}>Ubicación en tiempo real</span>
        </div>
        <a href="/gps" style={{ fontSize: 12, color: PRIMARY, textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
          Ver mapa completo →
        </a>
      </div>

      {loadingGPS ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[80, 60, 100, 70].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: 16, width: `${w}%` }} />
          ))}
        </div>
      ) : isOnline ? (
        <>
          {/* Map embed */}
          <div style={{ borderRadius: 10, overflow: "hidden", height: 200, border: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
            <iframe
              title="GPS"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${posicion.lon-0.02},${posicion.lat-0.02},${posicion.lon+0.02},${posicion.lat+0.02}&layer=mapnik&marker=${posicion.lat},${posicion.lon}`}
              style={{ width: "100%", height: "100%", border: "none", filter: "invert(0.9) hue-rotate(180deg) saturate(0.7)" }}
            />
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "Latitud",      value: Number(posicion.lat).toFixed(5) },
              { label: "Longitud",     value: Number(posicion.lon).toFixed(5) },
              { label: "Última señal", value: tiempoAtras || "–" },
              { label: "Estado",       value: gpsEstado?.estado || "–" },
              { label: "Velocidad",    value: posicion.velocidad != null ? `${posicion.velocidad} km/h` : "–" },
              { label: "Patente",      value: "HBK137" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#334155" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <div style={{ fontSize: 13 }}>Sin datos de GPS disponibles</div>
          <a href="/gps" style={{ fontSize: 12, color: PRIMARY, marginTop: 8, display: "inline-block" }}>Abrir GPS →</a>
        </div>
      )}
    </div>
  );
}

// ── Summary Panel ────────────────────────────────────────────────────
function SummaryPanel({ totalI, totalG, ganancia, margen, combustible, meses }) {
  const litrosTotal = combustible.reduce((s, c) => s + Number(c.litros || 0), 0);
  const kmCargados  = combustible.length;
  const mesesLabel  = meses.length > 0 ? `${meses.length} mes${meses.length !== 1 ? "es" : ""}` : "—";

  const rows = [
    { icon: "💰", label: "Ingresos totales",      value: fmt(totalI),                  color: "#00D4AA" },
    { icon: "💸", label: "Gastos totales",         value: fmt(totalG),                  color: "#FF5B5B" },
    { icon: "📈", label: "Ganancia neta",          value: fmt(ganancia),                color: ganancia >= 0 ? "#4DA6FF" : "#FF5B5B" },
    { icon: "📊", label: "Margen operativo",       value: `${margen.toFixed(1)}%`,      color: "#A78BFA" },
    { icon: "⛽", label: "Litros cargados",        value: `${litrosTotal.toLocaleString("es-PY")} L`,   color: "#FFB800" },
    { icon: "🔋", label: "Cargas registradas",     value: `${kmCargados} cargas`,       color: "#00D4AA" },
    { icon: "📅", label: "Período analizado",      value: mesesLabel,                   color: "#64748B" },
  ];

  return (
    <div style={{
      background: "linear-gradient(145deg, #0C1422 0%, #0F1C30 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16,
      padding: 24,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 18 }}>📋</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1" }}>Resumen Ejecutivo</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {rows.map(({ icon, label, value, color }, i) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "11px 14px",
            background: i % 2 === 0 ? "rgba(255,255,255,0.025)" : "transparent",
            borderRadius: 8,
            animation: `fadeInUp 0.35s ease-out ${i * 0.05 + 0.1}s both`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>{label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  const [ingresos,    setIngresos]    = useState([]);
  const [gastos,      setGastos]      = useState([]);
  const [combustible, setCombustible] = useState([]);
  const [posicion,    setPosicion]    = useState(null);
  const [gpsEstado,   setGpsEstado]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingGPS,  setLoadingGPS]  = useState(true);
  const [periodo,     setPeriodo]     = useState("todo");

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

    Promise.all([
      api.get("/gps/posicion/").catch(() => ({ data: null })),
      api.get("/gps/estado/").catch(() => ({ data: null })),
    ]).then(([rp, re]) => {
      setPosicion(rp.data);
      setGpsEstado(re.data);
    }).finally(() => setLoadingGPS(false));
  }, []);

  const desde  = periodStart(periodo);
  const ing    = filtrar(ingresos, desde);
  const gas    = filtrar(gastos,   desde);
  const mapaI  = agruparPorMes(ing);
  const mapaG  = agruparPorMes(gas);
  const meses  = [...new Set([...Object.keys(mapaI), ...Object.keys(mapaG)])].sort();
  const ultimos8 = meses.slice(-8);

  const totalI   = Object.values(mapaI).reduce((a,b)=>a+b, 0);
  const totalG   = Object.values(mapaG).reduce((a,b)=>a+b, 0);
  const ganancia = totalI - totalG;
  const margen   = totalI > 0 ? (ganancia / totalI) * 100 : 0;

  const hoy       = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
  const mesPrev   = hoy.getMonth()===0 ? `${hoy.getFullYear()-1}-12` : `${hoy.getFullYear()}-${String(hoy.getMonth()).padStart(2,"0")}`;
  const ingMes    = mapaI[mesActual] || 0;
  const gasMes    = mapaG[mesActual] || 0;
  const ganMes    = ingMes - gasMes;
  const ingPrev   = mapaI[mesPrev]  || 0;
  const gasPrev   = mapaG[mesPrev]  || 0;
  const ganPrev   = ingPrev - gasPrev;
  const margenMes = ingMes > 0 ? (ganMes / ingMes) * 100 : 0;
  const varGan    = varPct(ganMes, ganPrev);

  // Count-up for hero
  const heroAnimated = useCountUp(loading ? 0 : Math.abs(ganancia));

  function exportarCSV() {
    const rows = [
      ["Tipo","Fecha","Monto","Descripcion"],
      ...ing.map(i => ["Ingreso", i.fecha, i.monto, i.descripcion||""]),
      ...gas.map(g => ["Gasto",   g.fecha, g.monto, g.descripcion||""]),
    ];
    const csv  = rows.map(r=>r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `rsosa_${periodo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Combustible status
  const latestComb  = combustible[0];
  const kmAut       = latestComb?.km_autonomia_restante ?? null;
  const combEstado  = kmAut === null ? "offline" : kmAut <= 60 ? "error" : kmAut <= 100 ? "warning" : "ok";
  const combDetail  = kmAut !== null ? `~${Math.round(kmAut)} km autonomía` : "Sin datos";

  // GPS status
  const gpsOnline   = !!posicion?.lat && !loadingGPS;
  const gpsEstadoVal = loadingGPS ? "offline" : gpsOnline ? "ok" : "offline";
  const gpsDetail   = gpsOnline ? (posicion?.timestamp ? timeSince(posicion.timestamp) : "Datos disponibles") : "Sin señal";

  // Camion status
  const camionEstado = gpsEstado?.estado;
  const camionEst    = loadingGPS ? "offline" : camionEstado?.toLowerCase().includes("deten") ? "warning" : camionEstado ? "ok" : "offline";

  const labels = ultimos8.map(k => {
    const [y, m] = k.split("-");
    return `${MESES_CORTOS[parseInt(m)]} ${y.slice(2)}`;
  });

  const darkTooltip = {
    backgroundColor: "#0F1C30",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    titleColor: "#E2E8F0",
    bodyColor: "#94A3B8",
    padding: 10,
    cornerRadius: 8,
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutQuart" },
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12, family: "Inter" }, boxWidth: 10, padding: 14, color: "#475569" } },
      tooltip: { ...darkTooltip, callbacks: { label: ctx => " ₲ " + Number(ctx.raw).toLocaleString("es-PY") } },
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#334155", font: { size: 11 } }, border: { color: "rgba(255,255,255,0.05)" } },
      y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#334155", callback: v => "₲ " + (v/1000000).toFixed(1)+"M", font: { size: 11 } }, border: { color: "rgba(255,255,255,0.05)" } },
    },
  };

  const gananciaData = ultimos8.map(k => (mapaI[k]||0) - (mapaG[k]||0));

  const chartBarData = {
    labels,
    datasets: [
      { label: "Ingresos", data: ultimos8.map(k=>mapaI[k]||0), backgroundColor: "rgba(0,212,170,0.70)", borderRadius: 5, borderSkipped: false },
      { label: "Gastos",   data: ultimos8.map(k=>mapaG[k]||0), backgroundColor: "rgba(255,91,91,0.70)", borderRadius: 5, borderSkipped: false },
    ],
  };

  const chartLineData = {
    labels,
    datasets: [{
      label: "Ganancia neta",
      data: gananciaData,
      borderColor: "#4DA6FF",
      backgroundColor: "rgba(77,166,255,0.06)",
      fill: true, tension: 0.4,
      pointRadius: 5, pointHoverRadius: 7,
      pointBackgroundColor: gananciaData.map(v => v >= 0 ? "#00D4AA" : "#FF5B5B"),
      pointBorderColor: "transparent",
      borderWidth: 2,
    }],
  };

  const mapaCategoria = {};
  gas.forEach(g => { const cat = g.categoria||g.tipo||"Otros"; mapaCategoria[cat]=(mapaCategoria[cat]||0)+Number(g.monto||0); });
  const catKeys   = Object.keys(mapaCategoria);
  const catValues = catKeys.map(k=>mapaCategoria[k]);
  const chartDonutData = {
    labels: catKeys.length ? catKeys : ["Sin datos"],
    datasets: [{ data: catValues.length ? catValues : [1], backgroundColor: COLORES_DONUT.slice(0, Math.max(catKeys.length,1)), borderWidth: 0, hoverOffset: 8 }],
  };
  const donutOpts = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1000 },
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12, family: "Inter" }, boxWidth: 10, padding: 10, color: "#475569" } },
      tooltip: { ...darkTooltip, callbacks: { label: ctx => ` ${ctx.label}: ₲ ${Number(ctx.raw).toLocaleString("es-PY")}` } },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, #0C1422 0%, #0F1C30 60%, #0C1422 100%)",
        border: "1px solid rgba(0,212,170,0.12)",
        borderRadius: 18,
        padding: "28px 36px",
        overflow: "hidden",
        animation: "fadeInUp 0.4s ease-out both",
      }}>
        {/* decorative glows */}
        <div style={{ position:"absolute", top:-80, right:-80, width:260, height:260, background:"radial-gradient(circle, rgba(0,212,170,0.09) 0%, transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-60, left:"30%", width:200, height:200, background:"radial-gradient(circle, rgba(77,166,255,0.04) 0%, transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />

        <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
          {/* Left: title + big number */}
          <div>
            <div style={{ fontSize:10, fontWeight:500, letterSpacing:3, color:PRIMARY, textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:PRIMARY, animation:"pulseDot 2s ease-in-out infinite" }} />
              Centro de Operaciones · R-SOSA Logística
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:12, flexWrap:"wrap" }}>
              {loading ? (
                <div className="skeleton" style={{ width:280, height:56, borderRadius:8 }} />
              ) : (
                <span style={{
                  fontSize: 54, fontWeight:700, letterSpacing:-2, lineHeight:1,
                  color: ganancia >= 0 ? PRIMARY : "#FF5B5B",
                  textShadow: `0 0 50px ${ganancia >= 0 ? "rgba(0,212,170,0.25)" : "rgba(255,91,91,0.25)"}`,
                  fontVariantNumeric:"tabular-nums",
                }}>
                  {ganancia < 0 ? "-" : ""}₲ {heroAnimated.toLocaleString("es-PY")}
                </span>
              )}
              {!loading && varGan !== null && (
                <span style={{
                  marginBottom:10, padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600,
                  color: varGan >= 0 ? PRIMARY : "#FF5B5B",
                  background: varGan >= 0 ? "rgba(0,212,170,0.10)" : "rgba(255,91,91,0.10)",
                  border: `1px solid ${varGan >= 0 ? "rgba(0,212,170,0.20)" : "rgba(255,91,91,0.20)"}`,
                }}>
                  {varGan >= 0 ? "▲" : "▼"} {Math.abs(varGan).toFixed(1)}% vs mes anterior
                </span>
              )}
            </div>
            <div style={{ fontSize:13, color:"#334155", marginTop:8, fontWeight:400 }}>
              Ganancia Neta Acumulada ·{" "}
              {hoy.toLocaleDateString("es-PY",{month:"long",year:"numeric"})}
            </div>
          </div>

          {/* Right: period + export */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
            <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:3, gap:2 }}>
              {PERIODOS.map(p => (
                <button key={p.key} onClick={()=>setPeriodo(p.key)} style={{
                  padding:"5px 13px", borderRadius:8, fontSize:12, fontWeight:500,
                  background: periodo===p.key ? PRIMARY : "transparent",
                  color: periodo===p.key ? "#050912" : "#475569",
                  border:"none", cursor:"pointer", transition:"all 0.15s",
                }}>{p.label}</button>
              ))}
            </div>
            <button onClick={exportarCSV} style={{
              padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:500,
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
              color:"#475569", cursor:"pointer",
            }}>↓ Exportar CSV</button>
          </div>
        </div>
      </div>

      {/* ── STATUS ROW ───────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <StatusCard icon="📡" label="GPS"          estado={gpsEstadoVal}  detail={gpsDetail}     delay={0.05} />
        <StatusCard icon="🚛" label="Camión"        estado={camionEst}     detail={camionEstado || "HBK137 Scania"}  delay={0.10} />
        <StatusCard icon="⛽" label="Combustible"   estado={combEstado}    detail={combDetail}    delay={0.15} />
        <StatusCard icon="🔧" label="Mantenimiento" estado="ok"            detail="Ver detalles →" delay={0.20} />
        <StatusCard icon="⚡" label="Sistema"       estado="ok"            detail="Railway · Vercel"  delay={0.25} />
      </div>

      {/* ── KPI ROW ──────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:12 }}>
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height:130, borderRadius:14 }} />
          ))
        ) : (<>
          <KPICard
            titulo="Ingresos del período"
            rawValue={totalI}
            formatFn={v => "₲ " + v.toLocaleString("es-PY")}
            icono="💰" color="#00D4AA"
            variacion={varPct(ingMes, ingPrev)}
            variacionLabel={`Mes actual: ${fmt(ingMes)}`}
          />
          <KPICard
            titulo="Gastos del período"
            rawValue={totalG}
            formatFn={v => "₲ " + v.toLocaleString("es-PY")}
            icono="💸" color="#FF5B5B"
            variacion={gasPrev ? varPct(gasMes, gasPrev) : null}
            variacionLabel={`Mes actual: ${fmt(gasMes)}`}
          />
          <KPICard
            titulo="Ganancia neta"
            rawValue={Math.abs(ganancia)}
            formatFn={v => (ganancia < 0 ? "-" : "") + "₲ " + v.toLocaleString("es-PY")}
            icono="📈" color="#4DA6FF"
            variacion={ganPrev ? varPct(ganMes, ganPrev) : null}
            variacionLabel={`Mes actual: ${fmt(ganMes)}`}
          />
          <KPICard
            titulo="Margen general"
            rawValue={Math.round(margen * 10)}
            formatFn={v => (v/10).toFixed(1) + "%"}
            icono="📊" color="#A78BFA"
            variacion={null}
            variacionLabel={`Mes actual: ${margenMes.toFixed(1)}% · ${meses.length} meses`}
          />
        </>)}
      </div>

      {/* ── MAP + SUMMARY ROW ────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"60% 1fr", gap:16 }}>
        <GPSPanel posicion={posicion} gpsEstado={gpsEstado} loadingGPS={loadingGPS} />
        <SummaryPanel totalI={totalI} totalG={totalG} ganancia={ganancia} margen={margen} combustible={combustible} meses={meses} />
      </div>

      {/* ── CHARTS ROW ───────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <div style={{ background:"linear-gradient(145deg,#0C1422,#0F1C30)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"20px 22px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#CBD5E1", marginBottom:16 }}>
            Ingresos vs Gastos — últimos 8 meses
          </div>
          <div style={{ height:240 }}>
            <Bar data={chartBarData} options={chartOpts} />
          </div>
        </div>
        <div style={{ background:"linear-gradient(145deg,#0C1422,#0F1C30)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"20px 22px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#CBD5E1", marginBottom:16 }}>
            Distribución de gastos
          </div>
          <div style={{ height:240 }}>
            <Doughnut data={chartDonutData} options={donutOpts} />
          </div>
        </div>
      </div>

      {/* ── LINE CHART + VIAJES RECIENTES ─────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:"linear-gradient(145deg,#0C1422,#0F1C30)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"20px 22px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#CBD5E1", marginBottom:16 }}>
            Evolución ganancia neta
          </div>
          <div style={{ height:220 }}>
            <Line data={chartLineData} options={chartOpts} />
          </div>
        </div>
        <div style={{ background:"linear-gradient(145deg,#0C1422,#0F1C30)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#CBD5E1" }}>Viajes recientes</span>
            <a href="/viajes" style={{ fontSize:12, color:PRIMARY, textDecoration:"none", fontWeight:500 }}>Ver todos →</a>
          </div>
          <ViajesRecientes />
        </div>
      </div>

    </div>
  );
}
