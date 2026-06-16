import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import api from "../api/client";

const MESES = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmtFecha(str) {
  const [y, m, d] = str.split("-");
  return `${d} ${MESES[parseInt(m)]} ${y}`;
}

function Badge({ color, label }) {
  const COLORES = {
    green:  { bg: "#d5f5e3", text: "#1e8449" },
    yellow: { bg: "#fef9e7", text: "#9a7d0a" },
    red:    { bg: "#fadbd8", text: "#922b21" },
    gray:   { bg: "#eaecee", text: "#555"    },
  };
  const c = COLORES[color] || COLORES.gray;
  return (
    <span style={{ background: c.bg, color: c.text, padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12 }}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AlertaMant({ mant }) {
  if (!mant) return null;
  const cfg = {
    vencido: { bg: "#c0392b", text: "#fff",    icon: "🚨", msg: "¡VENCIDO! Realizar mantenimiento inmediatamente" },
    urgente: { bg: "#e74c3c", text: "#fff",    icon: "⚠️", msg: `Quedan solo ${mant.km_hasta} km — hacé el mantenimiento pronto` },
    proximo: { bg: "#f1c40f", text: "#7d6608", icon: "🔔", msg: `Próximo mantenimiento en ${mant.km_hasta} km` },
    ok:      { bg: "#d5f5e3", text: "#1e8449", icon: "✅", msg: `Mantenimiento al día — faltan ${mant.km_hasta} km` },
  };
  const s = cfg[mant.alerta] || cfg.ok;
  return (
    <div style={{ background: s.bg, color: s.text, borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontWeight: 600, fontSize: 14 }}>
      {s.icon} {s.msg}
      <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.85, marginLeft: 8 }}>
        ({mant.descripcion} cada {mant.intervalo?.toLocaleString() || "5.000"} km)
      </span>
    </div>
  );
}

function BarraCombustible({ pct }) {
  const color = pct > 50 ? "#1e8449" : pct > 25 ? "#e67e22" : "#c0392b";
  return (
    <div style={{ background: "#eee", borderRadius: 20, height: 12, overflow: "hidden", margin: "8px 0" }}>
      <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 20, transition: "width 0.5s" }} />
    </div>
  );
}

