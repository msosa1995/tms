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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
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
