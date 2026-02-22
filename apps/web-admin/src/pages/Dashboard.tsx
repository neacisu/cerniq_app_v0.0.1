export function Dashboard() {
  const cards = [
    { label: "Active Queues", value: "5", color: "#4ade80" },
    { label: "Total Jobs", value: "12,847", color: "#d4a845" },
    { label: "Failed Jobs", value: "23", color: "#ef4444" },
    { label: "Avg Processing", value: "245ms", color: "#60a5fa" },
  ];

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        Admin Dashboard
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #2a2d35",
              background: "rgba(22,24,30,0.8)",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: c.color,
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              {c.value}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#6b6b75",
                marginTop: "0.25rem",
              }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "1.5rem",
          borderRadius: "0.75rem",
          border: "1px solid #2a2d35",
          background: "rgba(22,24,30,0.8)",
        }}
      >
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
          Queue Activity (Mock)
        </h3>
        <p style={{ color: "#6b6b75", fontSize: "0.875rem" }}>
          Real-time charts will be added with Recharts + WebSocket integration.
        </p>
      </div>
    </div>
  );
}
