import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

const ESTADO_BADGE = { activo: "badge-green", mantenimiento: "badge-yellow", inactivo: "badge-gray" };
const ESTADO_LABEL = { activo: "Activo", mantenimiento: "Mantenimiento", inactivo: "Inactivo" };

const EMPTY = { patente: "", marca: "", modelo: "", anio: new Date().getFullYear(), capacidad_kg: "", numero_chasis: "", estado: "activo", observaciones: "" };

export default function Vehiculos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/vehiculos/", { params: { search, page_size: 100 } })
      .then(r => setItems(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); setError(""); }
  function openEdit(v) { setForm({ ...v }); setEditing(v.id); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (editing) await api.patch(`/vehiculos/${editing}/`, form);
      else await api.post("/vehiculos/", form);
      closeModal();
      load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm("¿Eliminar vehículo?")) return;
    await api.delete(`/vehiculos/${id}/`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Vehículos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo Vehículo</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input placeholder="Buscar patente, marca, modelo..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead><tr>
                <th>Patente</th><th>Marca / Modelo</th><th>Año</th>
                <th>Capacidad (kg)</th><th>Estado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">No hay vehículos registrados</div></td></tr>
                ) : items.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.patente}</strong></td>
                    <td>{v.marca} {v.modelo}</td>
                    <td>{v.anio}</td>
                    <td>{Number(v.capacidad_kg).toLocaleString()}</td>
                    <td><span className={`badge ${ESTADO_BADGE[v.estado] || "badge-gray"}`}>{ESTADO_LABEL[v.estado] || v.estado}</span></td>
                    <td><div className="actions-col">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(v.id)}>Eliminar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? "Editar Vehículo" : "Nuevo Vehículo"}
          onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          {[["patente","Patente","text"],["marca","Marca","text"],["modelo","Modelo","text"],["anio","Año","number"],["capacidad_kg","Capacidad (kg)","number"],["numero_chasis","N° Chasis","text"]].map(([k, lbl, type]) => (
            <div className="form-group" key={k}>
              <label>{lbl}</label>
              <input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label>Estado</label>
            <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
              <option value="activo">Activo</option>
              <option value="mantenimiento">En Mantenimiento</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="form-group">
            <label>Observaciones</label>
            <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={3} />
          </div>
        </Modal>
      )}
    </div>
  );
}
