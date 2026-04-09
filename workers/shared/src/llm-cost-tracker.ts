/**
 * LLM cost tracking per tenant — Plan §XVI.B (caps SMALL/MEDIUM/ENTERPRISE).
 * Chei Redis aliniate la `llm-cost-governance.ts` (`llm:spend:usd:day:*`), nu `llm:cost:*` duplicat.
 */
import {
  LLM_DAILY_CAP_USD,
  getLlmSpendDayUsd,
  incrementLlmSpendDayUsd,
  incrementLlmSpendHourUsd,
  shouldDowngradeLlmToSelfHostedFast,
  utcDateYmdUtc,
  type RedisIncrFloatExpire,
  type RedisStringGet,
  type TenantLlmSpendTier,
} from "./llm-cost-governance.js";
import { recordLlmCostUsd } from "./metrics.js";

/** Alias plan — aceleași praguri ca `LLM_DAILY_CAP_USD`. */
export const TIER_CAPS_USD = LLM_DAILY_CAP_USD;

export class BudgetExceededError extends Error {
  readonly tenantId: string;
  readonly currentCost: number;
  readonly cap: number;

  constructor(tenantId: string, currentCost: number, cap: number) {
    super(
      `LLM budget exceeded for tenant ${tenantId}: ${currentCost.toFixed(4)} >= ${cap} USD (daily cap)`,
    );
    this.name = "BudgetExceededError";
    this.tenantId = tenantId;
    this.currentCost = currentCost;
    this.cap = cap;
  }
}

export async function checkLlmBudget(
  redis: RedisStringGet,
  tenantId: string,
  tier: TenantLlmSpendTier,
): Promise<{ downgrade: boolean; currentCost: number; cap: number; remaining: number }> {
  const today = utcDateYmdUtc();
  const currentCost = await getLlmSpendDayUsd(redis, tenantId, today);
  const cap = TIER_CAPS_USD[tier];
  if (currentCost >= cap) {
    throw new BudgetExceededError(tenantId, currentCost, cap);
  }
  const downgrade = shouldDowngradeLlmToSelfHostedFast({ spentUsdDay: currentCost, tier });
  return {
    downgrade,
    currentCost,
    cap,
    remaining: Math.max(0, cap - currentCost),
  };
}

/**
 * Înregistrează cost estimat (USD) — Redis zi/oră + metrici Prometheus pentru frontier.
 * Self-hosted infraq cu cost 0 nu incrementează `recordLlmCostUsd` (conform `metrics.ts`).
 */
export async function recordLlmCost(
  redis: RedisStringGet & RedisIncrFloatExpire,
  tenantId: string,
  costUsd: number,
  opts?: { provider?: string },
): Promise<void> {
  if (costUsd <= 0) return;
  await incrementLlmSpendDayUsd(redis, tenantId, costUsd);
  await incrementLlmSpendHourUsd(redis, tenantId, costUsd);
  const provider = opts?.provider ?? "frontier";
  recordLlmCostUsd(provider, tenantId, costUsd);
}
