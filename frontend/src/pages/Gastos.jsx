import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

function fmt(n) { return n ? "₲ " + Number(n).toLocaleString("es-PY") : "₲ 0"; }

const CATEGORIAS = ["combustible","peajes","viaticos","reparaciones","neumaticos","mantenimiento","seguros","impuestos","otros"];
const CAT_LABEL = { combustible:"Combustible", peajes:"Peajes", viaticos:"Viáticos", reparaciones:"Reparaciones", neumaticos:"Neumáticos", mantenimiento:"Mantenimiento", seguros:"Seguros", impuestos:"Impuestos", otros:"Otros" };

const EMPTY = { viaje: "", vehiculo: "", fecha: new Date().toISOString().slice(0,10), categoria: "combustible", monto: "", descripcion: "", proveedor: "", numero_comprobante: "" };

export default function Gastos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehiculos, setVehiculos] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = { page_size: 100, ordering: "-fecha" };
    if (catFilter) params.categoria = catFilter;
    api.get("/gastos/", { params }).then(r => setItems(r.data.results || r.data)).finally(() => setLoading(false));
  }, [catFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/vehiculos/", { params: { page_size: 200 } }).then(r => setVehiculos(r.data.results || r.data));
    api.get("/viajes/", { params: { page_size: 200 } }).then(r => setViajes(r.data.results || r.data));
  }, []);

  function openNew() { setForm(EMPTY); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.viaje) delete payload.viaje;
      if (!payload.vehiculo) delete payload.vehiculo;
      await api.post("/gastos/", payload);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Gastos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar Gasto</button>
      </div>

      <div className="card">
        <div className="search-bar">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Viaje</th><th>Proveedor</th><th>Monto</th></tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">No hay gastos registrados</div></td></tr>
                ) : items.map(g => (
                  <tr key={g.id}>
                    <td>{g.fecha}</td>
                    <td><span className="badge badge-blue">{CAT_LABEL[g.categoria] || g.categoria}</span></td>
                    <td>{g.descripcion?.slice(0, 60)}</td>
                    <td>{g.viaje_numero || "—"}</td>
                    <td>{g.proveedor || "—"}</td>
                    <td style={{ fontWeight: 700, color: "#922b21" }}>{fmt(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
            <label>Viaje (opcional)</label>
            <select value={form.viaje} onChange={e => setForm(f => ({ ...f, viaje: e.target.value }))}>
              <option value="">Sin viaje</option>
              {viajes.map(v => <option key={v.id} value={v.id}>{v.numero_viaje} — {v.origen} → {v.destino}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Vehículo (opcional)</label>
            <select value={form.vehiculo} onChange={e => setForm(f => ({ ...f, vehiculo: e.target.value }))}>
              <option value="">Sin vehículo</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}</option>)}
            </select>
          </div>
          {[["fecha","Fecha","date"],["monto","Monto (₲)","number"],["numero_comprobante","N° Comprobante","text"],["proveedor","Proveedor","text"]].map(([k,lbl,type]) => (
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
