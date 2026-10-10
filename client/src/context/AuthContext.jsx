import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, getToken, setToken, clearToken } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setCheckingAuth(false);
      return;
    }
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) throw new Error("expired");
      setUser(await res.json());
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  function login(token, userData) {
    setToken(token);
    setUser(userData);
  }
  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checkingAuth, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
