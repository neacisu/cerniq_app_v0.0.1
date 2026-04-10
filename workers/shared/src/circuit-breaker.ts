import CircuitBreaker from "opossum";
import { createServiceLogger } from "@cerniq/observability";
import { Counter, Gauge } from "prom-client";
import { metricsRegistry } from "./metrics.js";

const cbLog = createServiceLogger("circuit-breaker-generic");

const DEFAULT_OPTIONS = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

/** Opțiuni per provider — aliniat la plan cognitive_neural_brain (martie 2026) + `queue-registry`. */
const PROVIDER_BREAKER_OPTIONS: Record<string, Partial<typeof DEFAULT_OPTIONS>> = {
  anaf: { timeout: 15000, errorThresholdPercentage: 30, resetTimeout: 60000 },
  termene: { timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  onrc: { timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  hunter: { timeout: 8000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  zerobounce: { timeout: 8000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  nominatim: { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 60000 },
  /** Apeluri către gateway xAI self-hosted (enrichment `xai-client`). */
  xai: { timeout: 30000, errorThresholdPercentage: 20, resetTimeout: 120000 },
  instantly: { timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  timelinesai: { timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  hlr: { timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  scraping: { timeout: 20000, errorThresholdPercentage: 30, resetTimeout: 120000 },
  resend: { timeout: 8000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  /** Trebuie să acopere `AbortSignal.timeout(120_000)` din `infraq-structured-json`. */
  "infraq-reasoning": { timeout: 120000, errorThresholdPercentage: 20, resetTimeout: 120000 },
  /** Apeluri HTTP de la API către monitoring-api (cozi, metrici). */
  "monitoring-internal": { timeout: 15000, errorThresholdPercentage: 50, resetTimeout: 30000 },
  /** Apeluri embeddings batch — păstrăm latență mai mare decât xAI chat. */
  "infraq-embeddings": { timeout: 60000, errorThresholdPercentage: 20, resetTimeout: 120000 },
};

const circuitBreakerState = new Gauge({
  name: "cerniq_circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 1=open, 2=halfOpen)",
  labelNames: ["provider"],
  registers: [metricsRegistry],
});

const circuitBreakerTrips = new Counter({
  name: "cerniq_circuit_breaker_trips_total",
  help: "Total circuit breaker trips (opened)",
  labelNames: ["provider"],
  registers: [metricsRegistry],
});

/** Runner unic: argumentul este funcția efectivă a apelului curent (partajă starea CB pe provider). */
async function externalCallRunner<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

function wireBreakerMetrics(breaker: InstanceType<typeof CircuitBreaker>, provider: string): void {
  breaker.on("open", () => {
    circuitBreakerState.set({ provider }, 1);
    circuitBreakerTrips.inc({ provider });
  });
  breaker.on("halfOpen", () => {
    circuitBreakerState.set({ provider }, 2);
  });
  breaker.on("close", () => {
    circuitBreakerState.set({ provider }, 0);
  });
}

const breakers = new Map<string, InstanceType<typeof CircuitBreaker>>();

export function getProviderBreaker(provider: string): InstanceType<typeof CircuitBreaker> {
  let breaker = breakers.get(provider);
  if (!breaker) {
    const opts = {
      ...DEFAULT_OPTIONS,
      ...PROVIDER_BREAKER_OPTIONS[provider],
      name: provider,
    };
    breaker = new CircuitBreaker(
      externalCallRunner as (fn: () => Promise<unknown>) => Promise<unknown>,
      opts,
    );
    circuitBreakerState.set({ provider }, 0);
    wireBreakerMetrics(breaker, provider);
    breakers.set(provider, breaker);
  }
  return breaker;
}

export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string,
  options?: Partial<typeof DEFAULT_OPTIONS>,
) {
  const breaker = new CircuitBreaker(fn as (...args: unknown[]) => Promise<TResult>, {
    ...DEFAULT_OPTIONS,
    ...options,
    name,
  });

  breaker.on("open", () => {
    cbLog.warn({ event: "circuit_breaker_open", breakerName: name });
  });
  breaker.on("halfOpen", () => {
    cbLog.info({ event: "circuit_breaker_half_open", breakerName: name });
  });
  breaker.on("close", () => {
    cbLog.info({ event: "circuit_breaker_closed", breakerName: name });
  });

  return breaker as unknown as {
    fire(...args: TArgs): Promise<TResult>;
    on(event: string, listener: (...args: unknown[]) => void): void;
    opened: boolean;
    closed: boolean;
    halfOpen: boolean;
  };
}
