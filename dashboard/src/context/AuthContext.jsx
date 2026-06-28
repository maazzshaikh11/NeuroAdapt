import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthContext.Provider");
  return ctx;
};

const decodeJWT = (token) => {
  try {
    const base64 = token.split(".")[1];
    const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isTokenValid = (payload) => {
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 > Date.now();
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const fetchFullProfile = async (tokenString) => {
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${tokenString}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        window.postMessage({ type: 'NEUROADAPT_AUTH_SYNC', token: tokenString, user: JSON.stringify(data.user) }, '*');
        return true;
      }
    } catch (err) {
      console.error("[NeuroAdapt] Failed to fetch full profile:", err);
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      let activeToken = null;

      if (urlToken) {
        localStorage.setItem("neuroadapt_token", urlToken);
        activeToken = urlToken;
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        activeToken = localStorage.getItem("neuroadapt_token");
      }

      if (activeToken) {
        const payload = decodeJWT(activeToken);
        if (isTokenValid(payload)) {
          setToken(activeToken);
          const success = await fetchFullProfile(activeToken);
          if (!success && mounted) {
            // Fallback if backend is temporarily unreachable
            const userData = {
              id: payload.userId || payload.id,
              email: payload.email,
              role: payload.role || "user",
            };
            setUser(userData);
          }
        } else {
          localStorage.removeItem("neuroadapt_token");
          window.postMessage({ type: 'NEUROADAPT_AUTH_LOGOUT' }, '*');
        }
      }
      if (mounted) setInitializing(false);
    };

    initializeAuth();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    
    localStorage.setItem("neuroadapt_token", data.token);
    setToken(data.token);
    const success = await fetchFullProfile(data.token);
    if (!success) {
      const payload = decodeJWT(data.token);
      const userData = {
        id: payload?.userId || payload?.id,
        email: payload?.email,
        role: payload?.role || "user",
      };
      setUser(userData);
      window.postMessage({ type: 'NEUROADAPT_AUTH_SYNC', token: data.token, user: JSON.stringify(userData) }, '*');
    }
  }, []);

  const register = useCallback(async (email, password, fullName) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, displayName: fullName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    
    localStorage.setItem("neuroadapt_token", data.token);
    const payload = decodeJWT(data.token);
    setToken(data.token);
    const success = await fetchFullProfile(data.token);
    if (!success) {
      const userData = {
        id: payload?.userId || payload?.id,
        email: payload?.email,
        role: payload?.role || "user",
      };
      setUser(userData);
      window.postMessage({ type: 'NEUROADAPT_AUTH_SYNC', token: data.token, user: JSON.stringify(userData) }, '*');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("neuroadapt_token");
    setToken(null);
    setUser(null);
    window.postMessage({ type: 'NEUROADAPT_AUTH_LOGOUT' }, '*');
  }, []);

  // Called after a successful profile save to refresh in-memory user state
  // without requiring a full page reload.
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const updated = { ...prev, ...patch };
      // Sync to extension
      window.postMessage({ type: 'NEUROADAPT_AUTH_SYNC', token: localStorage.getItem("neuroadapt_token"), user: JSON.stringify(updated) }, '*');
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem("neuroadapt_token");
    if (currentToken) {
      await fetchFullProfile(currentToken);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, initializing, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
