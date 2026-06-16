import React, { useEffect, useState, useCallback } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";
import api from "../api/client";
import Modal from "../components/Modal";

function fmt(n) { return n ? "₲ " + Number(n).toLocaleString("es-PY") : "₲ 0"; }

const MESES = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function fmtFecha(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d} ${MESES[parseInt(m)]} ${y}`;
}

function BarraCombustible({ pct }) {
  const color = pct > 50 ? "#1e8449" : pct > 25 ? "#e67e22" : "#c0392b";
  return (
    <div style={{ background: "#eee", borderRadius: 20, height: 14, overflow: "hidden", margin: "10px 0 6px" }}>
      <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 20, transition: "width 0.5s" }} />
    </div>
  );
}

function AlertaCombustible({ km }) {
  if (km === undefined || km === null) return null;
  if (km >= 100) return null;
  const cfg = km < 60
    ? { bg: "#fadbd8", borde: "#c0392b", text: "#922b21", icono: "🔴", msg: `¡Combustible crítico! Solo quedan ~${km} km de autonomía — cargá cuanto antes` }
    : { bg: "#fef9e7", borde: "#f1c40f", text: "#7d6608", icono: "🟡", msg: `Combustible bajo — quedan ~${km} km de autonomía` };
  return (
    <div style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.borde}`, color: cfg.text, borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontWeight: 600, fontSize: 14 }}>
      {cfg.icono} {cfg.msg}
    </div>
  );
}

const EMPTY = { fecha: new Date().toISOString().slice(0, 10), litros: "", monto: "", observaciones: "" };

export default function Combustible() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [gpsEstado, setGpsEstado]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page_size: 500, ordering: "-fecha" };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    api.get("/combustible/", { params })
      .then(r => setItems(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    load();
    const fetchEstado = () => api.get("/gps/estado/").then(r => setGpsEstado(r.data)).catch(() => {});
    fetchEstado();
    const interval = setInterval(fetchEstado, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  function openNew() { setForm(EMPTY); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      await api.post("/combustible/", form);
      closeModal(); load();
      api.get("/gps/estado/").then(r => setGpsEstado(r.data)).catch(() => {});
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
  const totalMonto  = items.reduce((s, i) => s + Number(i.monto || 0), 0);
  const precioProm  = totalLitros > 0 ? Math.round(totalMonto / totalLitros) : 0;

  const comb = gpsEstado?.combustible;

  const litrosForm  = Number(form.litros) || 0;
  const montoForm   = Number(form.monto) || 0;
  const precioPreview = litrosForm > 0 && montoForm > 0 ? Math.round(montoForm / litrosForm) : 0;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Combustible</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar Carga</button>
      </div>

      {/* ── Alerta autonomía ─────────────────────────────────────── */}
      {comb && <AlertaCombustible km={comb.km_autonomia_restante} />}

      {/* ── Estado actual desde GPS ───────────────────────────────── */}
      {comb && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #2980b9", padding: "18px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a5276" }}>
            ⛽ Estado actual — última carga: {fmtFecha(comb.ultima_carga_fecha)}
          </div>
          <BarraCombustible pct={comb.porcentaje_tanque} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Cargados</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{comb.litros_cargados} L</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Km desde la carga</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{comb.km_desde_carga} km</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Consumidos</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{comb.litros_consumidos} L</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Restantes estimados</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: comb.porcentaje_tanque > 25 ? "#1a5276" : "#c0392b" }}>
                {comb.litros_restantes} L ({comb.porcentaje_tanque}%)
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Autonomía restante</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: comb.porcentaje_tanque > 25 ? "#1e8449" : "#c0392b" }}>
                ~{comb.km_autonomia_restante.toLocaleString("es-PY")} km
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888" }}>Consumo configurado</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{comb.consumo_l_100km} L/100km</div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPIs generales ───────────────────────────────────────── */}
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
      </div>

      {/* ── Gráficos ─────────────────────────────────────────────── */}
      {items.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: "#333" }}>Evolución precio por litro (₲)</div>
            <div style={{ position: "relative", height: 220 }}>
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
            <div style={{ position: "relative", height: 220 }}>
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

      {/* ── Filtros ───────────────────────────────────────────────── */}
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

      {/* ── Tabla de cargas ───────────────────────────────────────── */}
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
                  <th>Observaciones</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">No hay cargas registradas</div></td></tr>
                ) : items.map(item => (
                  <tr key={item.id}>
                    <td>{fmtFecha(item.fecha)}</td>
                    <td style={{ fontWeight: 600 }}>{Number(item.litros).toLocaleString("es-PY")} L</td>
                    <td style={{ color: "#922b21", fontWeight: 600 }}>{fmt(item.monto)}</td>
                    <td>{item.precio_por_litro ? fmt(item.precio_por_litro) : "—"}</td>
                    <td style={{ color: "#666", fontSize: 13 }}>{item.observaciones || "—"}</td>
                    <td>
                      <button onClick={() => eliminar(item.id)}
                        style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 16 }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal nueva carga ─────────────────────────────────────── */}
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
          {litrosForm > 0 && montoForm > 0 && (
            <div style={{ background: "#f0f4f8", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#555" }}>
              Precio por litro: <strong>{fmt(precioPreview)}</strong>
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
