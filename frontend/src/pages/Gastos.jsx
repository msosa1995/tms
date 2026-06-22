import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

function fmt(n) { return n ? "₲ " + Number(n).toLocaleString("es-PY") : "₲ 0"; }

const CATEGORIAS = ["combustible","peajes","viaticos","reparaciones","neumaticos","mantenimiento","seguros","impuestos","sueldo","otros"];
const CAT_LABEL = { combustible:"Combustible", peajes:"Peajes", viaticos:"Viáticos", reparaciones:"Reparaciones", neumaticos:"Neumáticos", mantenimiento:"Mantenimiento", seguros:"Seguros", impuestos:"Impuestos", sueldo:"Sueldo", otros:"Otros" };
const CAT_COLOR = { combustible:"#e67e22", peajes:"#8e44ad", viaticos:"#27ae60", reparaciones:"#c0392b", neumaticos:"#2980b9", mantenimiento:"#16a085", seguros:"#f39c12", impuestos:"#7f8c8d", sueldo:"#0984e3", otros:"#34495e" };

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const EMPTY = { vehiculo: "", fecha: new Date().toISOString().slice(0,10), categoria: "combustible", monto: "", descripcion: "" };

function semanaDelMes(fecha) { return Math.ceil(new Date(fecha+"T00:00:00").getDate() / 7); }
function rangoSemana(s, y, m) {
  const ini = (s-1)*7+1, fin = Math.min(s*7, new Date(y,m,0).getDate());
  return `${ini}–${fin} ${MESES[m-1].slice(0,3)}`;
}
function agruparGastos(items) {
  const mapa = {};
  items.forEach(item => {
    const [y, m] = item.fecha.split("-").map(Number);
    const k = `${y}-${String(m).padStart(2,"0")}`;
    if (!mapa[k]) mapa[k] = { y, m, items: [] };
    mapa[k].items.push(item);
  });
  return Object.entries(mapa).sort((a,b) => b[0].localeCompare(a[0])).map(([k, d]) => {
    const semanas = {};
    d.items.forEach(i => { const s = semanaDelMes(i.fecha); if (!semanas[s]) semanas[s]=[]; semanas[s].push(i); });
    return { k, y: d.y, m: d.m, semanas, total: d.items.reduce((a,i)=>a+Number(i.monto),0) };
  });
}

