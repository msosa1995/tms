import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { to: "/",              icon: "📊", label: "Dashboard"      },
  { to: "/resumen",       icon: "📈", label: "Resumen"        },
  { to: "/ingresos",      icon: "💰", label: "Ingresos"       },
  { to: "/gastos",        icon: "💸", label: "Gastos"         },
  { to: "/combustible",   icon: "⛽", label: "Combustible"    },
  { to: "/mantenimiento", icon: "🔧", label: "Mantenimiento"  },
  { to: "/vehiculos",     icon: "🚚", label: "Vehículos"      },
  { to: "/choferes",      icon: "👤", label: "Choferes"       },
  { to: "/clientes",      icon: "🏢", label: "Clientes"       },
  { to: "/viajes",        icon: "🚛", label: "Viajes"         },
  { to: "/gps",           icon: "📍", label: "GPS"            },
];

const RED = "#c0392b";
const RED_GLOW = "rgba(192,57,43,0.22)";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 40, display: "none",
          }}
          className="mobile-backdrop"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}
        style={{
          width: 220, background: "#111820",
          display: "flex", flexDirection: "column", flexShrink: 0,
          position: "relative", zIndex: 50,
        }}
      >
        {/* Botón cerrar en móvil */}
        <button
          onClick={closeSidebar}
          className="sidebar-close-btn"
          style={{
            display: "none", position: "absolute", top: 10, right: 10,
            background: "transparent", border: "none", color: "#fff",
            fontSize: 22, cursor: "pointer", zIndex: 51,
          }}
        >
          ✕
        </button>

        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ background: RED, height: 4 }} />
          <div style={{ padding: "16px 16px 14px" }}>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: 1.5, lineHeight: 1 }}>
              R<span style={{ color: RED }}>-</span>SOSA
            </div>
            <div style={{ color: "#7a9ab8", fontSize: 9, fontWeight: 700, letterSpacing: 2, marginTop: 3, textTransform: "uppercase" }}>
              Soluciones Logísticas
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={closeSidebar}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", color: "#b0bec5",
                textDecoration: "none", fontSize: 14,
                transition: "all 0.15s",
                ...(isActive ? {
                  background: RED_GLOW, color: "#fff",
                  borderLeft: `3px solid ${RED}`, paddingLeft: 13,
                } : {}),
              })}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              color: "#7a9ab8", borderRadius: 6, padding: "7px 0", fontSize: 12,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            Cerrar sesión
          </button>
          <div style={{ color: "#546e7a", fontSize: 11, textAlign: "center", marginTop: 8 }}>
            R-SOSA © {new Date().getFullYear()}
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #dce3ec",
          padding: "0 16px", height: 52,
          display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger — solo en móvil */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              style={{
                display: "none", background: "transparent", border: "none",
                fontSize: 22, cursor: "pointer", color: "#111820", padding: 4,
              }}
            >
              ☰
            </button>
            <div>
              <div style={{ fontWeight: 800, color: "#111820", fontSize: 16, letterSpacing: 0.5 }}>
                R<span style={{ color: RED }}>-</span>SOSA
              </div>
              <div style={{ color: RED, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                SOLUCIONES LOGÍSTICAS
              </div>
            </div>
          </div>
          <span style={{ color: "#90a4ae", fontSize: 12 }}>
            {new Date().toLocaleDateString("es-PY", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
