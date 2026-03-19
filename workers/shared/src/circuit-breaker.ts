import CircuitBreaker from "opossum";

const DEFAULT_OPTIONS = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
};

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

  breaker.on("open", () => console.warn(`[CircuitBreaker:${name}] opened`));
  breaker.on("halfOpen", () => console.info(`[CircuitBreaker:${name}] half-open`));
  breaker.on("close", () => console.info(`[CircuitBreaker:${name}] closed`));

  return breaker as unknown as {
    fire(...args: TArgs): Promise<TResult>;
    on(event: string, listener: (...args: unknown[]) => void): void;
    opened: boolean;
    closed: boolean;
    halfOpen: boolean;
  };
}
