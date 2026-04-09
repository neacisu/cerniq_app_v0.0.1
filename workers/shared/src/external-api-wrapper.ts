import { getProviderBreaker } from "./circuit-breaker.js";
import { acquireProviderRateLimit } from "./rate-limiter.js";
import { withExternalApiMetrics } from "./metrics.js";

/**
 * Apel unic către API-uri externe: rate limit (per proces worker) + circuit breaker
 * partajat pe provider + metrici Prometheus (`withExternalApiMetrics`).
 */
export async function callExternalApi<T>(provider: string, fn: () => Promise<T>): Promise<T> {
  await acquireProviderRateLimit(provider);
  const breaker = getProviderBreaker(provider);
  return withExternalApiMetrics(provider, () => breaker.fire(fn) as Promise<T>);
}
