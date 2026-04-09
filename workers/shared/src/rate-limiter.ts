export type RateLimitConfig = {
  max: number;
  duration: number;
};

const providerRateLimits: Record<string, RateLimitConfig> = {
  anaf: { max: 1, duration: 1000 },
  termene: { max: 20, duration: 1000 },
  hunter: { max: 15, duration: 1000 },
  zerobounce: { max: 100, duration: 1000 },
  onrc: { max: 10, duration: 1000 },
  xai: { max: 60, duration: 60000 },
  nominatim: { max: 1, duration: 1000 },
  hlr: { max: 10, duration: 1000 },
  scraping: { max: 1, duration: 2000 },
  instantly: { max: 30, duration: 60000 },
  timelinesai: { max: 60, duration: 60000 },
  resend: { max: 20, duration: 1000 },
  "infraq-reasoning": { max: 10, duration: 60000 },
  "infraq-embeddings": { max: 60, duration: 60000 },
};

export function getRateLimitForProvider(provider: string): RateLimitConfig | undefined {
  return providerRateLimits[provider];
}

type WindowState = { windowStart: number; count: number };

const rateWindows = new Map<string, WindowState>();

/**
 * Limite fixe pe fereastră (ms), în memorie — un proces worker = o instanță.
 * Fără config pentru provider → fără așteptare.
 */
export async function acquireProviderRateLimit(provider: string): Promise<void> {
  const cfg = getRateLimitForProvider(provider);
  if (!cfg) return;

  const tick = (): Promise<void> =>
    new Promise((resolve) => {
      setImmediate(resolve);
    });

  for (;;) {
    const now = Date.now();
    let state = rateWindows.get(provider);
    if (!state || now - state.windowStart >= cfg.duration) {
      state = { windowStart: now, count: 0 };
      rateWindows.set(provider, state);
    }
    if (state.count < cfg.max) {
      state.count += 1;
      return;
    }
    const waitMs = Math.max(0, cfg.duration - (now - state.windowStart));
    await new Promise((r) => setTimeout(r, waitMs));
    await tick();
  }
}
