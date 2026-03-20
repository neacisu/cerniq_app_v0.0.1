import { useEffect, useState } from "react";
import { fetchHealthDeps, fetchSystemMetrics, fetchQueues } from "../api";

type ServiceRow = {
  name: string;
  status: "healthy" | "unhealthy" | "warning" | "unknown";
  latency: string;
  detail: string;
};

export function Health() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [depsRes, metricsRes, queuesRes] = await Promise.all([
          fetchHealthDeps(),
          fetchSystemMetrics(),
          fetchQueues(),
        ]);
        if (cancelled) return;

        const rows: ServiceRow[] = [];

        if (depsRes.dependencies?.database) {
          const d = depsRes.dependencies.database;
          rows.push({
            name: "PostgreSQL",
            status: d.status === "healthy" ? "healthy" : "unhealthy",
            latency: `${d.latencyMs}ms`,
            detail: "CT107 via PgBouncer",
          });
        }
        if (depsRes.dependencies?.redis) {
          const r = depsRes.dependencies.redis;
          rows.push({
            name: "Redis",
            status: r.status === "healthy" ? "healthy" : "unhealthy",
            latency: `${r.latencyMs}ms`,
            detail: "Orchestrator shared",
          });
        }

        rows.push({
          name: "Monitoring API",
          status: queuesRes.success && Array.isArray(queuesRes.data) ? "healthy" : "unhealthy",
          latency: "—",
          detail: "Internal proxy via API",
        });

        if (metricsRes.success && metricsRes.data) {
          const m = metricsRes.data;
          rows.push({
            name: "System",
            status: "healthy",
            latency: m.memory?.usagePercent ?? "—",
            detail: `Host ${m.hostname ?? "—"} • Uptime ${m.uptime != null ? `${Math.round(m.uptime / 60)}m` : "—"}`,
          });
        }

        setServices(rows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load health");
          setServices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && services.length === 0) {
    return (
      <div>
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          System Health
        </h1>
        <p style={{ color: "#6b6b75" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        System Health
      </h1>
      {error && <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {services.length === 0 ? (
          <p style={{ color: "#6b6b75" }}>No health data available.</p>
        ) : (
          services.map((s, i) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                background: i % 2 === 0 ? "rgba(22,24,30,0.5)" : "transparent",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  marginRight: "0.75rem",
                  background:
                    s.status === "healthy"
                      ? "#4ade80"
                      : s.status === "warning"
                        ? "#d4a845"
                        : "#ef4444",
                  boxShadow: `0 0 6px ${s.status === "healthy" ? "#4ade80" : s.status === "warning" ? "#d4a845" : "#ef4444"}`,
                }}
              />
              <span style={{ flex: 1, fontWeight: 500 }}>{s.name}</span>
              <span style={{ color: "#6b6b75", fontSize: "0.875rem", width: 200 }}>{s.detail}</span>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "0.8rem",
                  width: 80,
                  textAlign: "right",
                }}
              >
                {s.latency}
              </span>
              <span
                style={{
                  marginLeft: "1rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "0.25rem",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  background:
                    s.status === "healthy"
                      ? "rgba(74,222,128,0.15)"
                      : s.status === "warning"
                        ? "rgba(212,168,69,0.15)"
                        : "rgba(239,68,68,0.15)",
                  color:
                    s.status === "healthy"
                      ? "#4ade80"
                      : s.status === "warning"
                        ? "#d4a845"
                        : "#ef4444",
                }}
              >
                {s.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