export default function Gps() {
  const [posicion, setPosicion] = useState(null);
  const [estado,   setEstado]   = useState(null);
  const [resumen,  setResumen]  = useState(null);
  const [loadPos,  setLoadPos]  = useState(true);
  const [diasSel,  setDiasSel]  = useState(30);
  const [loadRes,  setLoadRes]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [errorPos, setErrorPos] = useState(null);

  function cargarPosicion() {
    setLoadPos(true);
    setErrorPos(null);
    api.get("/gps/posicion/")
      .then(r => { setPosicion(r.data.dispositivos); setLastRefresh(new Date().toLocaleTimeString("es-PY")); })
      .catch(() => setErrorPos("No se pudo obtener la posición GPS"))
      .finally(() => setLoadPos(false));
  }

  function cargarEstado() {
    api.get("/gps/estado/").then(r => setEstado(r.data)).catch(() => {});
  }

  function cargarResumen(dias) {
    setLoadRes(true);
    api.get("/gps/resumen/", { params: { dias, dispositivo: "HBK137" } })
      .then(r => setResumen(r.data))
      .finally(() => setLoadRes(false));
  }

  useEffect(() => {
    cargarPosicion();
    cargarEstado();
    cargarResumen(diasSel);
    const interval = setInterval(() => { cargarPosicion(); cargarEstado(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const camion  = posicion?.find(d => d.nombre === "HBK137");
  const ultimos7 = resumen?.resumen?.slice(-7) || [];
  const mant    = estado?.mantenimiento;
  const comb    = estado?.combustible;
  const odo     = estado?.odometro;

  const chartData = {
    labels: ultimos7.map(d => fmtFecha(d.fecha)),
    datasets: [{
      label: "Km recorridos",
      data: ultimos7.map(d => d.km),
      backgroundColor: ultimos7.map(d => d.km > 0 ? "rgba(192,57,43,0.75)" : "rgba(200,200,200,0.4)"),
      borderRadius: 6,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.raw} km` } } },
    scales: { y: { beginAtZero: true, ticks: { callback: v => `${v} km` } } },
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">GPS — HBK137 Scania R450</h2>
        <button className="btn btn-outline btn-sm" onClick={() => { cargarPosicion(); cargarEstado(); }} disabled={loadPos}>
          {loadPos ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {lastRefresh && (
        <div style={{ color: "#90a4ae", fontSize: 12, marginBottom: 16 }}>
          Actualizado: {lastRefresh} · Auto-refresca cada 1 minuto
        </div>
      )}

      {/* ── Alerta mantenimiento ── */}
      {mant && <AlertaMant mant={mant} />}

      {/* ── Panel de control ── */}
      {estado && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
          <KpiCard
            label="Odómetro actual"
            value={`${odo.actual_km.toLocaleString("es-PY")} km`}
            sub={`${odo.km_gps_acumulado} km registrados por GPS`}
            color="#1a5276"
            icon="📍"
          />
          <KpiCard
            label="Próximo mantenimiento"
            value={mant.km_hasta <= 0 ? "VENCIDO" : `${mant.km_hasta.toLocaleString("es-PY")} km`}
            sub={`A los ${mant.proximo_km.toLocaleString("es-PY")} km · ${mant.descripcion}`}
            color={mant.alerta === "ok" ? "#1e8449" : mant.alerta === "proximo" ? "#9a7d0a" : "#c0392b"}
            icon="🔧"
          />
          {comb && (
            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>⛽ Combustible estimado</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: comb.porcentaje_tanque > 25 ? "#1a5276" : "#c0392b" }}>
                ~{comb.km_autonomia_restante.toLocaleString("es-PY")} km
              </div>
              <BarraCombustible pct={comb.porcentaje_tanque} />
              <div style={{ fontSize: 11, color: "#999" }}>
                {comb.litros_restantes}L restantes de {comb.litros_cargados}L · {comb.consumo_l_100km}L/100km
              </div>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
                Recorridos {comb.km_desde_carga} km desde la última carga ({fmtFecha(comb.ultima_carga_fecha)})
              </div>
            </div>
          )}
        </div>
      )}

      {errorPos && <div className="error-msg">{errorPos}</div>}

      {/* ── Posición actual + mapa ── */}
      {camion && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #c0392b" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#111820" }}>Ubicación en tiempo real</div>
              <div style={{ color: "#546e7a", fontSize: 13, marginTop: 4 }}>
                Última señal Cusat: {camion.ultima_actualizacion}
              </div>
            </div>
            <Badge color={camion.color} label={camion.estado} />
          </div>

          {camion.lat && (
            <>
              <div style={{ marginTop: 16, borderRadius: 8, overflow: "hidden", border: "1px solid #dce3ec" }}>
                <iframe
                  title="Posición del camión"
                  width="100%" height="300" frameBorder="0" style={{ display: "block" }}
                  src={`https://maps.google.com/maps?q=${camion.lat},${camion.lng}&z=15&output=embed`}
                />
              </div>
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <a href={camion.google_maps} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  Abrir en Google Maps
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Otros vehículos (oculto — no son del usuario) ── */}

      {/* ── Historial de km ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Km recorridos</div>
            {resumen && (
              <div style={{ color: "#546e7a", fontSize: 12, marginTop: 2 }}>
                Total en el periodo: <strong>{resumen.km_total_periodo} km</strong>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[7, 15, 30].map(d => (
              <button key={d} onClick={() => { setDiasSel(d); cargarResumen(d); }} style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                border: diasSel === d ? "none" : "1px solid #dce3ec",
                background: diasSel === d ? "#c0392b" : "#fff",
                color: diasSel === d ? "#fff" : "#546e7a",
                fontWeight: diasSel === d ? 700 : 400,
              }}>{d} días</button>
            ))}
          </div>
        </div>

        {loadRes ? (
          <div className="loading">Cargando historial...</div>
        ) : resumen?.resumen?.length === 0 ? (
          <div style={{ color: "#90a4ae", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            Aún no hay recorridos registrados. El sistema empieza a registrar desde ahora cada 5 minutos.
          </div>
        ) : (
          <>
            {ultimos7.length > 0 && (
              <div style={{ height: 200, marginBottom: 20 }}>
                <Bar data={chartData} options={chartOpts} />
              </div>
            )}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Fecha</th><th>Km recorridos</th><th>Primera señal</th><th>Última señal</th><th>Puntos GPS</th></tr>
                </thead>
                <tbody>
                  {[...(resumen?.resumen || [])].reverse().map(d => (
                    <tr key={d.fecha}>
                      <td><strong>{fmtFecha(d.fecha)}</strong></td>
                      <td><span style={{ fontWeight: 700, color: d.km > 0 ? "#c0392b" : "#90a4ae" }}>{d.km} km</span></td>
                      <td>{d.primera_hora}</td>
                      <td>{d.ultima_hora}</td>
                      <td style={{ color: "#90a4ae" }}>{d.n_puntos} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
