import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

const ESTADO_BADGE = { activo: "badge-green", licencia: "badge-yellow", inactivo: "badge-gray" };
const ESTADO_LABEL = { activo: "Activo", licencia: "De Licencia", inactivo: "Inactivo" };

const EMPTY = { nombre: "", apellido: "", documento: "", telefono: "", email: "", direccion: "", licencia_numero: "", licencia_vencimiento: "", fecha_ingreso: "", estado: "activo", observaciones: "" };

export default function Choferes() {
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
    api.get("/choferes/", { params: { search, page_size: 100 } })
      .then(r => setItems(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); setError(""); }
  function openEdit(c) { setForm({ ...c, licencia_vencimiento: c.licencia_vencimiento || "", fecha_ingreso: c.fecha_ingreso || "" }); setEditing(c.id); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.licencia_vencimiento) delete payload.licencia_vencimiento;
      if (editing) await api.patch(`/choferes/${editing}/`, payload);
      else await api.post("/choferes/", payload);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  async function remove(id) {
    if (!confirm("¿Eliminar chofer?")) return;
    await api.delete(`/choferes/${id}/`); load();
  }

  const field = (k, lbl, type = "text") => (
    <div className="form-group" key={k}>
      <label>{lbl}</label>
      <input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Choferes</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo Chofer</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input placeholder="Buscar nombre, apellido, documento..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Ingreso</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">No hay choferes registrados</div></td></tr>
                ) : items.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.nombre_completo || `${c.nombre} ${c.apellido}`}</strong></td>
                    <td>{c.documento}</td>
                    <td>{c.telefono}</td>
                    <td>{c.fecha_ingreso}</td>
                    <td><span className={`badge ${ESTADO_BADGE[c.estado] || "badge-gray"}`}>{ESTADO_LABEL[c.estado] || c.estado}</span></td>
                    <td><div className="actions-col">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Eliminar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={editing ? "Editar Chofer" : "Nuevo Chofer"} onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          {field("nombre", "Nombre")}
          {field("apellido", "Apellido")}
          {field("documento", "Documento (CI)")}
          {field("telefono", "Teléfono")}
          {field("email", "Email", "email")}
          <div className="form-group">
            <label>Dirección</label>
            <textarea value={form.direccion || ""} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} rows={2} />
          </div>
          {field("licencia_numero", "N° Licencia")}
          {field("licencia_vencimiento", "Venc. Licencia", "date")}
          {field("fecha_ingreso", "Fecha Ingreso", "date")}
          <div className="form-group">
            <label>Estado</label>
            <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
              <option value="activo">Activo</option>
              <option value="licencia">De Licencia</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
