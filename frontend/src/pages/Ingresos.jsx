import React, { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Modal from "../components/Modal";

function fmt(n) { return n ? "₲ " + Number(n).toLocaleString("es-PY") : "₲ 0"; }

const FORMAS_PAGO = ["efectivo", "transferencia", "cheque", "credito"];
const FORMA_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia", cheque: "Cheque", credito: "Crédito" };

const EMPTY = { viaje: "", cliente: "", fecha: new Date().toISOString().slice(0,10), monto: "", moneda: "PYG", forma_pago: "efectivo", numero_factura: "", observaciones: "" };

export default function Ingresos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/ingresos/", { params: { page_size: 100, ordering: "-fecha" } })
      .then(r => setItems(r.data.results || r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/clientes/", { params: { page_size: 200 } }).then(r => setClientes(r.data.results || r.data));
    api.get("/viajes/", { params: { page_size: 200, estado: "finalizado" } }).then(r => setViajes(r.data.results || r.data));
  }, []);

  function openNew() { setForm(EMPTY); setModal(true); setError(""); }
  function closeModal() { setModal(false); setError(""); }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.viaje) delete payload.viaje;
      await api.post("/ingresos/", payload);
      closeModal(); load();
    } catch (e) {
      const d = e.response?.data?.errors || e.response?.data;
      setError(typeof d === "string" ? d : JSON.stringify(d));
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Ingresos</h2>
        <button className="btn btn-primary" onClick={openNew}>+ Registrar Ingreso</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div className="loading">Cargando...</div> : (
            <table>
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Viaje</th><th>Forma de Pago</th><th>Factura</th><th>Monto</th></tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">No hay ingresos registrados</div></td></tr>
                ) : items.map(i => (
                  <tr key={i.id}>
                    <td>{i.fecha}</td>
                    <td>{i.cliente_nombre || i.cliente?.razon_social}</td>
                    <td>{i.viaje_numero || i.viaje?.numero_viaje || "—"}</td>
                    <td>{FORMA_LABEL[i.forma_pago] || i.forma_pago}</td>
                    <td>{i.numero_factura || "—"}</td>
                    <td style={{ fontWeight: 700, color: "#1e8449" }}>{fmt(i.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
            <label>Viaje (opcional)</label>
            <select value={form.viaje} onChange={e => setForm(f => ({ ...f, viaje: e.target.value }))}>
              <option value="">Sin viaje asociado</option>
              {viajes.map(v => <option key={v.id} value={v.id}>{v.numero_viaje} — {v.origen} → {v.destino}</option>)}
            </select>
          </div>
          {[["fecha","Fecha","date"],["monto","Monto (₲)","number"],["numero_factura","N° Factura","text"]].map(([k,lbl,type]) => (
            <div className="form-group" key={k}>
              <label>{lbl}</label>
              <input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group">
            <label>Forma de Pago</label>
            <select value={form.forma_pago} onChange={e => setForm(f => ({ ...f, forma_pago: e.target.value }))}>
              {FORMAS_PAGO.map(fp => <option key={fp} value={fp}>{FORMA_LABEL[fp]}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
