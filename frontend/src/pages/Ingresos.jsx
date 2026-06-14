import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

function fmt(n) { return n ? "₲ " + Number(n).toLocaleString("es-PY") : "₲ 0"; }

const FORMAS_PAGO = ["efectivo", "transferencia", "cheque", "credito"];
const FORMA_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia", cheque: "Cheque", credito: "Crédito" };
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const EMPTY = { cliente: "", fecha: new Date().toISOString().slice(0,10), monto: "", moneda: "PYG", forma_pago: "efectivo", numero_factura: "", observaciones: "" };

function semanaDelMes(fecha) {
  const d = new Date(fecha + "T00:00:00");
  const dia = d.getDate();
  return Math.ceil(dia / 7);
}

function rangoSemana(semana, anio, mes) {
  const inicio = (semana - 1) * 7 + 1;
  const fin = Math.min(semana * 7, new Date(anio, mes, 0).getDate());
  return `${inicio}–${fin} ${MESES[mes - 1].slice(0,3)}`;
}

function agruparPorMesYSemana(items) {
  const meses = {};
  items.forEach(item => {
    const [anio, mes] = item.fecha.split("-").map(Number);
    const clave = `${anio}-${String(mes).padStart(2,"0")}`;
    if (!meses[clave]) meses[clave] = { anio, mes, items: [] };
    meses[clave].items.push(item);
  });

  return Object.entries(meses)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([clave, data]) => {
      const semanas = {};
      data.items.forEach(item => {
        const s = semanaDelMes(item.fecha);
        if (!semanas[s]) semanas[s] = [];
        semanas[s].push(item);
      });
      const total = data.items.reduce((acc, i) => acc + Number(i.monto), 0);
      return { clave, anio: data.anio, mes: data.mes, semanas, total };
    });
}

export default function Ingresos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mesesAbiertos, setMesesAbiertos] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api.get("/ingresos/", { params: { page_size: 500, ordering: "-fecha" } })
      .then(r => setItems(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/clientes/", { params: { page_size: 200 } }).then(r => setClientes(r.data.results || r.data));
  }, []);

  function toggleMes(clave) {
    setMesesAbiertos(prev => ({ ...prev, [clave]: !prev[clave] }));
  }

  function openNew() { setForm(EMPTY); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      await api.post("/ingresos/", payload);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  const mesesAgrupados = agruparPorMesYSemana(items);
  const totalGeneral = items.reduce((acc, i) => acc + Number(i.monto), 0);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Ingresos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar Ingreso</button>
      </div>

      {!loading && items.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#666" }}>Total acumulado</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1e8449" }}>{fmt(totalGeneral)}</span>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="loading">Cargando...</div></div>
      ) : mesesAgrupados.length === 0 ? (
        <div className="card"><div className="empty-state">No hay ingresos registrados</div></div>
      ) : (
        mesesAgrupados.map(({ clave, anio, mes, semanas, total }) => {
          const abierto = !!mesesAbiertos[clave];
          return (
            <div key={clave} className="card" style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
              {/* Cabecera del mes */}
              <div
                onClick={() => toggleMes(clave)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 20px", cursor: "pointer",
                  background: abierto ? "#f0fdf4" : "#fff",
                  borderBottom: abierto ? "1px solid #e2e8f0" : "none",
                  userSelect: "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, color: abierto ? "#16a34a" : "#444" }}>
                    {abierto ? "▼" : "▶"}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>
                    {MESES[mes - 1]} {anio}
                  </span>
                  <span style={{ background: "#e2e8f0", borderRadius: 12, padding: "2px 10px", fontSize: 12, color: "#555" }}>
                    {Object.values(semanas).flat().length} ingreso{Object.values(semanas).flat().length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 18, color: "#1e8449" }}>{fmt(total)}</span>
              </div>

              {/* Detalle por semanas */}
              {abierto && (
                <div style={{ padding: "12px 20px" }}>
                  {Object.entries(semanas)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([semNum, entradas]) => {
                      const totalSemana = entradas.reduce((acc, i) => acc + Number(i.monto), 0);
                      return (
                        <div key={semNum} style={{ marginBottom: 16 }}>
                          <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #f1f5f9"
                          }}>
                            <span style={{ fontWeight: 600, color: "#374151", fontSize: 13 }}>
                              Semana {semNum} &nbsp;
                              <span style={{ color: "#888", fontWeight: 400 }}>({rangoSemana(Number(semNum), anio, mes)})</span>
                            </span>
                            <span style={{ fontWeight: 600, color: "#1e8449", fontSize: 13 }}>{fmt(totalSemana)}</span>
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr style={{ color: "#888" }}>
                                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500 }}>Fecha</th>
                                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500 }}>Cliente</th>
                                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500 }}>Forma de Pago</th>
                                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 500 }}>Factura</th>
                                <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 500 }}>Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entradas
                                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                                .map(item => (
                                  <tr key={item.id} style={{ borderTop: "1px solid #f8fafc" }}>
                                    <td style={{ padding: "6px 8px" }}>{item.fecha}</td>
                                    <td style={{ padding: "6px 8px" }}>{item.cliente_nombre || item.cliente?.razon_social || "—"}</td>
                                    <td style={{ padding: "6px 8px" }}>{FORMA_LABEL[item.forma_pago] || item.forma_pago}</td>
                                    <td style={{ padding: "6px 8px" }}>{item.numero_factura || "—"}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "#1e8449" }}>{fmt(item.monto)}</td>
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
      )}

      {modal && (
        <Modal title="Registrar Ingreso" onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-success" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Registrar"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Cliente *</label>
            <select value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}>
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Fecha *</label>
            <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            {form.fecha && (
              <small style={{ color: "#666", marginTop: 4, display: "block" }}>
                → Semana {semanaDelMes(form.fecha)} del mes
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Monto (₲) *</label>
            <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Forma de Pago</label>
            <select value={form.forma_pago} onChange={e => setForm(f => ({ ...f, forma_pago: e.target.value }))}>
              {FORMAS_PAGO.map(fp => <option key={fp} value={fp}>{FORMA_LABEL[fp]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>N° Factura</label>
            <input type="text" value={form.numero_factura} onChange={e => setForm(f => ({ ...f, numero_factura: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Observaciones</label>
            <input type="text" value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
