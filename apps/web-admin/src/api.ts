type AdminUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  tenantId?: string;
};

const TOKEN_KEY = "cerniq_admin_token";
const USER_KEY = "cerniq_admin_user";
const AUTH_PREFIX = "/api/v1/auth";
const ADMIN_ROLES = new Set(["admin", "owner", "superadmin"]);

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

export function getStoredAdminToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}

export function getStoredAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function persistAdminAuth(token: string | null, user: AdminUser | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function clearAdminAuth() {
  persistAdminAuth(null, null);
}

function isAuthPath(url: string): boolean {
  return (
    url.includes(`${AUTH_PREFIX}/login`) ||
    url.includes(`${AUTH_PREFIX}/refresh`) ||
    url.includes(`${AUTH_PREFIX}/logout`)
  );
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAdminToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${apiBase}${AUTH_PREFIX}/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        clearAdminAuth();
        return null;
      }
      const body = (await res.json()) as {
        success?: boolean;
        data?: { token?: string };
      };
      const token = body?.data?.token ?? null;
      persistAdminAuth(token, getStoredAdminUser());
      return token;
    } catch {
      clearAdminAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function adminFetch<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  const token = getStoredAdminToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && allowRetry && !isAuthPath(url)) {
    const nextToken = await refreshAdminToken();
    if (nextToken) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${nextToken}`);
      return adminFetch<T>(path, { ...init, headers: retryHeaders }, false);
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let errorBody: unknown = text;
    try {
      errorBody = JSON.parse(text);
    } catch {
      // Keep text.
    }
    const message =
      typeof errorBody === "object" && errorBody !== null && "error" in errorBody
        ? String((errorBody as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function loginAdmin(email: string, password: string) {
  const res = await adminFetch<{
    success?: boolean;
    error?: string;
    data?: { token?: string; user?: AdminUser };
  }>(`${AUTH_PREFIX}/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token = res?.data?.token ?? null;
  const user = res?.data?.user ?? null;
  if (!res?.success || !token || !user) {
    throw new Error(res?.error ?? "Login failed");
  }
  if (!user.role || !ADMIN_ROLES.has(user.role)) {
    throw new Error("Forbidden");
  }

  persistAdminAuth(token, user);
  return { token, user };
}

export async function logoutAdmin() {
  try {
    await adminFetch(`${AUTH_PREFIX}/logout`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  } finally {
    clearAdminAuth();
  }
}

export async function fetchQueues(): Promise<{
  success: boolean;
  data?: Array<{
    name: string;
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
    delayed?: number;
    paused?: boolean;
    throughput?: number;
    latency?: number;
  }>;
}> {
  return adminFetch("/api/admin/queues");
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
  return adminFetch("/api/admin/system/metrics");
}

export async function fetchHealthDeps(): Promise<{
  status: string;
  dependencies?: {
    database?: { status: string; latencyMs: number };
    redis?: { status: string; latencyMs: number };
  };
}> {
  return adminFetch("/health/deps");
}

export async function fetchLiveMetrics(): Promise<{
  success: boolean;
  data?: {
    timestamp: number;
    queues: Array<Record<string, unknown>>;
    system: Record<string, unknown> | null;
  };
}> {
  return adminFetch("/api/admin/live");
}

async function postQueueAction(
  queue: string,
  action: "pause" | "resume" | "retry-failed" | "drain",
) {
  return adminFetch<{ success: boolean; data?: Record<string, unknown> }>(
    `/api/admin/queues/${encodeURIComponent(queue)}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function pauseQueue(queue: string) {
  return postQueueAction(queue, "pause");
}

export function resumeQueue(queue: string) {
  return postQueueAction(queue, "resume");
}

export function retryFailedQueue(queue: string) {
  return postQueueAction(queue, "retry-failed");
}

export function drainQueue(queue: string) {
  return postQueueAction(queue, "drain");
}
