/**
 * Apeluri către monitoring-api prin circuit breaker (`monitoring-internal` în worker-shared).
 */
import { trace } from "@opentelemetry/api";
import { getCorrelationStore } from "@cerniq/observability";
import { getProviderBreaker } from "@cerniq/worker-shared";
import { envConfig } from "../config.js";
import { httpClientRequestDurationSeconds } from "../plugins/metrics.js";

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
  const traceId = trace.getActiveSpan()?.spanContext().traceId;
  const exemplar =
    traceId && traceId !== "00000000000000000000000000000000" ? { trace_id: traceId } : undefined;
  if (exemplar) {
    httpClientRequestDurationSeconds.observe({
      value: durationSec,
      labels: { method, peer_service: "monitoring_api" },
      exemplarLabels: exemplar,
    } as never);
  } else {
    httpClientRequestDurationSeconds.observe(
      { method, peer_service: "monitoring_api" },
      durationSec,
    );
  }
  return res as Response;
}
