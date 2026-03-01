/**
 * Base URL for the main Cerniq API (used for /api/admin/* proxy and /health/*).
 * Set VITE_API_URL at build time to override. Otherwise derived from current host:
 * admin.staging.cerniq.app -> https://api.staging.cerniq.app, admin.cerniq.app -> https://api.cerniq.app.
 */
function getApiBase(): string {
  const env = import.meta.env as { VITE_API_URL?: string; DEV?: boolean };
  if (env.VITE_API_URL) return env.VITE_API_URL.replace(/\/$/, "");
  if (env.DEV) return "http://localhost:64010";
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname.replace(/^admin\./, "api.");
    const proto = window.location.protocol || "https:";
    return `${proto}//${host}`;
  }
  return "";
}

export const apiBase = getApiBase();

export async function fetchQueues(): Promise<{
  success: boolean;
  data?: Array<{
    name: string;
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
    delayed?: number;
  }>;
}> {
  const res = await fetch(`${apiBase}/api/admin/queues`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    let errBody: unknown = text;
    try {
      errBody = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new Error(
      typeof errBody === "object" && errBody !== null && "error" in errBody
        ? String((errBody as { error: unknown }).error)
        : `HTTP ${res.status}`,
    );
  }
  return res.json();
}

export async function fetchSystemMetrics(): Promise<{
  success: boolean;
  data?: {
    cpu?: { count?: number; loadAvg?: number[] };
    memory?: { used?: number; total?: number; usagePercent?: string };
    uptime?: number;
    hostname?: string;
  };
}> {
  const res = await fetch(`${apiBase}/api/admin/system/metrics`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    let errBody: unknown = text;
    try {
      errBody = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new Error(
      typeof errBody === "object" && errBody !== null && "error" in errBody
        ? String((errBody as { error: unknown }).error)
        : `HTTP ${res.status}`,
    );
  }
  return res.json();
}

export async function fetchHealthDeps(): Promise<{
  status: string;
  dependencies?: {
    database?: { status: string; latencyMs: number };
    redis?: { status: string; latencyMs: number };
  };
}> {
  const res = await fetch(`${apiBase}/health/deps`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    let errBody: unknown = text;
    try {
      errBody = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new Error(
      typeof errBody === "object" && errBody !== null && "error" in errBody
        ? String((errBody as { error: unknown }).error)
        : `HTTP ${res.status}`,
    );
  }
  return res.json();
}

export async function pauseResumeQueue(
  queue: string,
  action: "pause" | "resume",
  adminKey: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${apiBase}/api/admin/control/pause`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ queue, action }),
  });
  if (!res.ok) {
    const text = await res.text();
    let errBody: unknown = text;
    try {
      errBody = JSON.parse(text);
    } catch {
      // keep as text
    }
    throw new Error(
      typeof errBody === "object" && errBody !== null && "error" in errBody
        ? String((errBody as { error: unknown }).error)
        : `HTTP ${res.status}`,
    );
  }
  return res.json();
}
