const queues = [
  {
    name: "cerniq:enrichment",
    waiting: 45,
    active: 3,
    completed: 8234,
    failed: 12,
    paused: false,
  },
  {
    name: "cerniq:outreach-wa",
    waiting: 12,
    active: 5,
    completed: 4521,
    failed: 5,
    paused: false,
  },
  {
    name: "cerniq:outreach-email",
    waiting: 89,
    active: 2,
    completed: 12034,
    failed: 23,
    paused: false,
  },
  {
    name: "cerniq:ai-negotiation",
    waiting: 3,
    active: 1,
    completed: 892,
    failed: 2,
    paused: true,
  },
  {
    name: "cerniq:invoice-sync",
    waiting: 0,
    active: 0,
    completed: 567,
    failed: 1,
    paused: false,
  },
];

export function Queues() {
  return (
    <div>
      <h1
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        Queue Monitor
      </h1>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.875rem",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #2a2d35" }}>
            {[
              "Queue",
              "Waiting",
              "Active",
              "Completed",
              "Failed",
              "Status",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "0.75rem",
                  textAlign: "left",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  color: "#6b6b75",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {queues.map((q) => (
            <tr key={q.name} style={{ borderBottom: "1px solid #1e2028" }}>
              <td
                style={{
                  padding: "0.75rem",
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                {q.name}
              </td>
              <td style={{ padding: "0.75rem", color: "#d4a845" }}>
                {q.waiting}
              </td>
              <td style={{ padding: "0.75rem", color: "#60a5fa" }}>
                {q.active}
              </td>
              <td style={{ padding: "0.75rem", color: "#4ade80" }}>
                {q.completed.toLocaleString()}
              </td>
              <td
                style={{
                  padding: "0.75rem",
                  color: q.failed > 10 ? "#ef4444" : "#6b6b75",
                }}
              >
                {q.failed}
              </td>
              <td style={{ padding: "0.75rem" }}>
                <span
                  style={{
                    padding: "0.15rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.7rem",
                    background: q.paused
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(74,222,128,0.15)",
                    color: q.paused ? "#ef4444" : "#4ade80",
                  }}
                >
                  {q.paused ? "PAUSED" : "ACTIVE"}
                </span>
              </td>
              <td style={{ padding: "0.75rem" }}>
                <button
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #2a2d35",
                    background: "transparent",
                    color: "#a0a0a8",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  {q.paused ? "Resume" : "Pause"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
