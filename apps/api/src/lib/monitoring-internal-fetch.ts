/**
 * Apeluri către monitoring-api prin circuit breaker (`monitoring-internal` în worker-shared).
 */
import { getCorrelationStore } from "@cerniq/observability";
import { getProviderBreaker } from "@cerniq/worker-shared";
import { envConfig } from "../config.js";
import { httpClientRequestDurationSeconds } from "../plugins/metrics.js";

function baseUrl(): string {
  return envConfig.MONITORING_API_INTERNAL_URL.replace(/\/$/, "");
}

export type MonitoringInternalFetchOptions = {
  /**
   * Bearer JWT al utilizatorului autentificat (același `JWT_SECRET` ca monitoring-api).
   * Folosit când `ADMIN_KEY` lipsește în env — altfel Monitoring API răspunde 401 la apelurile interne.
   */
  incomingAuthorization?: string;
};

/**
 * `fetch` intern: `x-admin-key` din `ADMIN_KEY` dacă e setat; altfel `Authorization` din apelul API (viewer+ pentru GET, admin pentru control cozi).
 */
export async function monitoringInternalFetch(
  path: string,
  init: RequestInit = {},
  options?: MonitoringInternalFetchOptions,
): Promise<Response> {
  const breaker = getProviderBreaker("monitoring-internal");
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("x-admin-key") && envConfig.ADMIN_KEY) {
    headers.set("x-admin-key", envConfig.ADMIN_KEY);
  }
  const incoming = options?.incomingAuthorization?.trim();
  if (!headers.has("Authorization") && incoming?.startsWith("Bearer ") && !envConfig.ADMIN_KEY) {
    headers.set("Authorization", incoming);
  }
  const correlationId = getCorrelationStore()?.correlationId;
  if (correlationId && !headers.has("x-correlation-id")) {
    headers.set("x-correlation-id", correlationId);
  }
  const method = (init.method ?? "GET").toUpperCase();
  const started = performance.now();
  const res = await breaker.fire(async () =>
    fetch(`${baseUrl()}${path}`, {
      ...init,
      headers,
    }),
  );
  const durationSec = (performance.now() - started) / 1000;
  /**
   * prom-client 15: `exemplarLabels` trebuie să fie `LabelValues<"method"|"peer_service">`,
   * nu chei arbitrare (`trace_id`). Exemplare cu trace rămân pe span-uri OTEL, nu pe histogramă.
   */
  httpClientRequestDurationSeconds.observe({
    value: durationSec,
    labels: { method, peer_service: "monitoring_api" },
  });
  return res as Response;
}
