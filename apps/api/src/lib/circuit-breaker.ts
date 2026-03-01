import CircuitBreaker from "opossum";

const DEFAULT_OPTIONS = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

export type CircuitBreakerLogger = {
  warn: (obj: object, msg?: string) => void;
  info: (obj: object, msg?: string) => void;
};

export function createCircuitBreaker<T>(
  fn: (...args: unknown[]) => Promise<T>,
  name: string,
  options?: Partial<typeof DEFAULT_OPTIONS> & { logger?: CircuitBreakerLogger },
) {
  const { logger, ...opts } = options ?? {};
  const log = logger ?? { warn: console.warn.bind(console), info: console.info.bind(console) };

  const breaker = new CircuitBreaker(fn, {
    ...DEFAULT_OPTIONS,
    ...opts,
    name,
  });

  breaker.on("open", () => log.warn({ circuitBreaker: name }, "Circuit breaker opened"));
  breaker.on("halfOpen", () => log.info({ circuitBreaker: name }, "Circuit breaker half-open"));
  breaker.on("close", () => log.info({ circuitBreaker: name }, "Circuit breaker closed"));

  return breaker;
}
