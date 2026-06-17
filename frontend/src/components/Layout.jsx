import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logoImg from "../assets/logo.jpeg";

const PRIMARY = "#1D9E75";

const NAV_GROUPS = [
  {
    label: "FINANZAS",
    items: [
      { to: "/",         icon: "📊", label: "Dashboard"    },
      { to: "/resumen",  icon: "📈", label: "Resumen"      },
      { to: "/ingresos", icon: "💰", label: "Ingresos"     },
      { to: "/gastos",   icon: "💸", label: "Gastos"       },
    ],
  },
  {
    label: "VEHÍCULO",
    items: [
      { to: "/combustible",   icon: "⛽", label: "Combustible"   },
      { to: "/mantenimiento", icon: "🔧", label: "Mantenimiento" },
      { to: "/vehiculos",     icon: "🚚", label: "Vehículos"     },
      { to: "/gps",           icon: "📍", label: "GPS"           },
    ],
  },
  {
    label: "OPERACIONES",
    items: [
      { to: "/viajes",   icon: "🚛", label: "Viajes"   },
      { to: "/choferes", icon: "👤", label: "Choferes" },
      { to: "/clientes", icon: "🏢", label: "Clientes" },
    ],
  },
];

function getInitials(user) {
  if (!user) return "U";
  if (user.first_name && user.last_name)
    return (user.first_name[0] + user.last_name[0]).toUpperCase();
  if (user.first_name) return user.first_name[0].toUpperCase();
  if (user.username) return user.username.slice(0, 2).toUpperCase();
  return "U";
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate("/login"); }
  function closeSidebar() { setSidebarOpen(false); }

  const initials = getInitials(user);
  const displayName = user?.first_name || user?.username || "Usuario";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, display: "none" }}
          className="mobile-backdrop"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}
        style={{
          width: 224,
          background: "#111820",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "relative",
          zIndex: 50,
        }}
      >
        {/* Botón cerrar móvil */}
        <button
          onClick={closeSidebar}
          className="sidebar-close-btn"
          style={{
            display: "none", position: "absolute", top: 10, right: 10,
            background: "transparent", border: "none", color: "#fff",
            fontSize: 22, cursor: "pointer", zIndex: 51,
          }}
        >✕</button>

        {/* Logo */}
        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <img src={logoImg} alt="Logo" style={{ height: 42, objectFit: "contain" }} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div style={{
                padding: "10px 16px 4px",
                fontSize: 10, fontWeight: 500, letterSpacing: 1.2,
                color: "#374151", textTransform: "uppercase",
              }}>
                {group.label}
              </div>
              {group.items.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={closeSidebar}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 16px",
                    margin: "1px 8px",
                    borderRadius: 8,
                    color: isActive ? "#fff" : "#94A3B8",
                    background: isActive ? PRIMARY : "transparent",
                    textDecoration: "none",
                    fontSize: 14, fontWeight: isActive ? 500 : 400,
                    transition: "all 0.12s",
                  })}
                >
                  <span style={{ fontSize: 15 }}>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Avatar + logout */}
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: PRIMARY, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 500, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 500 }}>{displayName}</div>
              <div style={{ color: "#4B5563", fontSize: 11 }}>{user?.email || "Administrador"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748B",
              borderRadius: 8,
              padding: "7px 0",
              fontSize: 12, fontWeight: 400,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Topbar */}
        <div style={{
          background: "#fff",
          borderBottom: "0.5px solid #E2E8F0",
          padding: "0 20px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              style={{
                display: "none", background: "transparent", border: "none",
                fontSize: 22, cursor: "pointer", color: "#1E293B", padding: 4,
              }}
            >☰</button>
            <img src={logoImg} alt="ALAS" style={{ height: 28, objectFit: "contain", borderRadius: 4 }} />
          </div>
          <span style={{ color: "#94A3B8", fontSize: 12 }}>
            {new Date().toLocaleDateString("es-PY", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