export default function Gastos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehiculos, setVehiculos] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mesesAbiertos, setMesesAbiertos] = useState({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  const load = useCallback(() => {
    setLoading(true);
    const params = { page_size: 500, ordering: "-fecha" };
    if (catFilter) params.categoria = catFilter;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    api.get("/gastos/", { params }).then(r => setItems(r.data.results || r.data)).finally(() => setLoading(false));
  }, [catFilter, fechaDesde, fechaHasta]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/vehiculos/", { params: { page_size: 200 } }).then(r => setVehiculos(r.data.results || r.data));
  }, []);

  function openNew() { setForm(EMPTY); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.vehiculo) delete payload.vehiculo;
      await api.post("/gastos/", payload);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const r = await api.post("/gastos/importar-excel/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult({ ok: true, ...r.data });
      load();
    } catch (err) {
      setImportResult({ ok: false, mensaje: err.response?.data?.error || "Error al importar" });
    } finally {
      setImportando(false);
      fileRef.current.value = "";
    }
  }

  const total = items.reduce((s, g) => s + Number(g.monto || 0), 0);
  const mesesAgrupados = agruparGastos(items);
  function toggleMes(k) { setMesesAbiertos(p => ({ ...p, [k]: !p[k] })); }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Gastos</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <button
            className="btn btn-outline"
            onClick={() => fileRef.current.click()}
            disabled={importando}
          >
            {importando ? "Importando..." : "Importar Excel"}
          </button>
          <button className="btn btn-primary" onClick={openNew}>+ Registrar Gasto</button>
        </div>
      </div>

      {importResult && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 16,
          background: importResult.ok ? "rgba(0,212,170,0.08)" : "rgba(255,91,91,0.08)",
          border: `1px solid ${importResult.ok ? "rgba(0,212,170,0.25)" : "rgba(255,91,91,0.25)"}`,
          color: importResult.ok ? "#00D4AA" : "#FF5B5B",
        }}>
          {importResult.mensaje}
          {importResult.errores?.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary>Ver filas con error ({importResult.errores.length})</summary>
              <ul style={{ margin: "8px 0 0 16px", fontSize: 12 }}>
                {importResult.errores.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          <button onClick={() => setImportResult(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 12, padding: "12px 20px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
          <span style={{ color: "#666", fontSize: 13 }}>Desde:</span>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: 140 }} />
          <span style={{ color: "#666", fontSize: 13 }}>Hasta:</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: 140 }} />
          {(fechaDesde || fechaHasta || catFilter) && (
            <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => { setFechaDesde(""); setFechaHasta(""); setCatFilter(""); }}>Limpiar</button>
          )}
          <span style={{ marginLeft: "auto", fontWeight: 700, color: "#FF5B5B", fontSize: 15 }}>
            Total: ₲ {total.toLocaleString("es-PY")}
          </span>
        </div>
      </div>

      {/* Vista agrupada por mes/semana */}
      {loading ? <div className="card"><div className="loading">Cargando...</div></div>
        : mesesAgrupados.length === 0
        ? <div className="card"><div className="empty-state">No hay gastos registrados</div></div>
        : mesesAgrupados.map(({ k, y, m, semanas, total: totMes }) => {
          const abierto = !!mesesAbiertos[k];
          return (
            <div key={k} className="card" style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
              <div onClick={() => toggleMes(k)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 20px", cursor: "pointer",
                background: abierto ? "rgba(255,91,91,0.06)" : "var(--surface-2)",
                borderBottom: abierto ? "1px solid rgba(255,255,255,0.06)" : "none", userSelect: "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, color: abierto ? "#FF5B5B" : "#475569" }}>{abierto ? "▼" : "▶"}</span>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "#E2E8F0" }}>{MESES[m-1]} {y}</span>
                  <span style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "2px 10px", fontSize: 12, color: "#64748B" }}>
                    {Object.values(semanas).flat().length} gastos
                  </span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#FF5B5B" }}>₲ {totMes.toLocaleString("es-PY")}</span>
              </div>
              {abierto && (
                <div style={{ padding: "12px 20px" }}>
                  {Object.entries(semanas).sort((a,b)=>Number(a[0])-Number(b[0])).map(([sn, entradas]) => {
                    const totSem = entradas.reduce((a,i)=>a+Number(i.monto),0);
                    // Resumen por categoría de la semana
                    const porCat = {};
                    entradas.forEach(e => { porCat[e.categoria] = (porCat[e.categoria]||0)+Number(e.monto); });
                    return (
                      <div key={sn} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <div>
                            <span style={{ fontWeight: 600, color: "#94A3B8", fontSize: 13 }}>Semana {sn}</span>
                            <span style={{ color: "#475569", fontWeight: 400, fontSize: 12, marginLeft: 6 }}>({rangoSemana(Number(sn),y,m)})</span>
                            <span style={{ marginLeft: 10 }}>
                              {Object.entries(porCat).map(([cat,val]) => (
                                <span key={cat} style={{ display:"inline-block", background: CAT_COLOR[cat]||"#95a5a6", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:10, marginRight:4 }}>
                                  {CAT_LABEL[cat]||cat}
                                </span>
                              ))}
                            </span>
                          </div>
                          <span style={{ fontWeight: 600, color: "#FF5B5B", fontSize: 13 }}>₲ {totSem.toLocaleString("es-PY")}</span>
                        </div>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                          <thead><tr style={{ color:"#475569" }}>
                            <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:500, color:"#475569", background:"none", textTransform:"none", fontSize:12 }}>Fecha</th>
                            <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:500, color:"#475569", background:"none", textTransform:"none", fontSize:12 }}>Categoría</th>
                            <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:500, color:"#475569", background:"none", textTransform:"none", fontSize:12 }}>Descripción</th>
                            <th style={{ textAlign:"right", padding:"4px 8px", fontWeight:500, color:"#475569", background:"none", textTransform:"none", fontSize:12 }}>Monto</th>
                          </tr></thead>
                          <tbody>
                            {entradas.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(g => (
                              <tr key={g.id} style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding:"6px 8px", color:"#64748B" }}>{g.fecha}</td>
                                <td style={{ padding:"6px 8px" }}>
                                  <span style={{ background:CAT_COLOR[g.categoria]||"#95a5a6", color:"#fff", borderRadius:10, padding:"2px 8px", fontSize:11 }}>
                                    {CAT_LABEL[g.categoria]||g.categoria}
                                  </span>
                                </td>
                                <td style={{ padding:"6px 8px", color:"#64748B" }}>{g.descripcion?.slice(0,50)}</td>
                                <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:600, color:"#FF5B5B" }}>₲ {Number(g.monto).toLocaleString("es-PY")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      }

      {modal && (
        <Modal title="Registrar Gasto" onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-danger" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Registrar"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Categoría</label>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Vehículo (opcional)</label>
            <select value={form.vehiculo} onChange={e => setForm(f => ({ ...f, vehiculo: e.target.value }))}>
              <option value="">Sin vehículo</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}</option>)}
            </select>
          </div>
          {[["fecha","Fecha","date"],["monto","Monto (₲)","number"]].map(([k,lbl,type]) => (
            <div className="form-group" key={k}>
              <label>{lbl}</label>
              <input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label>Descripción *</label>
            <textarea value={form.descripcion || ""} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} />
          </div>
        </Modal>
      )}
    </div>
  );
}
