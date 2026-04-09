/**
 * Cost governance LLM — praguri zilnice per tier (Plan FAZA 13 routing).
 *
 * Cheltuiala zilnică estimată (USD) se poate cumula în Redis (`incrementLlmSpendDayUsd`);
 * decizia de downgrade folosește `shouldDowngradeLlmToSelfHostedFast`.
 * Spike orar: `incrementLlmSpendHourUsd` + verificare în `llm-fallback` (`assertLlmFrontierHourlySpendNoSpike`).
 */

export type TenantLlmSpendTier = "SMALL" | "MEDIUM" | "ENTERPRISE";

/** Interfață minimă Redis (ex. ioredis) pentru citire cheltuială zilnică. */
export type RedisStringGet = {
  get(key: string): Promise<string | null>;
};

export type RedisIncrFloatExpire = {
  incrbyfloat(key: string, increment: number): Promise<string>;
  expire(key: string, seconds: number): Promise<number>;
};

export function utcDateYmdUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Cap zilnic în USD (frontier); self-hosted infraq ≈ 0. */
export const LLM_DAILY_CAP_USD: Readonly<Record<TenantLlmSpendTier, number>> = {
  SMALL: 10,
  MEDIUM: 50,
  ENTERPRISE: 500,
};

/** La 80% din cap, recomandare downgrade la fast / self-hosted (Plan). */
export const LLM_COST_DOWNGRADE_THRESHOLD_RATIO = 0.8;

export function redisLlmSpendDayKey(tenantId: string, isoDateUtc: string): string {
  return `llm:spend:usd:day:${tenantId}:${isoDateUtc}`;
}

/** Bucket orar UTC, ex. `2026-04-06T14` (din ISO). */
export function utcHourBucketUtc(now = new Date()): string {
  return now.toISOString().slice(0, 13);
}

export function redisLlmSpendHourKey(tenantId: string, hourBucket: string): string {
  return `llm:spend:usd:hour:${tenantId}:${hourBucket}`;
}

/**
 * Prag spike orar (USD) pentru apeluri frontier — depășire blochează fallback-ul
 * și forțează self-hosted / HITL (Plan §XIII).
 */
export const LLM_HOURLY_SPIKE_CAP_USD: Readonly<Record<TenantLlmSpendTier, number>> = {
  SMALL: 5,
  MEDIUM: 20,
  ENTERPRISE: 150,
};

/** `isoDateUtc` format YYYY-MM-DD (UTC). */
export function shouldDowngradeLlmToSelfHostedFast(params: {
  spentUsdDay: number;
  tier: TenantLlmSpendTier;
  thresholdRatio?: number;
}): boolean {
  const cap = LLM_DAILY_CAP_USD[params.tier];
  const ratio = params.thresholdRatio ?? LLM_COST_DOWNGRADE_THRESHOLD_RATIO;
  return params.spentUsdDay >= cap * ratio;
}

export async function getLlmSpendDayUsd(
  redis: RedisStringGet,
  tenantId: string,
  isoDateUtc?: string,
): Promise<number> {
  const d = isoDateUtc ?? utcDateYmdUtc();
  const key = redisLlmSpendDayKey(tenantId, d);
  const v = await redis.get(key);
  return v ? Number.parseFloat(v) : 0;
}

export async function getLlmSpendHourUsd(
  redis: RedisStringGet,
  tenantId: string,
  hourBucket?: string,
): Promise<number> {
  const b = hourBucket ?? utcHourBucketUtc();
  const key = redisLlmSpendHourKey(tenantId, b);
  const v = await redis.get(key);
  return v ? Number.parseFloat(v) : 0;
}

export async function incrementLlmSpendHourUsd(
  redis: RedisStringGet & RedisIncrFloatExpire,
  tenantId: string,
  deltaUsd: number,
): Promise<number> {
  if (deltaUsd <= 0) {
    return getLlmSpendHourUsd(redis, tenantId);
  }
  const key = redisLlmSpendHourKey(tenantId, utcHourBucketUtc());
  const after = await redis.incrbyfloat(key, deltaUsd);
  await redis.expire(key, 48 * 3600);
  return Number.parseFloat(after);
}

/**
 * Incrementează counterul zilnic (USD) și setează TTL scurt (retenție câteva zile).
 */
export async function incrementLlmSpendDayUsd(
  redis: RedisStringGet & RedisIncrFloatExpire,
  tenantId: string,
  deltaUsd: number,
): Promise<number> {
  if (deltaUsd <= 0) {
    return getLlmSpendDayUsd(redis, tenantId);
  }
  const key = redisLlmSpendDayKey(tenantId, utcDateYmdUtc());
  const after = await redis.incrbyfloat(key, deltaUsd);
  await redis.expire(key, 4 * 24 * 3600);
  return Number.parseFloat(after);
}

export async function resolveLlmSpendDowngradeState(params: {
  redis: RedisStringGet;
  tenantId: string;
  tier: TenantLlmSpendTier;
}): Promise<{ spentUsdDay: number; downgradeToFast: boolean }> {
  const spentUsdDay = await getLlmSpendDayUsd(params.redis, params.tenantId);
  const downgradeToFast = shouldDowngradeLlmToSelfHostedFast({
    spentUsdDay,
    tier: params.tier,
  });
  return { spentUsdDay, downgradeToFast };
}
