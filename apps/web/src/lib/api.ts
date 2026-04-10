/**
 * Centralized API client with JWT auto-injection.
 * Use for all authenticated requests to the API.
 */
import { getApiBase, requestRedirectToLogin } from "./api-url.js";
import { getSessionCorrelationId } from "./report-client-error.js";
import { toast } from "../components/ui/toast-api.js";

const STORAGE_KEY = "cerniq_token";
const USER_KEY = "cerniq_user";

// ─── React auth-state bridge ──────────────────────────────────────────────────
// api.ts is framework-agnostic; AuthProvider wires these callbacks on mount so
// that token events are reflected in React state without a circular import.
type AuthClearedListener = () => void;
type TokenRefreshedListener = (newToken: string) => void;

let _onAuthCleared: AuthClearedListener | null = null;
let _onTokenRefreshed: TokenRefreshedListener | null = null;

export function setOnAuthClearedListener(fn: AuthClearedListener | null): void {
  _onAuthCleared = fn;
}

export function setOnTokenRefreshedListener(fn: TokenRefreshedListener | null): void {
  _onTokenRefreshed = fn;
}
const AUTH_PREFIX = "/api/v1/auth";

function persistAccessToken(token: string | null) {
  if (globalThis.window === undefined) return;
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function clearStoredAuth() {
  if (globalThis.window === undefined) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_KEY);
  // Notify AuthProvider so React state is cleared immediately (prevents ProtectedRoute
  // from keeping the user on a protected page after auth expires).
  _onAuthCleared?.();
}

function getAuthHeaders(): Record<string, string> {
  const token = globalThis.window === undefined ? null : localStorage.getItem(STORAGE_KEY);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function isAuthUrl(url: string): boolean {
  return (
    url.includes(`${AUTH_PREFIX}/login`) ||
    url.includes(`${AUTH_PREFIX}/register`) ||
    url.includes(`${AUTH_PREFIX}/refresh`) ||
    url.includes(`${AUTH_PREFIX}/logout`)
  );
}

function shouldSetJsonContentType(body: BodyInit | null | undefined): boolean {
  if (body === undefined || body === null) return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) return false;
  return true;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const base = getApiBase();
    const refreshUrl = `${base.replace(/\/$/, "")}${AUTH_PREFIX}/refresh`;
    try {
      const res = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        clearStoredAuth();
        requestRedirectToLogin();
        return null;
      }
      const body = (await res.json()) as {
        success?: boolean;
        data?: { token?: string };
      };
      const token = body?.data?.token ?? null;
      persistAccessToken(token);
      // Keep AuthProvider React state in sync so getAuthHeader() returns the fresh token.
      if (token) _onTokenRefreshed?.(token);
      return token;
    } catch {
      clearStoredAuth();
      requestRedirectToLogin();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Mesaj afișabil din `unknown` (mutations, catch, query errors). */
export function messageFromUnknown(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}

function buildUrl(path: string, base: string): string {
  if (path.startsWith("http")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${normalizedPath}`;
}

function extractErrorMessage(data: unknown, statusText: string): string {
  if (data && typeof data === "object") {
    if ("error" in data) return String((data as { error: unknown }).error);
    if ("message" in data) return String((data as { message: unknown }).message);
    return statusText;
  }
  return statusText;
}

function maybeToastServerError(res: Response, data: unknown): void {
  if (globalThis.window === undefined || res.status < 500) return;
  if (data && typeof data === "object") {
    const details = (data as { details?: unknown }).details;
    if (details && typeof details === "object" && "errorId" in details) {
      const errorId = (details as { errorId?: unknown }).errorId;
      if (typeof errorId === "string" && errorId.length > 0) {
        toast.error(`Eroare server (ID: ${errorId})`);
        return;
      }
    }
  }
  if (res.status === 503) {
    toast.error("Serviciu indisponibil. Încearcă din nou.");
  }
}

async function throwApiError(res: Response): Promise<never> {
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep as text
  }
  maybeToastServerError(res, data);
  const message = extractErrorMessage(data, res.statusText);
  throw new ApiError(message || `API ${res.status}`, res.status, data);
}

async function handle401<T>(
  path: string,
  options: RequestInit | undefined,
  allowRetry: boolean,
): Promise<T> {
  if (allowRetry) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      const retryHeaders = new Headers(options?.headers as HeadersInit);
      retryHeaders.set("Authorization", `Bearer ${nextToken}`);
      return apiFetch<T>(path, { ...options, headers: retryHeaders }, false);
    }
  }
  clearStoredAuth();
  requestRedirectToLogin();
  throw new ApiError("Unauthorized", 401);
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  allowRetry = true,
): Promise<T> {
  const base = getApiBase();
  const url = buildUrl(path, base);
  const headers = new Headers(options?.headers as HeadersInit);
  const authHeaders = getAuthHeaders();
  for (const [k, v] of Object.entries(authHeaders)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  const cid = getSessionCorrelationId();
  if (cid && !headers.has("x-correlation-id")) {
    headers.set("x-correlation-id", cid);
  }
  if (shouldSetJsonContentType(options?.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers, credentials: "include" });

  if (res.status === 401 && globalThis.window !== undefined && !isAuthUrl(url)) {
    return handle401<T>(path, options, allowRetry);
  }

  if (!res.ok) {
    return throwApiError(res);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: serializeBody(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: serializeBody(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: serializeBody(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

/**
 * Returnează access token-ul JWT stocat, sau null dacă utilizatorul nu e autentificat.
 * Folosit de mecanismele care nu pot trimite Authorization header (ex: EventSource SSE).
 */
export function getStoredToken(): string | null {
  if (globalThis.window === undefined) return null;
  return localStorage.getItem(STORAGE_KEY);
}
