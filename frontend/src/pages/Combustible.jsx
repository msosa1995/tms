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

function GaugeCombustible({ litros, capacidad = 100 }) {
  const pct = Math.min(100, Math.max(0, (litros / capacidad) * 100));
  const cx = 110, cy = 108, r = 80;

  const toRad = p => Math.PI - (p / 100) * Math.PI;
  const pt = (p, rad = r) => ({
    x: cx + rad * Math.cos(toRad(p)),
    y: cy - rad * Math.sin(toRad(p)),
  });
  const arc = (p1, p2) => {
    if (Math.abs(p2 - p1) < 0.1) return "";
    const s = pt(p1), e = pt(p2);
    const large = (p2 - p1) > 50 ? 1 : 0;
    return `M ${s.x.toFixed(2)},${s.y.toFixed(2)} A ${r},${r} 0 ${large},1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`;
  };

  const color = pct > 50 ? "#27ae60" : pct > 25 ? "#e67e22" : "#c0392b";
  const needle = pt(pct, r * 0.80);
  const ePos = pt(0, r + 20);
  const fPos = pt(100, r + 20);

  return (
    <svg viewBox="0 0 220 132" width="240" height="144" style={{ display: "block" }}>
      {/* Zonas de fondo */}
      <path d={arc(0, 25)}   fill="none" stroke="rgba(192,57,43,0.18)"  strokeWidth="15" />
      <path d={arc(25, 50)}  fill="none" stroke="rgba(230,126,34,0.18)" strokeWidth="15" />
      <path d={arc(50, 100)} fill="none" stroke="rgba(39,174,96,0.18)"  strokeWidth="15" />
      {/* Arco relleno */}
      {pct > 0 && (
        <path d={arc(0, pct)} fill="none" stroke={color} strokeWidth="15" strokeLinecap="round" />
      )}
      {/* Ticks */}
      {[0, 25, 50, 75, 100].map(p => {
        const i = pt(p, r - 9), o = pt(p, r + 5);
        return <line key={p} x1={i.x.toFixed(1)} y1={i.y.toFixed(1)} x2={o.x.toFixed(1)} y2={o.y.toFixed(1)} stroke="#999" strokeWidth="2" />;
      })}
      {/* Etiquetas E y F */}
      <text x={ePos.x.toFixed(1)} y={(ePos.y + 4).toFixed(1)} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#c0392b">E</text>
      <text x={fPos.x.toFixed(1)} y={(fPos.y + 4).toFixed(1)} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#27ae60">F</text>
      {/* Aguja */}
      <line x1={cx} y1={cy} x2={needle.x.toFixed(2)} y2={needle.y.toFixed(2)} stroke="#e74c3c" strokeWidth="3.5" strokeLinecap="round" />
      {/* Centro */}
      <circle cx={cx} cy={cy} r="9" fill="#2c3e50" />
      <circle cx={cx} cy={cy} r="5" fill="#e74c3c" />
      {/* Litros */}
      <text x={cx} y={cy - 26} textAnchor="middle" fontSize="30" fontWeight="800" fill={color}>{Math.round(litros)}</text>
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="11" fill="#888">litros restantes</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="11" fill="#aaa">{Math.round(pct)}% · tanque {capacidad}L</text>
    </svg>
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
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#1a5276" }}>
            ⛽ Estado actual — última carga: {fmtFecha(comb.ultima_carga_fecha)}
          </div>
          <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
            {/* Medidor */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <GaugeCombustible litros={comb.litros_restantes} capacidad={100} />
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                Actualización automática cada 5 min
              </div>
            </div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 14, flex: 1, minWidth: 260 }}>
              {[
                { label: "Cargados",           val: `${comb.litros_cargados} L`,             color: "#1a5276" },
                { label: "Km desde la carga",  val: `${comb.km_desde_carga} km`,             color: "#555" },
                { label: "Consumidos",         val: `${comb.litros_consumidos} L`,            color: "#e67e22" },
                { label: "Restantes estimados",val: `${comb.litros_restantes} L`,             color: comb.porcentaje_tanque > 25 ? "#1a5276" : "#c0392b" },
                { label: "Autonomía restante", val: `~${comb.km_autonomia_restante.toLocaleString("es-PY")} km`, color: comb.porcentaje_tanque > 25 ? "#1e8449" : "#c0392b" },
                { label: "Consumo",            val: `${comb.consumo_l_100km} L/100km`,       color: "#555" },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "#888" }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color }}>{val}</div>
                </div>
              ))}
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
