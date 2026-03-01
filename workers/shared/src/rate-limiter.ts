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
};

export function getRateLimitForProvider(provider: string): RateLimitConfig | undefined {
  return providerRateLimits[provider];
}
