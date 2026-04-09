/**
 * Înregistrare cheltuială LLM frontier (Grok / GPT-4o) în Redis + metrici Prometheus.
 * Self-hosted infraq primary nu incrementează acest counter (cost ≈ 0 în plan).
 */

import Redis from "ioredis";
import {
  getRedisConnectionOptions,
  incrementLlmSpendDayUsd,
  incrementLlmSpendHourUsd,
  recordLlmCostUsd,
  type RedisIncrFloatExpire,
  type RedisStringGet,
  type TenantLlmSpendTier,
} from "@cerniq/worker-shared";

let cached: Redis | null | undefined;

export function resolveE3LlmSpendGuard(
  tenantId: string | undefined,
  tier: TenantLlmSpendTier = "MEDIUM",
): {
  redis: RedisStringGet & RedisIncrFloatExpire;
  tenantId: string;
  tier: TenantLlmSpendTier;
} | null {
  if (!tenantId?.trim()) return null;
  const r = getOptionalRedis();
  if (!r) return null;
  return { redis: r, tenantId, tier };
}

function getOptionalRedis(): Redis | null {
  if (cached !== undefined) return cached;
  try {
    cached = new Redis(getRedisConnectionOptions());
  } catch {
    cached = null;
  }
  return cached;
}

/** Estimare conservatoare pentru buget zilnic (nu înlocuiește facturarea furnizorului). */
export function estimateFrontierReasoningCostUsd(
  modelUsed: string,
  promptLen: number,
  outputLen: number,
): number {
  const pinK = promptLen / 4 / 1000;
  const outK = outputLen / 4 / 1000;
  if (modelUsed.includes("grok")) return pinK * 0.002 + outK * 0.01;
  if (modelUsed.includes("gpt-4")) return pinK * 0.0025 + outK * 0.01;
  if (modelUsed.includes("claude")) return pinK * 0.003 + outK * 0.015;
  if (modelUsed.includes("gemini")) return pinK * 0.0002 + outK * 0.0006;
  if (modelUsed.includes("deepseek")) return pinK * 0.00014 + outK * 0.00028;
  return pinK * 0.002 + outK * 0.01;
}

/**
 * Mapare model → etichetă furnizor pentru `recordLlmCostUsd` (metrici, fără PII).
 * Ordinea ramurilor reflectă suprapuneri posibile (ex. nume care conțin substring-uri comune).
 */
export function classifyFrontierSpendProvider(modelUsed: string): string {
  const m = modelUsed.toLowerCase();
  if (m.includes("grok") || m.includes("xai")) return "xai";
  if (m.includes("gpt")) return "openai";
  if (m.includes("claude")) return "anthropic";
  if (m.includes("gemini") || m.includes("google")) return "google";
  if (m.includes("deepseek")) return "deepseek";
  return "frontier";
}

export async function noteFrontierReasoningSpend(
  tenantId: string | undefined,
  modelUsed: string,
  promptLen: number,
  outputLen: number,
): Promise<void> {
  if (!tenantId) return;
  const usd = estimateFrontierReasoningCostUsd(modelUsed, promptLen, outputLen);
  if (usd <= 0) return;
  recordLlmCostUsd(classifyFrontierSpendProvider(modelUsed), tenantId, usd);
  const r = getOptionalRedis();
  if (!r) return;
  try {
    await incrementLlmSpendDayUsd(r, tenantId, usd);
    await incrementLlmSpendHourUsd(r, tenantId, usd);
  } catch (err) {
    console.warn("[e3-llm-spend] increment Redis failed", err);
  }
}
