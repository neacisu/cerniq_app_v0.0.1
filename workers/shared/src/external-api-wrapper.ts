import { getProviderBreaker } from "./circuit-breaker.js";
import { acquireProviderRateLimit } from "./rate-limiter.js";
import { withExternalApiMetrics } from "./metrics.js";

/**
 * I5 — Semnal operațional: metrici Prometheus + tranziții în `createCircuitBreaker` (Pino).
 * `getProviderBreaker` nu loghează separat fiecare eșec (evită triplare cu clienții HTTP care
 * au deja `createServiceLogger`); trips agregate = `circuit_breaker_*` + evenimente breaker.
 *
 * Apel unic către API-uri externe: rate limit (per proces worker) + circuit breaker
 * partajat pe provider + metrici Prometheus (`withExternalApiMetrics`).
 */
export async function callExternalApi<T>(provider: string, fn: () => Promise<T>): Promise<T> {
  await acquireProviderRateLimit(provider);
  const breaker = getProviderBreaker(provider);
  return withExternalApiMetrics(provider, () => breaker.fire(fn) as Promise<T>);
}
