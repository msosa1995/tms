import React, { useEffect, useState } from "react";
import api from "../api/client";

const COLORES = {
  green:  { bg: "#d5f5e3", text: "#1e8449", label: "En movimiento" },
  yellow: { bg: "#fef9e7", text: "#9a7d0a", label: "Reportando"    },
  red:    { bg: "#fadbd8", text: "#922b21", label: "Sin señal"      },
  gray:   { bg: "#eaecee", text: "#555",    label: "Desconocido"   },
};

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

export default function Gps() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  function cargar() {
    setLoading(true);
    setError(null);
    api.get("/gps/posicion/")
      .then(r => {
        setData(r.data.dispositivos);
        setLastRefresh(new Date().toLocaleTimeString("es-PY"));
      })
      .catch(() => setError("No se pudo obtener la posición GPS"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 60000); // auto-actualiza cada 1 min
    return () => clearInterval(interval);
  }, []);

  const camion = data?.find(d => d.nombre === "HBK137");

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Ubicación GPS</h2>
        <button className="btn btn-outline btn-sm" onClick={cargar} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {lastRefresh && (
        <div style={{ color: "#90a4ae", fontSize: 12, marginBottom: 16 }}>
          Última actualización: {lastRefresh} · Auto-actualiza cada 1 minuto
        </div>
      )}

      {error && (
        <div className="error-msg">{error}</div>
      )}

      {loading && !data && (
        <div className="loading">Obteniendo posición GPS...</div>
      )}

      {/* Camión principal destacado */}
      {camion && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #c0392b" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#111820" }}>
                🚛 {camion.nombre} — Scania R450
              </div>
              <div style={{ color: "#546e7a", fontSize: 13, marginTop: 4 }}>
                Última señal: {camion.ultima_actualizacion}
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

              {/* Mapa embebido de Google Maps */}
              <div style={{ marginTop: 16, borderRadius: 8, overflow: "hidden", border: "1px solid #dce3ec" }}>
                <iframe
                  title="Posición del camión"
                  width="100%"
                  height="340"
                  frameBorder="0"
                  style={{ display: "block" }}
                  src={`https://maps.google.com/maps?q=${camion.lat},${camion.lng}&z=15&output=embed`}
                />
              </div>

              <div style={{ marginTop: 12, textAlign: "center" }}>
                <a
                  href={camion.google_maps}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Abrir en Google Maps
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Otros vehículos de la cuenta */}
      {data && data.filter(d => d.nombre !== "HBK137").length > 0 && (
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
              {data.filter(d => d.nombre !== "HBK137").map(d => (
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
