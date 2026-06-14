import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.errors?.detail ||
        "Credenciales incorrectas"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #1a2a3a 0%, #1a5276 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "40px 36px",
        width: "100%", maxWidth: 400, boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🚛</div>
          <h1 style={{ color: "#1a5276", fontWeight: 800, fontSize: 24, marginTop: 8 }}>TMS</h1>
          <p style={{ color: "#7f8c9a", fontSize: 14, marginTop: 4 }}>Sistema de Gestión de Transporte</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tms.local" required autoFocus
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "11px", background: "#1a5276", color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", color: "#7f8c9a", fontSize: 12 }}>
          admin@tms.local / Admin1234!
        </p>
      </div>
    </div>
  );
}
