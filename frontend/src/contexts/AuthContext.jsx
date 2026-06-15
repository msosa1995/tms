import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchMe(token);
    } else {
      autoLogin();
    }
  }, []);

  async function fetchMe(token) {
    try {
      const { data } = await axios.get(`${API_URL}/v1/usuarios/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data);
    } catch {
      localStorage.clear();
      await autoLogin();
      return;
    } finally {
      setLoading(false);
    }
  }

  async function autoLogin() {
    try {
      const { data } = await axios.post(`${API_URL}/v1/auth/token/`, {
        username: "sosaro",
        password: "sosaro4x4",
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      const { data: me } = await axios.get(`${API_URL}/v1/usuarios/me/`, {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      setUser(me);
    } catch {
      // backend unavailable — show app anyway, API calls will retry
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const { data } = await axios.post(`${API_URL}/v1/auth/token/`, { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    await fetchMe(data.access);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    autoLogin();
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
