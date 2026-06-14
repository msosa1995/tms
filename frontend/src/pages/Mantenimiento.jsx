import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

function fmt(n) { return n ? "₲ " + Number(n).toLocaleString("es-PY") : "₲ 0"; }

const TIPOS = ["preventivo","correctivo","predictivo"];
const TIPO_LABEL = { preventivo:"Preventivo", correctivo:"Correctivo", predictivo:"Predictivo" };
const TIPO_BADGE = { preventivo:"badge-blue", correctivo:"badge-red", predictivo:"badge-green" };

const EMPTY = { vehiculo: "", tipo: "preventivo", descripcion: "", fecha: new Date().toISOString().slice(0,10), kilometraje: "", proveedor: "", costo: "", numero_orden: "", proximo_mantenimiento_fecha: "", proximo_mantenimiento_km: "", observaciones: "" };

export default function Mantenimiento() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehiculos, setVehiculos] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/mantenimiento/", { params: { page_size: 100, ordering: "-fecha" } })
      .then(r => setItems(r.data.results || r.data)).finally(() => setLoading(false));
  }, []);

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
      if (!payload.proximo_mantenimiento_fecha) delete payload.proximo_mantenimiento_fecha;
      if (!payload.proximo_mantenimiento_km) delete payload.proximo_mantenimiento_km;
      await api.post("/mantenimiento/", payload);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Mantenimiento</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar Mantenimiento</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead><tr><th>Fecha</th><th>Vehículo</th><th>Tipo</th><th>Descripción</th><th>Km</th><th>Proveedor</th><th>Costo</th><th>Próximo</th></tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state">No hay registros de mantenimiento</div></td></tr>
                ) : items.map(m => (
                  <tr key={m.id}>
                    <td>{m.fecha}</td>
                    <td>{m.vehiculo_info?.patente || m.vehiculo}</td>
                    <td><span className={`badge ${TIPO_BADGE[m.tipo]}`}>{TIPO_LABEL[m.tipo] || m.tipo}</span></td>
                    <td>{m.descripcion?.slice(0, 50)}</td>
                    <td>{Number(m.kilometraje).toLocaleString()} km</td>
                    <td>{m.proveedor}</td>
                    <td style={{ fontWeight: 600, color: "#922b21" }}>{fmt(m.costo)}</td>
                    <td style={{ fontSize: 12 }}>
                      {m.proximo_mantenimiento_fecha || "—"}
                      {m.dias_para_proximo != null && m.dias_para_proximo <= 7 && (
                        <span className="badge badge-red" style={{ marginLeft: 4 }}>{m.dias_para_proximo}d</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Registrar Mantenimiento" onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Registrar"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>Vehículo *</label>
            <select value={form.vehiculo} onChange={e => setForm(f => ({ ...f, vehiculo: e.target.value }))}>
              <option value="">Seleccionar vehículo</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select>
          </div>
          {[["descripcion","Descripción","text"],["fecha","Fecha","date"],["kilometraje","Kilometraje","number"],["proveedor","Proveedor","text"],["costo","Costo (₲)","number"],["numero_orden","N° Orden","text"]].map(([k,lbl,type]) => (
            <div className="form-group" key={k}>
              <label>{lbl}</label>
              <input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div style={{ borderTop: "1px solid #dce3ec", marginTop: 8, paddingTop: 12 }}>
            <p style={{ color: "#7f8c9a", fontSize: 12, marginBottom: 12 }}>Próximo mantenimiento (opcional)</p>
            {[["proximo_mantenimiento_fecha","Fecha","date"],["proximo_mantenimiento_km","Km límite","number"]].map(([k,lbl,type]) => (
              <div className="form-group" key={k}>
                <label>{lbl}</label>
                <input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
