/**
 * Centralized API client with JWT auto-injection.
 * Use for all authenticated requests to the API.
 */
import { getApiBase, requestRedirectToLogin } from "./api-url.js";

const STORAGE_KEY = "cerniq_token";
const USER_KEY = "cerniq_user";
const AUTH_PREFIX = "/api/v1/auth";

function persistAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
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

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  allowRetry = true,
): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith("http")
    ? path
    : `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options?.headers as HeadersInit);
  const authHeaders = getAuthHeaders();
  for (const [k, v] of Object.entries(authHeaders)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  if (shouldSetJsonContentType(options?.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers, credentials: "include" });

  if (res.status === 401 && typeof window !== "undefined" && allowRetry && !isAuthUrl(url)) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      const retryHeaders = new Headers(options?.headers as HeadersInit);
      retryHeaders.set("Authorization", `Bearer ${nextToken}`);
      return apiFetch<T>(
        path,
        {
          ...options,
          headers: retryHeaders,
        },
        false,
      );
    }
  }

  if (res.status === 401 && typeof window !== "undefined" && !isAuthUrl(url)) {
    clearStoredAuth();
    requestRedirectToLogin();
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // keep as text
    }
    const message =
      data && typeof data === "object"
        ? String(
            "error" in data
              ? (data as { error: unknown }).error
              : "message" in data
                ? (data as { message: unknown }).message
                : res.statusText,
          )
        : res.statusText;
    throw new ApiError(message || `API ${res.status}`, res.status, data);
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
    apiFetch<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
