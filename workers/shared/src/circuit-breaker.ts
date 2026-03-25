import CircuitBreaker from "opossum";

const DEFAULT_OPTIONS = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

export type CircuitBreakerLogger = {
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  info: (obj: Record<string, unknown>, msg?: string) => void;
};

export interface CircuitBreakerOptions extends Partial<typeof DEFAULT_OPTIONS> {
  logger?: CircuitBreakerLogger;
}

export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string,
  options?: CircuitBreakerOptions,
) {
  const { logger, ...opts } = options ?? {};
  const log: CircuitBreakerLogger = logger ?? {
    warn: (obj, msg) => console.warn(`[CircuitBreaker:${name}] ${msg ?? ""}`, obj),
    info: (obj, msg) => console.info(`[CircuitBreaker:${name}] ${msg ?? ""}`, obj),
  };

  const breaker = new CircuitBreaker(fn as (...args: unknown[]) => Promise<TResult>, {
    ...DEFAULT_OPTIONS,
    ...opts,
    name,
  });

  breaker.on("open", () => log.warn({ circuitBreaker: name, state: "OPEN" }, "Circuit breaker opened"));
  breaker.on("halfOpen", () => log.info({ circuitBreaker: name, state: "HALF_OPEN" }, "Circuit breaker half-open"));
  breaker.on("close", () => log.info({ circuitBreaker: name, state: "CLOSED" }, "Circuit breaker closed"));

  return breaker as unknown as {
    fire(...args: TArgs): Promise<TResult>;
    on(event: string, listener: (...args: unknown[]) => void): void;
    opened: boolean;
    closed: boolean;
    halfOpen: boolean;
  };
}
