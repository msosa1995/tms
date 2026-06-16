import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vehiculos from "./pages/Vehiculos";
import Choferes from "./pages/Choferes";
import Clientes from "./pages/Clientes";
import Viajes from "./pages/Viajes";
import Ingresos from "./pages/Ingresos";
import Gastos from "./pages/Gastos";
import Mantenimiento from "./pages/Mantenimiento";
import Combustible from "./pages/Combustible";
import Resumen from "./pages/Resumen";
import Gps from "./pages/Gps";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0f2f5", color: "#546e7a", fontSize: 16 }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="vehiculos" element={<Vehiculos />} />
        <Route path="choferes" element={<Choferes />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="viajes" element={<Viajes />} />
        <Route path="ingresos" element={<Ingresos />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="mantenimiento" element={<Mantenimiento />} />
        <Route path="combustible" element={<Combustible />} />
        <Route path="resumen" element={<Resumen />} />
        <Route path="gps" element={<Gps />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
