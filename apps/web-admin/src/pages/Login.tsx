import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../providers/admin-auth-provider.js";

export function Login() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const { setAdminKey } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Introdu cheia de admin.");
      return;
    }
    setAdminKey(trimmed);
    navigate("/dashboard", { replace: true });
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
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: "0.875rem",
            color: "#a0a0a8",
          }}
        >
          Cheie admin
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          placeholder="Introdu cheia de admin"
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
          Autentificare
        </button>
      </form>
    </div>
  );
}
