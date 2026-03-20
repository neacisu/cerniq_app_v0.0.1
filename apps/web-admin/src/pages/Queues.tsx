import { useEffect, useState } from "react";
import { drainQueue, fetchQueues, pauseQueue, resumeQueue, retryFailedQueue } from "../api";

type QueueRow = {
  name: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: boolean;
};

export function Queues() {
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyQueue, setBusyQueue] = useState<string | null>(null);

  async function runAction(name: string, action: "pause" | "resume" | "retry-failed" | "drain") {
    setBusyQueue(`${name}:${action}`);
    try {
      if (action === "pause") await pauseQueue(name);
      if (action === "resume") await resumeQueue(name);
      if (action === "retry-failed") await retryFailedQueue(name);
      if (action === "drain") await drainQueue(name);
      const res = await fetchQueues();
      if (res.success && Array.isArray(res.data)) setQueues(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue action failed");
    } finally {
      setBusyQueue(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetchQueues();
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          setQueues(res.data);
        } else {
          setQueues([]);
        }
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load queues");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && queues.length === 0) {
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
        Queue Monitor
      </h1>
      {error && <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.875rem",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #2a2d35" }}>
            {["Queue", "Waiting", "Active", "Completed", "Failed", "Status", "Actions"].map((h) => (
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
          {queues.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                style={{
                  padding: "1.5rem",
                  color: "#6b6b75",
                  textAlign: "center",
                }}
              >
                No queues. Monitoring API may be starting or Redis has no BullMQ queues.
              </td>
            </tr>
          ) : (
            queues.map((q) => (
              <tr key={q.name} style={{ borderBottom: "1px solid #1e2028" }}>
                <td
                  style={{
                    padding: "0.75rem",
                    fontFamily: "'Geist Mono', monospace",
                  }}
                >
                  {q.name}
                </td>
                <td style={{ padding: "0.75rem", color: "#d4a845" }}>{q.waiting ?? 0}</td>
                <td style={{ padding: "0.75rem", color: "#60a5fa" }}>{q.active ?? 0}</td>
                <td style={{ padding: "0.75rem", color: "#4ade80" }}>
                  {(q.completed ?? 0).toLocaleString()}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    color: (q.failed ?? 0) > 10 ? "#ef4444" : "#6b6b75",
                  }}
                >
                  {q.failed ?? 0}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <span
                    style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: "0.25rem",
                      fontSize: "0.7rem",
                      background: q.paused ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)",
                      color: q.paused ? "#ef4444" : "#4ade80",
                    }}
                  >
                    {q.paused ? "PAUSED" : "ACTIVE"}
                  </span>
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => void runAction(q.name, q.paused ? "resume" : "pause")}
                      disabled={busyQueue !== null}
                      style={{
                        border: "1px solid #2a2d35",
                        borderRadius: 6,
                        padding: "0.3rem 0.55rem",
                        background: "rgba(22,24,30,0.8)",
                        color: "#e5e5e7",
                        cursor: "pointer",
                      }}
                    >
                      {busyQueue === `${q.name}:${q.paused ? "resume" : "pause"}`
                        ? "..."
                        : q.paused
                          ? "Resume"
                          : "Pause"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(q.name, "retry-failed")}
                      disabled={busyQueue !== null}
                      style={{
                        border: "1px solid #2a2d35",
                        borderRadius: 6,
                        padding: "0.3rem 0.55rem",
                        background: "rgba(22,24,30,0.8)",
                        color: "#e5e5e7",
                        cursor: "pointer",
                      }}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(q.name, "drain")}
                      disabled={busyQueue !== null}
                      style={{
                        border: "1px solid #452222",
                        borderRadius: 6,
                        padding: "0.3rem 0.55rem",
                        background: "rgba(80,20,20,0.25)",
                        color: "#fca5a5",
                        cursor: "pointer",
                      }}
                    >
                      Drain
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
