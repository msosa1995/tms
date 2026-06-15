import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { to: "/",           icon: "📊", label: "Dashboard" },
  { to: "/resumen",    icon: "📈", label: "Resumen" },
  { to: "/viajes",     icon: "🚛", label: "Viajes" },
  { to: "/vehiculos",  icon: "🚚", label: "Vehículos" },
  { to: "/choferes",   icon: "👤", label: "Choferes" },
  { to: "/clientes",   icon: "🏢", label: "Clientes" },
  { to: "/ingresos",   icon: "💰", label: "Ingresos" },
  { to: "/gastos",     icon: "💸", label: "Gastos" },
  { to: "/mantenimiento", icon: "🔧", label: "Mantenimiento" },
  { to: "/combustible",   icon: "⛽", label: "Combustible" },
];

const styles = {
  layout: { display: "flex", height: "100vh", overflow: "hidden" },
  sidebar: {
    width: 220,
    background: "#1a2a3a",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  logo: {
    padding: "20px 16px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  logoTitle: { color: "#fff", fontWeight: 700, fontSize: 16 },
  logoSub: { color: "#7a9ab8", fontSize: 11, marginTop: 2 },
  nav: { flex: 1, padding: "12px 0", overflowY: "auto" },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 16px", color: "#cdd5e0",
    textDecoration: "none", fontSize: 14,
    transition: "all 0.15s", borderRadius: 0,
  },
  navItemActive: {
    background: "rgba(46,134,193,0.25)",
    color: "#fff",
    borderLeft: "3px solid #2e86c1",
    paddingLeft: 13,
  },
  bottom: {
    padding: "12px 16px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  userBox: { color: "#cdd5e0", fontSize: 13 },
  userName: { color: "#fff", fontWeight: 600, fontSize: 14 },
  logoutBtn: {
    marginTop: 8, background: "rgba(231,76,60,0.2)", color: "#e74c3c",
    border: "none", borderRadius: 6, padding: "6px 12px",
    width: "100%", cursor: "pointer", fontSize: 13,
  },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: {
    background: "#fff", borderBottom: "1px solid #dce3ec",
    padding: "12px 24px", display: "flex", alignItems: "center",
    justifyContent: "space-between", flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  topbarTitle: { fontWeight: 700, color: "#1a5276", fontSize: 18 },
  content: { flex: 1, overflowY: "auto", padding: 24 },
};

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoTitle}>🚛 TMS</div>
          <div style={styles.logoSub}>Gestión de Transporte</div>
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
          <div style={styles.userBox}>
            <div style={styles.userName}>{user?.nombre_completo || user?.email}</div>
            <div style={{ fontSize: 11, marginTop: 2, textTransform: "capitalize" }}>
              {user?.rol}
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <span style={styles.topbarTitle}>TMS — Sistema de Gestión de Transporte</span>
          <span style={{ color: "#7f8c9a", fontSize: 13 }}>
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
