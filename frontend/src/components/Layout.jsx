import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logoImg from "../assets/logo.jpeg";

const PRIMARY = "#00D4AA";

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
  if (user.first_name && user.last_name) return (user.first_name[0] + user.last_name[0]).toUpperCase();
  if (user.first_name) return user.first_name[0].toUpperCase();
  return (user.username || "U").slice(0, 2).toUpperCase();
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  function handleLogout() { logout(); navigate("/login"); }
  function closeSidebar() { setSidebarOpen(false); }

  const initials    = getInitials(user);
  const displayName = user?.first_name || user?.username || "Usuario";
  const timeStr     = time.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  const dateStr     = time.toLocaleDateString("es-PY", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div onClick={closeSidebar} className="mobile-backdrop"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 40, display: "none" }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}
        style={{ width: 230, background: "var(--sidebar-bg)", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative", zIndex: 50, borderRight: "1px solid rgba(255,255,255,0.05)" }}>

        <button onClick={closeSidebar} className="sidebar-close-btn"
          style={{ display: "none", position: "absolute", top: 10, right: 10, background: "transparent", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", zIndex: 51 }}>✕</button>

        {/* Logo */}
        <div style={{ padding: "18px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoImg} alt="R-SOSA" style={{ height: 36, width: 36, objectFit: "contain", borderRadius: 8, border: "1px solid rgba(0,212,170,0.2)" }} />
            <div>
              <div style={{ color: "#E2E8F0", fontWeight: 600, fontSize: 15, letterSpacing: 0.3 }}>R-SOSA</div>
              <div style={{ color: "#2D4A6A", fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" }}>
                Soluciones Logísticas
              </div>
            </div>
          </div>
          {/* System status indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, padding: "6px 10px", background: "rgba(0,212,170,0.06)", borderRadius: 8, border: "1px solid rgba(0,212,170,0.10)" }}>
            <span className="pulse-dot" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: PRIMARY, color: PRIMARY }} />
            <span style={{ fontSize: 10, color: "#00D4AA", fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>Sistema Activo</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 2 }}>
              <div style={{ padding: "10px 20px 4px", fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#1E3A5F", textTransform: "uppercase" }}>
                {group.label}
              </div>
              {group.items.map(({ to, icon, label }) => (
                <NavLink
                  key={to} to={to} end={to === "/"} onClick={closeSidebar}
                  className={({ isActive }) => `nav-link${isActive ? " nav-active" : ""}`}
                >
                  <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${PRIMARY} 0%, #0089B3 100%)`, color: "#050912", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#CBD5E1", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
              <div style={{ color: "#2D4A6A", fontSize: 10 }}>Administrador</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#334155", borderRadius: 8, padding: "7px 0", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ background: "var(--topbar-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}
              style={{ display: "none", background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "#E2E8F0", padding: 4 }}>☰</button>
            <img src={logoImg} alt="R-SOSA" style={{ height: 26, objectFit: "contain", borderRadius: 4, opacity: 0.9 }} />
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: "#334155", fontSize: 12, fontWeight: 500, letterSpacing: 0.3 }}>Centro de Operaciones</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#334155", fontSize: 12 }}>{dateStr}</span>
            <span style={{ color: PRIMARY, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "var(--bg)" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
