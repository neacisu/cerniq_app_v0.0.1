/**
 * Apeluri către monitoring-api prin circuit breaker (`monitoring-internal` în worker-shared).
 */
import { getProviderBreaker } from "@cerniq/worker-shared";
import { envConfig } from "../config.js";

function baseUrl(): string {
  return envConfig.MONITORING_API_INTERNAL_URL.replace(/\/$/, "");
}

/**
 * `fetch` intern cu header-e implicite (ADMIN_KEY pentru proxy către monitoring-api).
 */
export async function monitoringInternalFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const breaker = getProviderBreaker("monitoring-internal");
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (envConfig.ADMIN_KEY && !headers.has("x-admin-key")) {
    headers.set("x-admin-key", envConfig.ADMIN_KEY);
  }
  const res = await breaker.fire(async () =>
    fetch(`${baseUrl()}${path}`, {
      ...init,
      headers,
    }),
  );
  return res as Response;
}
