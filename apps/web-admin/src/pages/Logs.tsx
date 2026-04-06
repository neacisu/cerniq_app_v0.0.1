import { useEffect, useState } from "react";
import { fetchAdminLogs } from "../api.js";

type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
};

const LOGS_LEVEL_FILTER_ID = "admin-logs-level-filter";

function logEntryRowKey(entry: LogEntry): string {
  return [entry.timestamp, entry.level, entry.message, entry.source ?? ""].join("\u001d");
}

function levelBadgeBackground(level: string | undefined): string {
  const normalized = level?.toLowerCase();
  if (normalized === "error") return "rgba(239,68,68,0.2)";
  if (normalized === "warn") return "rgba(234,179,8,0.2)";
  return "rgba(75,85,99,0.3)";
}

export function Logs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminLogs(100);
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) setEntries(res.data);
        else setEntries([]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load logs");
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filtered =
    levelFilter === "all"
      ? entries
      : entries.filter((e) => e.level?.toLowerCase() === levelFilter.toLowerCase());

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        Logs
      </h1>
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <label htmlFor={LOGS_LEVEL_FILTER_ID} style={{ fontSize: "0.875rem", color: "#6b6b75" }}>
          Level:
        </label>
        <select
          id={LOGS_LEVEL_FILTER_ID}
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid #2a2d35",
            background: "#16181d",
            color: "#e5e5e7",
            fontSize: "0.875rem",
          }}
        >
          <option value="all">All</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
      </div>
      {loading && entries.length === 0 && <p style={{ color: "#6b6b75" }}>Loading…</p>}
      {error && (
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>
          {error}. Verifică proxy-ul Fastify `/api/admin/logs` și Monitoring API.
        </p>
      )}
      <div
        style={{
          border: "1px solid #2a2d35",
          borderRadius: "0.75rem",
          overflow: "hidden",
          background: "rgba(22,24,30,0.8)",
        }}
      >
        {filtered.length === 0 && !loading && (
          <p style={{ padding: "2rem", color: "#6b6b75", textAlign: "center" }}>
            No log entries. Connect Loki or enable log API in Monitoring API.
          </p>
        )}
        {filtered.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2d35" }}>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#6b6b75" }}>
                  Time
                </th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#6b6b75" }}>
                  Level
                </th>
                <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#6b6b75" }}>
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={logEntryRowKey(entry)}
                  style={{
                    borderBottom: "1px solid #1e2025",
                  }}
                >
                  <td style={{ padding: "0.5rem 0.75rem", color: "#6b6b75" }}>{entry.timestamp}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <span
                      style={{
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        background: levelBadgeBackground(entry.level),
                      }}
                    >
                      {entry.level}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "#a0a0a8" }}>{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
