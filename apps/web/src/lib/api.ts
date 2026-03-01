/**
 * Centralized API client with JWT auto-injection.
 * Use for all authenticated requests to the API.
 */
import { getApiBase, requestRedirectToLogin } from "./api-url.js";

const STORAGE_KEY = "cerniq_token";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith("http")
    ? path
    : `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options?.headers as HeadersInit);
  const authHeaders = getAuthHeaders();
  for (const [k, v] of Object.entries(authHeaders)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined" && !url.includes("/auth/login")) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("cerniq_user");
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
