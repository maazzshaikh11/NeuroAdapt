import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Overview from "./pages/Overview";
import Preferences from "./pages/Preferences";
import Account from "./pages/Account";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useLenis } from "./hooks/useLenis";

const LoadingSpinner = () => (
  <div className="min-h-screen bg-bg flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl  animate-pulse shadow-lg " />
      <p className="text-sm text-muted font-medium">Loading…</p>
    </div>
  </div>
);

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  // Attach Lenis smooth-scroll to the dashboard's main scroll container.
  // useLenis skips initialisation automatically when prefers-reduced-motion is set.
  const mainRef = useLenis({ duration: 1.1 });

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar user={user} onLogout={logout} />
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="preferences" element={<Preferences />} />
            <Route path="account" element={<Account user={user} onLogout={logout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const AppRoutes = () => {
  const { token, initializing } = useAuth();

  if (initializing) return <LoadingSpinner />;

  return (
    <Routes>
      {token ? (
        <Route path="/*" element={<DashboardLayout />} />
      ) : (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
}
