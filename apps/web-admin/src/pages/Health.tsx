const services = [
  {
    name: "PostgreSQL",
    status: "healthy",
    latency: "12ms",
    detail: "CT107 via PgBouncer",
  },
  {
    name: "Redis",
    status: "healthy",
    latency: "3ms",
    detail: "Orchestrator shared",
  },
  {
    name: "API Server",
    status: "healthy",
    latency: "45ms",
    detail: "Port 64010",
  },
  {
    name: "Web Frontend",
    status: "healthy",
    latency: "8ms",
    detail: "Port 64000",
  },
  {
    name: "Monitoring API",
    status: "healthy",
    latency: "15ms",
    detail: "Port 64080",
  },
  {
    name: "Traefik",
    status: "healthy",
    latency: "5ms",
    detail: "Orchestrator",
  },
  {
    name: "OTEL Collector",
    status: "warning",
    latency: "120ms",
    detail: "High latency",
  },
  {
    name: "BullMQ Workers",
    status: "healthy",
    latency: "23ms",
    detail: "5 active",
  },
];

export function Health() {
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
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {services.map((s, i) => (
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
            <span
              style={{ color: "#6b6b75", fontSize: "0.875rem", width: 200 }}
            >
              {s.detail}
            </span>
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
                    : "rgba(212,168,69,0.15)",
                color: s.status === "healthy" ? "#4ade80" : "#d4a845",
              }}
            >
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
