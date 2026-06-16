import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RED = "#c0392b";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#111820",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 12,
        padding: "40px 36px",
        width: "100%",
        maxWidth: 380,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-block",
            background: RED,
            color: "#fff",
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: 3,
            padding: "8px 20px",
            borderRadius: 6,
            marginBottom: 10,
          }}>
            R-SOSA
          </div>
          <div style={{ color: "#546e7a", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
            Soluciones Logísticas
          </div>
        </div>

        {error && (
          <div style={{
            background: "#fdecea",
            color: RED,
            border: `1px solid ${RED}`,
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 14,
            textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#333", marginBottom: 6 }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sosaro"
              required
              autoFocus
              autoComplete="username"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1.5px solid #dce3ec",
                borderRadius: 7,
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#333", marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1.5px solid #dce3ec",
                borderRadius: 7,
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              background: loading ? "#888" : RED,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 0.5,
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div style={{ marginTop: 28, textAlign: "center", color: "#90a4ae", fontSize: 11 }}>
          R-SOSA Soluciones Logísticas © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
