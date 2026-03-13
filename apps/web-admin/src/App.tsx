import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./providers/admin-auth-provider.js";
import { useAdminAuth } from "./hooks/use-admin-auth.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Queues } from "./pages/Queues.js";
import { Health } from "./pages/Health.js";
import { Logs } from "./pages/Logs.js";
import { Login } from "./pages/Login.js";
import { LayoutDashboard, ListTodo, HeartPulse, ScrollText } from "lucide-react";

function AdminLayout() {
  const links = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/queues", icon: ListTodo, label: "Queues" },
    { to: "/health", icon: HeartPulse, label: "System Health" },
    { to: "/logs", icon: ScrollText, label: "Logs" },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0f1117",
        color: "#e5e5e7",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #2a2d35",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: "1.1rem",
            marginBottom: "1rem",
            padding: "0.5rem",
          }}
        >
          cerniq<span style={{ color: "#d4a845" }}>.admin</span>
        </div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              textDecoration: "none",
              background: isActive ? "rgba(212,168,69,0.1)" : "transparent",
              color: isActive ? "#d4a845" : "#a0a0a8",
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </aside>
      <main style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <AdminSession />
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/queues" element={<Queues />} />
          <Route path="/health" element={<Health />} />
          <Route path="/logs" element={<Logs />} />
          <Route
            path="*"
            element={
              <div style={{ padding: "2rem", color: "#a0a0a8" }}>404 — Pagina nu a fost găsită</div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminSession() {
  const { user, logout } = useAdminAuth();
  return (
    <button
      type="button"
      onClick={() => void logout()}
      style={{
        border: "1px solid #2a2d35",
        borderRadius: "999px",
        background: "rgba(22,24,30,0.8)",
        color: "#e5e5e7",
        padding: "0.5rem 0.9rem",
        cursor: "pointer",
        fontSize: "0.875rem",
      }}
    >
      {user?.email ?? "Admin"} • Logout
    </button>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <AdminGate>
                <AdminLayout />
              </AdminGate>
            }
          />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
