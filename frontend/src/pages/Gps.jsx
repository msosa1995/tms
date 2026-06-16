import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import api from "../api/client";

const COLORES = {
  green:  { bg: "#d5f5e3", text: "#1e8449", label: "En movimiento" },
  yellow: { bg: "#fef9e7", text: "#9a7d0a", label: "Reportando"    },
  red:    { bg: "#fadbd8", text: "#922b21", label: "Sin señal"      },
  gray:   { bg: "#eaecee", text: "#555",    label: "Desconocido"    },
};

const MESES = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function Badge({ color, label }) {
  const c = COLORES[color] || COLORES.gray;
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "4px 12px", borderRadius: 20,
      fontWeight: 700, fontSize: 12,
    }}>
      {label || c.label}
    </span>
  );
}

function fmtFecha(str) {
  const [y, m, d] = str.split("-");
  return `${d} ${MESES[parseInt(m)]} ${y}`;
}

export default function Gps() {
  const [posicion, setPosicion]     = useState(null);
  const [resumen, setResumen]       = useState(null);
  const [loadPos, setLoadPos]       = useState(true);
  const [loadRes, setLoadRes]       = useState(true);
  const [errorPos, setErrorPos]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [diasSel, setDiasSel]       = useState(30);

  function cargarPosicion() {
    setLoadPos(true);
    setErrorPos(null);
    api.get("/gps/posicion/")
      .then(r => {
        setPosicion(r.data.dispositivos);
        setLastRefresh(new Date().toLocaleTimeString("es-PY"));
      })
      .catch(() => setErrorPos("No se pudo obtener la posición GPS"))
      .finally(() => setLoadPos(false));
  }

  function cargarResumen(dias) {
    setLoadRes(true);
    api.get("/gps/resumen/", { params: { dias, dispositivo: "HBK137" } })
      .then(r => setResumen(r.data))
      .finally(() => setLoadRes(false));
  }

  useEffect(() => {
    cargarPosicion();
    cargarResumen(diasSel);
    const interval = setInterval(cargarPosicion, 60000);
    return () => clearInterval(interval);
  }, []);

  function cambiarDias(d) {
    setDiasSel(d);
    cargarResumen(d);
  }

  const camion = posicion?.find(d => d.nombre === "HBK137");
  const ultimos7 = resumen?.resumen?.slice(-7) || [];

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
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.raw} km` } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: v => `${v} km` } },
    },
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">GPS — HBK137</h2>
        <button className="btn btn-outline btn-sm" onClick={cargarPosicion} disabled={loadPos}>
          {loadPos ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {lastRefresh && (
        <div style={{ color: "#90a4ae", fontSize: 12, marginBottom: 16 }}>
          Posición actualizada: {lastRefresh} · Auto-refresca cada 1 minuto
        </div>
      )}

      {errorPos && <div className="error-msg">{errorPos}</div>}

      {/* ── Posición actual ── */}
      {camion && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #c0392b" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#111820" }}>
                Scania R450 · {camion.nombre}
              </div>
              <div style={{ color: "#546e7a", fontSize: 13, marginTop: 4 }}>
                Última señal Cusat: {camion.ultima_actualizacion}
              </div>
            </div>
            <Badge color={camion.color} label={camion.estado} />
          </div>

          {camion.lat && (
            <>
              <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#90a4ae", marginBottom: 2 }}>LATITUD</div>
                  <div style={{ fontWeight: 600 }}>{camion.lat}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#90a4ae", marginBottom: 2 }}>LONGITUD</div>
                  <div style={{ fontWeight: 600 }}>{camion.lng}</div>
                </div>
              </div>

              <div style={{ marginTop: 16, borderRadius: 8, overflow: "hidden", border: "1px solid #dce3ec" }}>
                <iframe
                  title="Posición del camión"
                  width="100%"
                  height="320"
                  frameBorder="0"
                  style={{ display: "block" }}
                  src={`https://maps.google.com/maps?q=${camion.lat},${camion.lng}&z=15&output=embed`}
                />
              </div>

              <div style={{ marginTop: 12, textAlign: "center" }}>
                <a href={camion.google_maps} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  Abrir en Google Maps
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Historial de km ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111820" }}>Km recorridos</div>
            {resumen && (
              <div style={{ color: "#546e7a", fontSize: 12, marginTop: 2 }}>
                Total en el periodo: <strong>{resumen.km_total_periodo} km</strong>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[7, 15, 30].map(d => (
              <button
                key={d}
                onClick={() => cambiarDias(d)}
                style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: diasSel === d ? "none" : "1px solid #dce3ec",
                  background: diasSel === d ? "#c0392b" : "#fff",
                  color: diasSel === d ? "#fff" : "#546e7a",
                  fontWeight: diasSel === d ? 700 : 400,
                }}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>

        {loadRes ? (
          <div className="loading">Cargando historial...</div>
        ) : resumen?.resumen?.length === 0 ? (
          <div style={{ color: "#90a4ae", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            Aún no hay datos de recorrido registrados.
            <br />
            El sistema empieza a registrar posiciones cada 5 minutos desde ahora.
          </div>
        ) : (
          <>
            {/* Gráfico de barras — últimos 7 días del período */}
            {ultimos7.length > 0 && (
              <div style={{ height: 200, marginBottom: 20 }}>
                <Bar data={chartData} options={chartOpts} />
              </div>
            )}

            {/* Tabla completa */}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Km recorridos</th>
                    <th>Primera señal</th>
                    <th>Última señal</th>
                    <th>Puntos GPS</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(resumen?.resumen || [])].reverse().map(d => (
                    <tr key={d.fecha}>
                      <td><strong>{fmtFecha(d.fecha)}</strong></td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: d.km > 0 ? "#c0392b" : "#90a4ae",
                        }}>
                          {d.km} km
                        </span>
                      </td>
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

      {/* ── Otros vehículos ── */}
      {posicion && posicion.filter(d => d.nombre !== "HBK137").length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12, color: "#333" }}>Otros vehículos en la cuenta</div>
          <table className="table">
            <thead>
              <tr>
                <th>Vehículo</th>
                <th>Estado</th>
                <th>Última señal</th>
                <th>Coordenadas</th>
              </tr>
            </thead>
            <tbody>
              {posicion.filter(d => d.nombre !== "HBK137").map(d => (
                <tr key={d.nombre}>
                  <td><strong>{d.nombre}</strong></td>
                  <td><Badge color={d.color} label={d.estado} /></td>
                  <td>{d.ultima_actualizacion}</td>
                  <td>
                    {d.lat && (
                      <a href={d.google_maps} target="_blank" rel="noreferrer" style={{ color: "#2e86c1" }}>
                        {d.lat}, {d.lng}
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
