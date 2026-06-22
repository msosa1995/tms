import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logoImg from "../assets/logo.jpeg";
import {
  LayoutDashboard, BarChart3, ArrowUpCircle, ArrowDownCircle,
  Fuel, Wrench, Truck, MapPin,
  Route, User, Building2,
  LogOut, Activity, ChevronRight,
} from "lucide-react";

const PRIMARY = "#00D4AA";

const NAV_GROUPS = [
  {
    label: "FINANZAS",
    items: [
      { to: "/",         Icon: LayoutDashboard, label: "Dashboard"    },
      { to: "/resumen",  Icon: BarChart3,       label: "Resumen"      },
      { to: "/ingresos", Icon: ArrowUpCircle,   label: "Ingresos"     },
      { to: "/gastos",   Icon: ArrowDownCircle, label: "Gastos"       },
    ],
  },
  {
    label: "VEHÍCULO",
    items: [
      { to: "/combustible",   Icon: Fuel,    label: "Combustible"   },
      { to: "/mantenimiento", Icon: Wrench,  label: "Mantenimiento" },
      { to: "/vehiculos",     Icon: Truck,   label: "Vehículos"     },
      { to: "/gps",           Icon: MapPin,  label: "GPS"           },
    ],
  },
  {
    label: "OPERACIONES",
    items: [
      { to: "/viajes",   Icon: Route,     label: "Viajes"   },
      { to: "/choferes", Icon: User,      label: "Choferes" },
      { to: "/clientes", Icon: Building2, label: "Clientes" },
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

  const handleLogout  = () => { logout(); navigate("/login"); };
  const closeSidebar  = () => setSidebarOpen(false);
  const initials      = getInitials(user);
  const displayName   = user?.first_name || user?.username || "Usuario";
  const timeStr       = time.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  const dateStr       = time.toLocaleDateString("es-PY", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div onClick={closeSidebar} className="mobile-backdrop"
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:40, display:"none" }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}
        style={{ width:224, background:"var(--sidebar-bg)", display:"flex", flexDirection:"column", flexShrink:0, position:"relative", zIndex:50, borderRight:"1px solid rgba(255,255,255,0.045)" }}>

        <button onClick={closeSidebar} className="sidebar-close-btn"
          style={{ display:"none", position:"absolute", top:10, right:10, background:"transparent", border:"none", color:"#fff", fontSize:20, cursor:"pointer", zIndex:51 }}>✕</button>

        {/* Logo */}
        <div style={{ padding:"16px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.045)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <img src={logoImg} alt="R-SOSA" style={{ height:32, width:32, objectFit:"contain", borderRadius:7, border:"1px solid rgba(0,212,170,0.18)" }} />
            <div>
              <div style={{ color:"#E8EFF8", fontWeight:600, fontSize:14, letterSpacing:0.2 }}>R-SOSA</div>
              <div style={{ color:"#1E2E44", fontSize:9, fontWeight:500, letterSpacing:1.8, textTransform:"uppercase" }}>Logística</div>
            </div>
          </div>
          {/* Live indicator */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, padding:"5px 9px", background:"rgba(0,212,170,0.05)", borderRadius:6, border:"1px solid rgba(0,212,170,0.09)" }}>
            <span className="pulse-dot" style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:PRIMARY }} />
            <span style={{ fontSize:10, color:"#00A890", fontWeight:500, letterSpacing:1, textTransform:"uppercase" }}>Sistema activo</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"6px 0", overflowY:"auto" }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom:2 }}>
              <div style={{ padding:"10px 17px 3px", fontSize:9, fontWeight:600, letterSpacing:2.2, color:"#17253A", textTransform:"uppercase" }}>
                {group.label}
              </div>
              {group.items.map(({ to, Icon, label }) => (
                <NavLink
                  key={to} to={to} end={to === "/"} onClick={closeSidebar}
                  className={({ isActive }) => `nav-link${isActive ? " nav-active" : ""}`}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:"10px 14px 14px", borderTop:"1px solid rgba(255,255,255,0.045)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:9, padding:"7px 9px", background:"rgba(255,255,255,0.025)", borderRadius:8, border:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg, ${PRIMARY} 0%, #007AC5 100%)`, color:"#07090F", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>
              {initials}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ color:"#B8C8DC", fontSize:12, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displayName}</div>
              <div style={{ color:"#1E2E44", fontSize:10 }}>Administrador</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, background:"transparent", border:"1px solid rgba(255,255,255,0.06)", color:"#2D3A52", borderRadius:7, padding:"7px 0", fontSize:12, cursor:"pointer", transition:"all 0.14s" }}>
            <LogOut size={13} strokeWidth={2} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* Topbar */}
        <div style={{ background:"var(--topbar-bg)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(255,255,255,0.05)", padding:"0 22px", height:50, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button className="hamburger-btn" onClick={()=>setSidebarOpen(true)}
              style={{ display:"none", background:"transparent", border:"none", fontSize:20, cursor:"pointer", color:"#E8EFF8", padding:4 }}>☰</button>
            <img src={logoImg} alt="R-SOSA" style={{ height:22, objectFit:"contain", borderRadius:4, opacity:0.85 }} />
            <div style={{ width:1, height:16, background:"rgba(255,255,255,0.07)" }} />
            <span style={{ color:"#1E2E44", fontSize:12, fontWeight:500, letterSpacing:0.2 }}>Centro de Operaciones</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Activity size={13} color="#1E3A52" strokeWidth={2} />
              <span style={{ color:"#1E3A52", fontSize:11 }}>{dateStr}</span>
            </div>
            <span style={{ color:PRIMARY, fontSize:13, fontWeight:600, fontVariantNumeric:"tabular-nums", letterSpacing:0.5 }}>{timeStr}</span>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:18, background:"var(--bg)" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
