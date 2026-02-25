import { useEffect, useRef, useState } from "react";
import { fetchQueues, fetchSystemMetrics } from "../api";
import { useWebSocket } from "../hooks/useWebSocket";

type QueueRow = {
  name: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
};

type WsPayload = {
  type?: string;
  queues?: QueueRow[];
  metrics?: {
    cpu?: { loadAvg?: number[] };
    memory?: { used?: number; total?: number; usagePercent?: string };
  };
};

export function Dashboard() {
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [metrics, setMetrics] = useState<{
    cpu?: { loadAvg?: number[] };
    memory?: { used?: number; total?: number; usagePercent?: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { state: wsState } = useWebSocket<WsPayload>((data) => {
    if (Array.isArray(data?.queues)) setQueues(data.queues);
    if (data?.metrics) setMetrics(data.metrics);
  });
  const wsStateRef = useRef(wsState);
  wsStateRef.current = wsState;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [qRes, mRes] = await Promise.all([fetchQueues(), fetchSystemMetrics()]);
        if (cancelled) return;
        if (qRes.success && Array.isArray(qRes.data)) {
          setQueues(qRes.data);
        } else {
          setQueues([]);
        }
        if (mRes.success && mRes.data) {
          setMetrics(mRes.data);
        } else {
          setMetrics(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const intervalMs = wsStateRef.current === "connected" ? 30000 : 10000;
    const interval = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const totalJobs =
    queues.reduce((s, q) => s + (q.completed ?? 0) + (q.waiting ?? 0) + (q.active ?? 0), 0) || 0;
  const totalFailed = queues.reduce((s, q) => s + (q.failed ?? 0), 0);
  const activeQueues = queues.filter((q) => (q.waiting ?? 0) + (q.active ?? 0) > 0).length;

  const cards = [
    { label: "Active Queues", value: String(activeQueues), color: "#4ade80" },
    {
      label: "Total Jobs",
      value: totalJobs.toLocaleString(),
      color: "#d4a845",
    },
    { label: "Failed Jobs", value: String(totalFailed), color: "#ef4444" },
    {
      label: "Memory",
      value: metrics?.memory?.usagePercent ? `${metrics.memory.usagePercent}%` : "—",
      color: "#60a5fa",
    },
  ];

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
          Admin Dashboard
        </h1>
        <p style={{ color: "#6b6b75" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
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
        <p style={{ color: "#ef4444" }}>{error}</p>
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
          Queue summary (Monitoring API)
          {wsState === "connected" && (
            <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "#4ade80" }}>
              • Live
            </span>
          )}
        </h3>
        {queues.length === 0 ? (
          <p style={{ color: "#6b6b75", fontSize: "0.875rem" }}>
            No queue data yet. Ensure Monitoring API is running and Redis is reachable.
          </p>
        ) : (
          <p style={{ color: "#a0a0a8", fontSize: "0.875rem" }}>
            {queues.length} queue(s) • Load avg:{" "}
            {metrics?.cpu?.loadAvg?.slice(0, 3).join(", ") ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}
