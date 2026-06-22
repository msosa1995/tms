import React, { useEffect, useState } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  Satellite, Truck, Fuel, Wrench, Activity,
  MapPin, FileText, ChevronRight,
} from "lucide-react";
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
const COLORES_DONUT = ["#00D4AA","#3B9EFF","#F5A623","#F05252","#9B8AFB","#586075"];
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
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return "hace < 1 min";
  if (diff < 3600)  return `hace ${Math.round(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff/3600)} h`;
  return `hace ${Math.round(diff/86400)} días`;
}

// ── Status Card ──────────────────────────────────────────────────────
function StatusCard({ Icon, label, estado, detail, delay = 0 }) {
  const cfg = {
    ok:      { color: "#00D4AA", bg: "rgba(0,212,170,0.05)",    text: "Operativo" },
    warning: { color: "#F5A623", bg: "rgba(245,166,35,0.05)",   text: "Atención"  },
    error:   { color: "#F05252", bg: "rgba(240,82,82,0.05)",    text: "Alerta"    },
    offline: { color: "#2D3A52", bg: "rgba(45,58,82,0.06)",     text: "Sin datos" },
  };
  const c = cfg[estado] || cfg.offline;

  return (
    <div style={{
      flex: 1, minWidth: 118,
      background: c.bg,
      border: `1px solid ${c.color}20`,
      borderRadius: 10,
      padding: "13px 14px",
      animation: `fadeInUp 0.38s ease-out ${delay}s both`,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <Icon size={15} color={c.color} strokeWidth={1.8} />
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span className={estado === "ok" ? "pulse-dot" : ""} style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:c.color }} />
          <span style={{ fontSize:10, color:c.color, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{c.text}</span>
        </div>
      </div>
      <div style={{ fontSize:12, color:"#7A8EA8", fontWeight:500, marginBottom:2 }}>{label}</div>
      {detail && <div style={{ fontSize:10, color:"#2D3A52", marginTop:1 }}>{detail}</div>}
    </div>
  );
}

// ── GPS Panel ────────────────────────────────────────────────────────
function GPSPanel({ posicion, gpsEstado, loadingGPS }) {
  const isOnline = !!posicion?.lat;

  return (
    <div style={{ background:"linear-gradient(145deg,#0C1020,#101628)", border:"1px solid rgba(255,255,255,0.055)", borderRadius:14, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <MapPin size={15} color={PRIMARY} strokeWidth={1.8} />
          <span style={{ fontSize:13, fontWeight:600, color:"#B8C8DC" }}>Ubicación en tiempo real</span>
        </div>
        <a href="/gps" style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:PRIMARY, textDecoration:"none", fontWeight:500 }}>
          Mapa completo <ChevronRight size={13} strokeWidth={2} />
        </a>
      </div>

      {loadingGPS ? (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[80,55,100,65].map((w,i) => <div key={i} className="skeleton" style={{ height:14, width:`${w}%` }} />)}
        </div>
      ) : isOnline ? (
        <>
          <div style={{ borderRadius:9, overflow:"hidden", height:190, border:"1px solid rgba(255,255,255,0.07)" }}>
            <iframe
              title="GPS"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${posicion.lon-0.02},${posicion.lat-0.02},${posicion.lon+0.02},${posicion.lat+0.02}&layer=mapnik&marker=${posicion.lat},${posicion.lon}`}
              style={{ width:"100%", height:"100%", border:"none", filter:"invert(0.88) hue-rotate(180deg) saturate(0.6)" }}
            />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { label:"Latitud",   value: Number(posicion.lat).toFixed(5) },
              { label:"Longitud",  value: Number(posicion.lon).toFixed(5) },
              { label:"Señal",     value: posicion.timestamp ? timeSince(posicion.timestamp) : "–" },
              { label:"Estado",    value: gpsEstado?.estado || "–" },
              { label:"Velocidad", value: posicion.velocidad != null ? `${posicion.velocidad} km/h` : "–" },
              { label:"Patente",   value: "HBK137" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.02)", borderRadius:7, padding:"8px 10px", border:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize:9, color:"#2D3A52", textTransform:"uppercase", letterSpacing:0.6, marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:500, color:"#7A8EA8", fontVariantNumeric:"tabular-nums" }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign:"center", padding:"36px 20px", color:"#2D3A52" }}>
          <Satellite size={28} color="#2D3A52" strokeWidth={1.2} style={{ marginBottom:10 }} />
          <div style={{ fontSize:13 }}>Sin datos de GPS</div>
          <a href="/gps" style={{ fontSize:12, color:PRIMARY, marginTop:8, display:"inline-block" }}>Abrir GPS →</a>
        </div>
      )}
    </div>
  );
}

// ── Summary Panel ────────────────────────────────────────────────────
function SummaryPanel({ totalI, totalG, ganancia, margen, combustible, meses }) {
  const litros   = combustible.reduce((s,c) => s + Number(c.litros||0), 0);
  const cargas   = combustible.length;
  const mesesLbl = meses.length ? `${meses.length} mes${meses.length !== 1 ? "es" : ""}` : "—";

  const rows = [
    { Icon: TrendingUp,   label: "Ingresos totales",  value: fmt(totalI),                         color: "#00D4AA" },
    { Icon: TrendingDown, label: "Gastos totales",     value: fmt(totalG),                         color: "#F05252" },
    { Icon: DollarSign,   label: "Ganancia neta",      value: fmt(ganancia),                       color: ganancia>=0 ? "#3B9EFF" : "#F05252" },
    { Icon: Percent,      label: "Margen operativo",   value: `${margen.toFixed(1)}%`,             color: "#9B8AFB" },
    { Icon: Fuel,         label: "Litros cargados",    value: `${litros.toLocaleString("es-PY")} L`, color: "#F5A623" },
    { Icon: Activity,     label: "Cargas registradas", value: `${cargas} cargas`,                  color: "#00D4AA" },
    { Icon: FileText,     label: "Período analizado",  value: mesesLbl,                            color: "#586075" },
  ];

  return (
    <div style={{ background:"linear-gradient(145deg,#0C1020,#101628)", border:"1px solid rgba(255,255,255,0.055)", borderRadius:14, padding:20, display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <FileText size={14} color="#3D4E6A" strokeWidth={1.8} />
        <span style={{ fontSize:13, fontWeight:600, color:"#B8C8DC" }}>Resumen Ejecutivo</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:2, flex:1 }}>
        {rows.map(({ Icon: RowIcon, label, value, color }, i) => (
          <div key={label} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"9px 12px",
            background: i%2===0 ? "rgba(255,255,255,0.02)" : "transparent",
            borderRadius:7,
            animation:`fadeInUp 0.32s ease-out ${i*0.05+0.08}s both`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <RowIcon size={13} color={color} strokeWidth={1.8} />
              <span style={{ fontSize:12, color:"#3D4E6A", fontWeight:400 }}>{label}</span>
            </div>
            <span style={{ fontSize:12, fontWeight:600, color, fontVariantNumeric:"tabular-nums" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart panel wrapper ──────────────────────────────────────────────
function ChartPanel({ title, children }) {
  return (
    <div style={{ background:"linear-gradient(145deg,#0C1020,#101628)", border:"1px solid rgba(255,255,255,0.055)", borderRadius:14, padding:"18px 20px" }}>
      <div style={{ fontSize:12, fontWeight:600, color:"#586075", textTransform:"uppercase", letterSpacing:0.8, marginBottom:14 }}>{title}</div>
      {children}
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
      api.get("/ingresos/",    { params:{ page_size:500 } }),
      api.get("/gastos/",      { params:{ page_size:500 } }),
      api.get("/combustible/", { params:{ page_size:500 } }),
    ]).then(([ri,rg,rc]) => {
      setIngresos(ri.data.results||ri.data);
      setGastos(rg.data.results||rg.data);
      setCombustible(rc.data.results||rc.data);
    }).finally(()=>setLoading(false));

    Promise.all([
      api.get("/gps/posicion/").catch(()=>({ data:null })),
      api.get("/gps/estado/").catch(()=>({ data:null })),
    ]).then(([rp,re])=>{ setPosicion(rp.data); setGpsEstado(re.data); })
      .finally(()=>setLoadingGPS(false));
  }, []);

  const desde   = periodStart(periodo);
  const ing     = filtrar(ingresos, desde);
  const gas     = filtrar(gastos,   desde);
  const mapaI   = agruparPorMes(ing);
  const mapaG   = agruparPorMes(gas);
  const meses   = [...new Set([...Object.keys(mapaI),...Object.keys(mapaG)])].sort();
  const ult8    = meses.slice(-8);

  const totalI   = Object.values(mapaI).reduce((a,b)=>a+b,0);
  const totalG   = Object.values(mapaG).reduce((a,b)=>a+b,0);
  const ganancia = totalI - totalG;
  const margen   = totalI>0 ? (ganancia/totalI)*100 : 0;

  const hoy      = new Date();
  const mesAct   = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;
  const mesPrev  = hoy.getMonth()===0 ? `${hoy.getFullYear()-1}-12` : `${hoy.getFullYear()}-${String(hoy.getMonth()).padStart(2,"0")}`;
  const ingMes   = mapaI[mesAct]||0;  const gasMes   = mapaG[mesAct]||0;
  const ganMes   = ingMes-gasMes;
  const ingPrev  = mapaI[mesPrev]||0; const gasPrev  = mapaG[mesPrev]||0;
  const ganPrev  = ingPrev-gasPrev;
  const mgMes    = ingMes>0 ? (ganMes/ingMes)*100 : 0;
  const varGan   = varPct(ganMes, ganPrev);

  // Animated hero
  const heroAnim = useCountUp(loading ? 0 : Math.abs(ganancia));

  function exportarCSV() {
    const rows = [["Tipo","Fecha","Monto","Descripcion"],...ing.map(i=>["Ingreso",i.fecha,i.monto,i.descripcion||""]),...gas.map(g=>["Gasto",g.fecha,g.monto,g.descripcion||""])];
    const blob = new Blob([rows.map(r=>r.join(";")).join("\n")],{type:"text/csv;charset=utf-8;"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`rsosa_${periodo}.csv`; a.click();
  }

  // Status computation
  const latestComb = combustible[0];
  const kmAut      = latestComb?.km_autonomia_restante ?? null;
  const combEst    = kmAut===null ? "offline" : kmAut<=60 ? "error" : kmAut<=100 ? "warning" : "ok";
  const combDetail = kmAut!==null ? `~${Math.round(kmAut)} km autonomía` : "Sin datos";
  const gpsOnline  = !!posicion?.lat && !loadingGPS;
  const gpsEst     = loadingGPS ? "offline" : gpsOnline ? "ok" : "offline";
  const gpsDetail  = gpsOnline ? (posicion?.timestamp ? timeSince(posicion.timestamp) : "Disponible") : "Sin señal";
  const camionEst  = loadingGPS ? "offline" : (gpsEstado?.estado?.toLowerCase().includes("deten") ? "warning" : gpsEstado?.estado ? "ok" : "offline");

  const labels    = ult8.map(k=>{ const [y,m]=k.split("-"); return `${MESES_CORTOS[+m]} ${y.slice(2)}`; });
  const ganData   = ult8.map(k=>(mapaI[k]||0)-(mapaG[k]||0));

  const darkTip = { backgroundColor:"#0C1020", borderColor:"rgba(255,255,255,0.07)", borderWidth:1, titleColor:"#E8EFF8", bodyColor:"#7A8EA8", padding:10, cornerRadius:7 };

  const scalesOpts = {
    x:{ grid:{ color:"rgba(255,255,255,0.025)" }, ticks:{ color:"#2D3A52", font:{ size:10 } }, border:{ color:"rgba(255,255,255,0.04)" } },
    y:{ grid:{ color:"rgba(255,255,255,0.025)" }, ticks:{ color:"#2D3A52", callback:v=>"₲ "+(v/1000000).toFixed(1)+"M", font:{ size:10 } }, border:{ color:"rgba(255,255,255,0.04)" } },
  };
  const baseOpts = {
    responsive:true, maintainAspectRatio:false,
    animation:{ duration:900, easing:"easeOutQuart" },
    plugins:{
      legend:{ position:"bottom", labels:{ font:{ size:11, family:"Inter" }, boxWidth:9, padding:12, color:"#3D4E6A" } },
      tooltip:{ ...darkTip, callbacks:{ label:ctx=>" ₲ "+Number(ctx.raw).toLocaleString("es-PY") } },
    },
    scales: scalesOpts,
  };

  const chartBarData = {
    labels,
    datasets:[
      { label:"Ingresos", data:ult8.map(k=>mapaI[k]||0), backgroundColor:"rgba(0,212,170,0.65)", borderRadius:4, borderSkipped:false },
      { label:"Gastos",   data:ult8.map(k=>mapaG[k]||0), backgroundColor:"rgba(240,82,82,0.65)",  borderRadius:4, borderSkipped:false },
    ],
  };
  const chartLineData = {
    labels,
    datasets:[{
      label:"Ganancia neta", data:ganData,
      borderColor:"#3B9EFF", backgroundColor:"rgba(59,158,255,0.05)",
      fill:true, tension:0.42, pointRadius:4, pointHoverRadius:6,
      pointBackgroundColor:ganData.map(v=>v>=0?"#00D4AA":"#F05252"),
      pointBorderColor:"transparent", borderWidth:2,
    }],
  };
  const mapaCategoria = {};
  gas.forEach(g=>{ const cat=g.categoria||g.tipo||"Otros"; mapaCategoria[cat]=(mapaCategoria[cat]||0)+Number(g.monto||0); });
  const catKeys=Object.keys(mapaCategoria), catVals=catKeys.map(k=>mapaCategoria[k]);
  const chartDonutData = {
    labels: catKeys.length ? catKeys : ["Sin datos"],
    datasets:[{ data:catVals.length?catVals:[1], backgroundColor:COLORES_DONUT.slice(0,Math.max(catKeys.length,1)), borderWidth:0, hoverOffset:7 }],
  };
  const donutOpts = {
    responsive:true, maintainAspectRatio:false,
    animation:{ duration:900 },
    plugins:{
      legend:{ position:"bottom", labels:{ font:{ size:11, family:"Inter" }, boxWidth:9, padding:10, color:"#3D4E6A" } },
      tooltip:{ ...darkTip, callbacks:{ label:ctx=>` ${ctx.label}: ₲ ${Number(ctx.raw).toLocaleString("es-PY")}` } },
    },
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div style={{
        position:"relative",
        background:"linear-gradient(135deg, #0B101E 0%, #0F1628 60%, #0B101E 100%)",
        border:"1px solid rgba(0,212,170,0.10)",
        borderRadius:16, padding:"24px 32px", overflow:"hidden",
        animation:"fadeInUp 0.38s ease-out both",
      }}>
        <div style={{ position:"absolute", top:-70, right:-70, width:240, height:240, background:"radial-gradient(circle, rgba(0,212,170,0.07) 0%, transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-50, left:"35%", width:180, height:180, background:"radial-gradient(circle, rgba(59,158,255,0.04) 0%, transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />

        <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontSize:9, fontWeight:600, letterSpacing:3, color:"#00A890", textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:7 }}>
              <span className="pulse-dot" style={{ display:"inline-block", width:5, height:5, borderRadius:"50%", background:PRIMARY }} />
              Centro de Operaciones · R-SOSA Logística
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:12, flexWrap:"wrap" }}>
              {loading ? (
                <div className="skeleton" style={{ width:260, height:50, borderRadius:8 }} />
              ) : (
                <span style={{
                  fontSize:50, fontWeight:700, letterSpacing:-2, lineHeight:1,
                  color: ganancia>=0 ? PRIMARY : "#F05252",
                  textShadow:`0 0 48px ${ganancia>=0 ? "rgba(0,212,170,0.22)" : "rgba(240,82,82,0.22)"}`,
                  fontVariantNumeric:"tabular-nums",
                }}>
                  {ganancia<0 ? "-" : ""}₲ {heroAnim.toLocaleString("es-PY")}
                </span>
              )}
              {!loading && varGan!==null && (
                <span style={{
                  marginBottom:9, padding:"3px 11px", borderRadius:20, fontSize:11, fontWeight:600,
                  color:  varGan>=0 ? PRIMARY : "#F05252",
                  background: varGan>=0 ? "rgba(0,212,170,0.09)" : "rgba(240,82,82,0.09)",
                  border: `1px solid ${varGan>=0 ? "rgba(0,212,170,0.18)" : "rgba(240,82,82,0.18)"}`,
                }}>
                  {varGan>=0 ? "▲" : "▼"} {Math.abs(varGan).toFixed(1)}% vs mes anterior
                </span>
              )}
            </div>
            <div style={{ fontSize:12, color:"#2D3A52", marginTop:7 }}>
              Ganancia Neta Acumulada · {hoy.toLocaleDateString("es-PY",{month:"long",year:"numeric"})}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:9 }}>
            <div style={{ display:"flex", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:9, padding:3, gap:2 }}>
              {PERIODOS.map(p=>(
                <button key={p.key} onClick={()=>setPeriodo(p.key)} style={{
                  padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:500,
                  background: periodo===p.key ? PRIMARY : "transparent",
                  color:      periodo===p.key ? "#07090F" : "#3D4E6A",
                  border:"none", cursor:"pointer", transition:"all 0.14s",
                }}>{p.label}</button>
              ))}
            </div>
            <button onClick={exportarCSV} style={{ padding:"5px 13px", borderRadius:7, fontSize:11, fontWeight:500, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", color:"#3D4E6A", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
              <TrendingDown size={11} strokeWidth={2} /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── STATUS ROW ───────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <StatusCard Icon={Satellite} label="GPS"          estado={gpsEst}    detail={gpsDetail}                    delay={0.04} />
        <StatusCard Icon={Truck}     label="Camión"        estado={camionEst} detail={gpsEstado?.estado||"HBK137"}  delay={0.08} />
        <StatusCard Icon={Fuel}      label="Combustible"   estado={combEst}   detail={combDetail}                   delay={0.12} />
        <StatusCard Icon={Wrench}    label="Mantenimiento" estado="ok"        detail="Ver detalles"                 delay={0.16} />
        <StatusCard Icon={Activity}  label="Sistema"       estado="ok"        detail="Railway · Vercel"             delay={0.20} />
      </div>

      {/* ── KPI ROW ──────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(175px,1fr))", gap:12 }}>
        {loading ? [1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:125, borderRadius:12 }} />) : (<>
          <KPICard titulo="Ingresos del período" rawValue={totalI} formatFn={v=>"₲ "+v.toLocaleString("es-PY")} icon={TrendingUp}   color="#00D4AA" variacion={varPct(ingMes,ingPrev)} variacionLabel={`Mes actual: ${fmt(ingMes)}`} />
          <KPICard titulo="Gastos del período"   rawValue={totalG} formatFn={v=>"₲ "+v.toLocaleString("es-PY")} icon={TrendingDown}  color="#F05252" variacion={gasPrev?varPct(gasMes,gasPrev):null} variacionLabel={`Mes actual: ${fmt(gasMes)}`} />
          <KPICard titulo="Ganancia neta"         rawValue={Math.abs(ganancia)} formatFn={v=>(ganancia<0?"-":"")+"₲ "+v.toLocaleString("es-PY")} icon={DollarSign} color="#3B9EFF" variacion={ganPrev?varPct(ganMes,ganPrev):null} variacionLabel={`Mes actual: ${fmt(ganMes)}`} />
          <KPICard titulo="Margen general"        rawValue={Math.round(margen*10)} formatFn={v=>(v/10).toFixed(1)+"%"} icon={Percent} color="#9B8AFB" variacion={null} variacionLabel={`Mes: ${mgMes.toFixed(1)}% · ${meses.length} meses`} />
        </>)}
      </div>

      {/* ── MAP + SUMMARY ────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>
        <GPSPanel posicion={posicion} gpsEstado={gpsEstado} loadingGPS={loadingGPS} />
        <SummaryPanel totalI={totalI} totalG={totalG} ganancia={ganancia} margen={margen} combustible={combustible} meses={meses} />
      </div>

      {/* ── CHARTS ROW 1 ─────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
        <ChartPanel title="Ingresos vs Gastos · últimos 8 meses">
          <div style={{ height:230 }}><Bar data={chartBarData} options={baseOpts} /></div>
        </ChartPanel>
        <ChartPanel title="Distribución de gastos">
          <div style={{ height:230 }}><Doughnut data={chartDonutData} options={donutOpts} /></div>
        </ChartPanel>
      </div>

      {/* ── CHARTS ROW 2 ─────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <ChartPanel title="Evolución ganancia neta">
          <div style={{ height:210 }}><Line data={chartLineData} options={baseOpts} /></div>
        </ChartPanel>
        <div style={{ background:"linear-gradient(145deg,#0C1020,#101628)", border:"1px solid rgba(255,255,255,0.055)", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#586075", textTransform:"uppercase", letterSpacing:0.8 }}>Viajes recientes</span>
            <a href="/viajes" style={{ fontSize:11, color:PRIMARY, textDecoration:"none", fontWeight:500, display:"flex", alignItems:"center", gap:3 }}>
              Ver todos <ChevronRight size={12} strokeWidth={2} />
            </a>
          </div>
          <ViajesRecientes />
        </div>
      </div>

    </div>
  );
}
