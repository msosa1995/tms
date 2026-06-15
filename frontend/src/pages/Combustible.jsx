import React, { useEffect, useState, useCallback } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";
import api from "../api/client";
import Modal from "../components/Modal";

function fmt(n) { return n ? "₲ " + Number(n).toLocaleString("es-PY") : "₲ 0"; }
function fmtKm(n) { return Number(n).toLocaleString("es-PY", { maximumFractionDigits: 0 }) + " km"; }

// Consumo: sin carga = 10L/40km, con carga = 15L/40km
const KM_POR_LITRO_SIN_CARGA = 40 / 10;   // 4 km/L
const KM_POR_LITRO_CON_CARGA = 40 / 15;   // 2.67 km/L

const EMPTY = { fecha: new Date().toISOString().slice(0, 10), litros: "", monto: "", observaciones: "" };

export default function Combustible() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = { page_size: 500, ordering: "-fecha" };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    api.get("/combustible/", { params })
      .then(r => setItems(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, [fechaDesde, fechaHasta]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(EMPTY); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      await api.post("/combustible/", form);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  async function eliminar(id) {
    if (!window.confirm("¿Eliminar esta carga?")) return;
    await api.delete(`/combustible/${id}/`);
    load();
  }

  const totalLitros = items.reduce((s, i) => s + Number(i.litros || 0), 0);
  const totalMonto = items.reduce((s, i) => s + Number(i.monto || 0), 0);
  const precioProm = totalLitros > 0 ? Math.round(totalMonto / totalLitros) : 0;
  const autonomiaSinCarga = totalLitros * KM_POR_LITRO_SIN_CARGA;
  const autonomiaConCarga = totalLitros * KM_POR_LITRO_CON_CARGA;

  // Autonomía para el formulario (preview en tiempo real)
  const litrosForm = Number(form.litros) || 0;
  const previewSin = litrosForm * KM_POR_LITRO_SIN_CARGA;
  const previewCon = litrosForm * KM_POR_LITRO_CON_CARGA;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Combustible</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar Carga</button>
      </div>

      {/* Resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>Total litros cargados</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#2980b9" }}>{totalLitros.toLocaleString("es-PY")} L</div>
        </div>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>Total gastado</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#922b21" }}>{fmt(totalMonto)}</div>
        </div>
        <div className="card" style={{ padding: "14px 18px" }}>
          <div style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>Precio promedio / litro</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#7d6608" }}>{fmt(precioProm)}</div>
        </div>
        <div className="card" style={{ padding: "14px 18px", background: "#eaf4fb" }}>
          <div style={{ color: "#666", fontSize: 12, marginBottom: 6 }}>Autonomía total (sin carga)</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#1a5276" }}>{fmtKm(autonomiaSinCarga)}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>10 L / 40 km</div>
        </div>
        <div className="card" style={{ padding: "14px 18px", background: "#eafaf1" }}>
          <div style={{ color: "#666", fontSize: 12, marginBottom: 6 }}>Autonomía total (con carga)</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#1e8449" }}>{fmtKm(autonomiaConCarga)}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>15 L / 40 km</div>
        </div>
      </div>

      {/* Gráficos */}
      {items.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: "#333" }}>Evolución precio por litro (₲)</div>
            <div style={{ position: "relative", height: 250 }}>
            <Line data={{
              labels: [...items].reverse().map(i => i.fecha),
              datasets: [{
                label: "₲ / litro",
                data: [...items].reverse().map(i => i.precio_por_litro || 0),
                borderColor: "#e67e22",
                backgroundColor: "rgba(230,126,34,0.12)",
                fill: true, tension: 0.4, pointRadius: 4,
              }]
            }} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => "₲ " + Number(c.raw).toLocaleString("es-PY") } } },
              scales: { y: { ticks: { callback: v => "₲ " + Number(v).toLocaleString("es-PY") } } }
            }} />
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: "#333" }}>Litros cargados por fecha</div>
            <div style={{ position: "relative", height: 250 }}>
            <Bar data={{
              labels: [...items].reverse().map(i => i.fecha),
              datasets: [{
                label: "Litros",
                data: [...items].reverse().map(i => Number(i.litros)),
                backgroundColor: "rgba(41,128,185,0.7)",
                borderRadius: 4,
              }]
            }} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { ticks: { callback: v => v + " L" } } }
            }} />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 12, padding: "12px 20px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#666", fontSize: 13 }}>Desde:</span>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: 140 }} />
          <span style={{ color: "#666", fontSize: 13 }}>Hasta:</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: 140 }} />
          {(fechaDesde || fechaHasta) && (
            <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => { setFechaDesde(""); setFechaHasta(""); }}>
              Limpiar
            </button>
          )}
          <span style={{ marginLeft: "auto", color: "#555", fontSize: 13 }}>
            {items.length} carga{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Litros</th>
                  <th>Monto</th>
                  <th>Precio / L</th>
                  <th>Autonomía sin carga</th>
                  <th>Autonomía con carga</th>
                  <th>Observaciones</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state">No hay cargas registradas</div></td></tr>
                ) : items.map(item => {
                  const litros = Number(item.litros);
                  const sinCarga = litros * KM_POR_LITRO_SIN_CARGA;
                  const conCarga = litros * KM_POR_LITRO_CON_CARGA;
                  return (
                    <tr key={item.id}>
                      <td>{item.fecha}</td>
                      <td style={{ fontWeight: 600 }}>{litros.toLocaleString("es-PY")} L</td>
                      <td style={{ color: "#922b21", fontWeight: 600 }}>{fmt(item.monto)}</td>
                      <td>{item.precio_por_litro ? fmt(item.precio_por_litro) : "—"}</td>
                      <td style={{ color: "#1a5276", fontWeight: 600 }}>{fmtKm(sinCarga)}</td>
                      <td style={{ color: "#1e8449", fontWeight: 600 }}>{fmtKm(conCarga)}</td>
                      <td style={{ color: "#666", fontSize: 13 }}>{item.observaciones || "—"}</td>
                      <td>
                        <button onClick={() => eliminar(item.id)}
                          style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 16 }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <Modal title="Registrar Carga de Combustible" onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Fecha *</label>
            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Litros cargados *</label>
            <input type="number" value={form.litros} placeholder="0"
              onChange={e => setForm(f => ({ ...f, litros: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Monto total (₲) *</label>
            <input type="number" value={form.monto} placeholder="0"
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
          </div>
          {litrosForm > 0 && (
            <div style={{ background: "#f0f4f8", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: "#444" }}>Autonomía estimada:</div>
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#888" }}>Sin carga (10L/40km)</div>
                  <div style={{ fontWeight: 700, color: "#1a5276", fontSize: 16 }}>{fmtKm(previewSin)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888" }}>Con carga (15L/40km)</div>
                  <div style={{ fontWeight: 700, color: "#1e8449", fontSize: 16 }}>{fmtKm(previewCon)}</div>
                </div>
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Observaciones</label>
            <input type="text" value={form.observaciones} placeholder="ej: YPF Ruta 2"
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
