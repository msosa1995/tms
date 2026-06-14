import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

const EMPTY = { razon_social: "", ruc: "", contacto: "", telefono: "", email: "", direccion: "", activo: true, observaciones: "" };

export default function Clientes() {
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
    api.get("/clientes/", { params: { search, page_size: 100 } })
      .then(r => setItems(r.data.results || r.data))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm(EMPTY); setEditing(null); setModal(true); setError(""); }
  function openEdit(c) { setForm({ ...c }); setEditing(c.id); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      if (editing) await api.patch(`/clientes/${editing}/`, form);
      else await api.post("/clientes/", form);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Clientes</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo Cliente</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input placeholder="Buscar razón social, RUC..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead><tr><th>Razón Social</th><th>RUC</th><th>Contacto</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">No hay clientes</div></td></tr>
                ) : items.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.razon_social}</strong></td>
                    <td>{c.ruc}</td>
                    <td>{c.contacto}</td>
                    <td>{c.telefono}</td>
                    <td><span className={`badge ${c.activo ? "badge-green" : "badge-gray"}`}>{c.activo ? "Activo" : "Inactivo"}</span></td>
                    <td><div className="actions-col">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Editar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={editing ? "Editar Cliente" : "Nuevo Cliente"} onClose={closeModal}
          footer={<>
            <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </>}
        >
          {error && <div className="error-msg">{error}</div>}
          {[["razon_social","Razón Social"],["ruc","RUC"],["contacto","Persona de Contacto"],["telefono","Teléfono"],["email","Email"]].map(([k, lbl]) => (
            <div className="form-group" key={k}>
              <label>{lbl}</label>
              <input value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label>Dirección</label>
            <textarea value={form.direccion || ""} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} rows={2} />
          </div>
          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} style={{ width: "auto" }} />
              Cliente activo
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
