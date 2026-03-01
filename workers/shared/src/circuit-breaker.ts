import CircuitBreaker from "opossum";

const DEFAULT_OPTIONS = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

export function createCircuitBreaker<T>(
  fn: (...args: unknown[]) => Promise<T>,
  name: string,
  options?: Partial<typeof DEFAULT_OPTIONS>,
) {
  const breaker = new CircuitBreaker(fn, {
    ...DEFAULT_OPTIONS,
    ...options,
    name,
  });

  breaker.on("open", () => console.warn(`[CircuitBreaker:${name}] opened`));
  breaker.on("halfOpen", () => console.info(`[CircuitBreaker:${name}] half-open`));
  breaker.on("close", () => console.info(`[CircuitBreaker:${name}] closed`));

  return breaker;
}
