import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../hooks/use-admin-auth.js";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Introdu email-ul si parola.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autentificare esuata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117",
        color: "#e5e5e7",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "2rem",
          border: "1px solid #2a2d35",
          borderRadius: "12px",
          background: "rgba(20,22,28,0.9)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: "1.25rem",
            marginBottom: "1.5rem",
            color: "#e5e5e7",
          }}
        >
          cerniq<span style={{ color: "#d4a845" }}>.admin</span> — Autentificare
        </h1>
        <label
          htmlFor="admin-email"
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#a0a0a8",
          }}
        >
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="admin@companie.ro"
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            border: "1px solid #2a2d35",
            borderRadius: "8px",
            background: "#0f1117",
            color: "#e5e5e7",
            fontSize: "0.875rem",
          }}
        />
        <label
          htmlFor="admin-password"
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#a0a0a8",
          }}
        >
          Parola
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            border: "1px solid #2a2d35",
            borderRadius: "8px",
            background: "#0f1117",
            color: "#e5e5e7",
            fontSize: "0.875rem",
          }}
        />
        {error && (
          <p style={{ color: "#f87171", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</p>
        )}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "none",
            borderRadius: "8px",
            background: "#d4a845",
            color: "#0f1117",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          {loading ? "Se autentifica..." : "Autentificare"}
        </button>
      </form>
    </div>
  );
}
