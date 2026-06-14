import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

const ESTADO_BADGE = { programado: "badge-blue", en_curso: "badge-yellow", finalizado: "badge-green", cancelado: "badge-red" };
const ESTADO_LABEL = { programado: "Programado", en_curso: "En Curso", finalizado: "Finalizado", cancelado: "Cancelado" };

const EMPTY = { vehiculo: "", chofer: "", cliente: "", fecha_salida: "", origen: "", destino: "", km_iniciales: "", carga_descripcion: "", carga_peso_kg: "", observaciones: "" };

export default function Viajes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehiculos, setVehiculos] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [finModal, setFinModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [finForm, setFinForm] = useState({ km_finales: "", fecha_regreso: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = { page_size: 100 };
    if (estadoFilter) params.estado = estadoFilter;
    api.get("/viajes/", { params }).then(r => setItems(r.data.results || r.data)).finally(() => setLoading(false));
  }, [estadoFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/vehiculos/", { params: { page_size: 200 } }).then(r => setVehiculos(r.data.results || r.data));
    api.get("/choferes/", { params: { page_size: 200 } }).then(r => setChoferes(r.data.results || r.data));
    api.get("/clientes/", { params: { page_size: 200 } }).then(r => setClientes(r.data.results || r.data));
  }, []);

  function openNew() { setForm(EMPTY); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.carga_peso_kg) delete payload.carga_peso_kg;
      await api.post("/viajes/", payload);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  async function iniciar(id) {
    if (!confirm("¿Iniciar viaje?")) return;
    await api.post(`/viajes/${id}/iniciar/`); load();
  }

  async function cancelar(id) {
    if (!confirm("¿Cancelar viaje?")) return;
    await api.post(`/viajes/${id}/cancelar/`); load();
  }

  async function finalizar() {
    setSaving(true); setError("");
    try {
      await api.post(`/viajes/${finModal}/finalizar/`, finForm);
      setFinModal(null); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Viajes</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo Viaje</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">Todos los estados</option>
            <option value="programado">Programado</option>
            <option value="en_curso">En Curso</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead><tr><th>N° Viaje</th><th>Fecha</th><th>Ruta</th><th>Cliente</th><th>Chofer</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state">No hay viajes</div></td></tr>
                ) : items.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.numero_viaje}</strong></td>
                    <td>{v.fecha_salida}</td>
                    <td>{v.origen} → {v.destino}</td>
                    <td>{v.cliente_razon || v.cliente?.razon_social}</td>
                    <td>{v.chofer_nombre || v.chofer?.nombre_completo}</td>
                    <td><span className={`badge ${ESTADO_BADGE[v.estado] || "badge-gray"}`}>{ESTADO_LABEL[v.estado] || v.estado}</span></td>
                    <td><div className="actions-col">
                      {v.estado === "programado" && <button className="btn btn-success btn-sm" onClick={() => iniciar(v.id)}>Iniciar</button>}
                      {v.estado === "en_curso" && <button className="btn btn-primary btn-sm" onClick={() => { setFinModal(v.id); setFinForm({ km_finales: "", fecha_regreso: "" }); setError(""); }}>Finalizar</button>}
                      {(v.estado === "programado" || v.estado === "en_curso") && <button className="btn btn-danger btn-sm" onClick={() => cancelar(v.id)}>Cancelar</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Nuevo Viaje" onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Crear Viaje"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          {[["vehiculo","Vehículo",vehiculos,"patente"],["chofer","Chofer",choferes,"nombre_completo"],["cliente","Cliente",clientes,"razon_social"]].map(([k, lbl, opts, display]) => (
            <div className="form-group" key={k}>
              <label>{lbl}</label>
              <select value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}>
                <option value="">Seleccionar {lbl}</option>
                {opts.map(o => <option key={o.id} value={o.id}>{o[display]}</option>)}
              </select>
            </div>
          ))}
          {[["fecha_salida","Fecha de Salida","date"],["origen","Origen","text"],["destino","Destino","text"],["km_iniciales","Km Iniciales","number"]].map(([k,lbl,type]) => (
            <div className="form-group" key={k}>
              <label>{lbl}</label>
              <input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label>Descripción de Carga</label>
            <input value={form.carga_descripcion || ""} onChange={e => setForm(f => ({ ...f, carga_descripcion: e.target.value }))} />
          </div>
        </Modal>
      )}

      {finModal && (
        <Modal title="Finalizar Viaje" onClose={() => setFinModal(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setFinModal(null)}>Cancelar</button>
            <button className="btn btn-success" onClick={finalizar} disabled={saving}>{saving ? "Guardando..." : "Finalizar"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Km Finales</label>
            <input type="number" value={finForm.km_finales} onChange={e => setFinForm(f => ({ ...f, km_finales: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Fecha de Regreso</label>
            <input type="date" value={finForm.fecha_regreso} onChange={e => setFinForm(f => ({ ...f, fecha_regreso: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
