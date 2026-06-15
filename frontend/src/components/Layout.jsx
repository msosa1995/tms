import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/",            icon: "📊", label: "Dashboard"     },
  { to: "/resumen",     icon: "📈", label: "Resumen"       },
  { to: "/viajes",      icon: "🚛", label: "Viajes"        },
  { to: "/vehiculos",   icon: "🚚", label: "Vehículos"     },
  { to: "/choferes",    icon: "👤", label: "Choferes"      },
  { to: "/clientes",    icon: "🏢", label: "Clientes"      },
  { to: "/ingresos",    icon: "💰", label: "Ingresos"      },
  { to: "/gastos",      icon: "💸", label: "Gastos"        },
  { to: "/mantenimiento", icon: "🔧", label: "Mantenimiento" },
  { to: "/combustible", icon: "⛽", label: "Combustible"   },
];

const RED = "#c0392b";
const RED_GLOW = "rgba(192,57,43,0.22)";

const styles = {
  layout:  { display: "flex", height: "100vh", overflow: "hidden" },
  sidebar: { width: 220, background: "#111820", display: "flex", flexDirection: "column", flexShrink: 0 },
  logoWrap: {
    padding: "0 0 0 0",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  logoTop: {
    background: RED,
    height: 4,
    width: "100%",
  },
  logoBody: {
    padding: "16px 16px 14px",
  },
  logoTitle: {
    color: "#fff",
    fontWeight: 900,
    fontSize: 22,
    letterSpacing: 1.5,
    lineHeight: 1,
  },
  logoDash: {
    color: RED,
    fontWeight: 900,
  },
  logoSub: {
    color: "#7a9ab8",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2,
    marginTop: 3,
    textTransform: "uppercase",
  },
  nav:  { flex: 1, padding: "10px 0", overflowY: "auto" },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 16px", color: "#b0bec5",
    textDecoration: "none", fontSize: 14,
    transition: "all 0.15s",
  },
  navItemActive: {
    background: RED_GLOW,
    color: "#fff",
    borderLeft: `3px solid ${RED}`,
    paddingLeft: 13,
  },
  bottom: {
    padding: "12px 16px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
  },
  bottomText: { color: "#546e7a", fontSize: 11, textAlign: "center" },
  main:   { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: {
    background: "#fff",
    borderBottom: "1px solid #dce3ec",
    padding: "0 24px",
    height: 52,
    display: "flex", alignItems: "center",
    justifyContent: "space-between", flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  topbarBrand: {
    display: "flex", alignItems: "center", gap: 10,
  },
  topbarTitle: {
    fontWeight: 800, color: "#111820", fontSize: 16, letterSpacing: 0.5,
  },
  topbarSub: {
    color: RED, fontSize: 11, fontWeight: 700, letterSpacing: 1,
  },
  topbarDate: { color: "#90a4ae", fontSize: 12 },
  content: { flex: 1, overflowY: "auto", padding: 24 },
};

export default function Layout() {
  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoTop} />
          <div style={styles.logoBody}>
            <div style={styles.logoTitle}>
              R<span style={styles.logoDash}>-</span>SOSA
            </div>
            <div style={styles.logoSub}>Soluciones Logísticas</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={styles.bottom}>
          <div style={styles.bottomText}>R-SOSA © {new Date().getFullYear()}</div>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.topbarBrand}>
            <div>
              <div style={styles.topbarTitle}>R<span style={{ color: RED }}>-</span>SOSA</div>
              <div style={styles.topbarSub}>SOLUCIONES LOGÍSTICAS</div>
            </div>
          </div>
          <span style={styles.topbarDate}>
            {new Date().toLocaleDateString("es-PY", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
