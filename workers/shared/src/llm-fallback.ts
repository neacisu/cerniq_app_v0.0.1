/**
 * FAZA 13 — Fallback chain + consensus voting (Plan §XIII).
 *
 * - `withLlmFallbackChain`: primary infraq, apoi fallback-uri frontier; `recordLlmFallback` per pas.
 * - `consensusStructuredVote`: majoritate 2/3 pe răspunsuri parsate cu Zod; divergență → metrică + callback HITL opțional.
 * - GDPR: date `sensitive` NU pleacă la frontier — eroare explicită.
 * - Plafon zilnic hard cap: după eșec primary, dacă spend ≥ cap → fără frontier.
 */

import OpenAI from "openai";
import { z } from "zod";
import {
  getLlmSpendDayUsd,
  getLlmSpendHourUsd,
  LLM_DAILY_CAP_USD,
  LLM_HOURLY_SPIKE_CAP_USD,
  type RedisStringGet,
  type TenantLlmSpendTier,
} from "./llm-cost-governance.js";
import { reasoningClient, INFRAQ_REASONING_MODEL } from "./llm-client.js";
import {
  llmConsensusDivergenceTotal,
  llmCostCeilingBlocksTotal,
  llmCostSpikeBlocksTotal,
  recordLlmFallback,
} from "./metrics.js";

// ── GDPR / policy ───────────────────────────────────────────────────────────

export type LlmDataSensitivity = "non_sensitive" | "sensitive";

export class LlmFrontierGdprViolation extends Error {
  constructor(
    message = "Date sensibile nu pot fi trimise către furnizori frontier LLM — folosiți exclusiv infraq.app sau HITL.",
  ) {
    super(message);
    this.name = "LlmFrontierGdprViolation";
  }
}

export function assertLlmFrontierGdprAllows(sensitivity: LlmDataSensitivity): void {
  if (sensitivity === "sensitive") {
    throw new LlmFrontierGdprViolation();
  }
}

// ── Cost ceiling (hard daily cap) ─────────────────────────────────────────────

export class LlmDailySpendCapExceededError extends Error {
  constructor(
    readonly spentUsdDay: number,
    readonly capUsd: number,
  ) {
    super(
      `LLM daily spend cap exceeded: spent=${spentUsdDay.toFixed(4)} USD >= cap=${capUsd} USD — frontier fallback blocked`,
    );
    this.name = "LlmDailySpendCapExceededError";
  }
}

export async function assertLlmDailySpendBelowHardCap(params: {
  readonly redis: RedisStringGet;
  readonly tenantId: string;
  readonly tier: TenantLlmSpendTier;
}): Promise<void> {
  const spent = await getLlmSpendDayUsd(params.redis, params.tenantId);
  const cap = LLM_DAILY_CAP_USD[params.tier];
  if (spent >= cap) {
    llmCostCeilingBlocksTotal.inc({ tier: params.tier });
    throw new LlmDailySpendCapExceededError(spent, cap);
  }
}

export class LlmFrontierHourlySpendSpikeError extends Error {
  constructor(
    readonly spentHourUsd: number,
    readonly capUsd: number,
  ) {
    super(
      `LLM hourly frontier spend spike: spent=${spentHourUsd.toFixed(4)} USD >= cap=${capUsd} USD — frontier blocked`,
    );
    this.name = "LlmFrontierHourlySpendSpikeError";
  }
}

export async function assertLlmFrontierHourlySpendNoSpike(params: {
  readonly redis: RedisStringGet;
  readonly tenantId: string;
  readonly tier: TenantLlmSpendTier;
}): Promise<void> {
  const spent = await getLlmSpendHourUsd(params.redis, params.tenantId);
  const cap = LLM_HOURLY_SPIKE_CAP_USD[params.tier];
  if (spent >= cap) {
    llmCostSpikeBlocksTotal.inc({ tier: params.tier });
    throw new LlmFrontierHourlySpendSpikeError(spent, cap);
  }
}

// ── Fallback chain ────────────────────────────────────────────────────────────

export type LlmFallbackFailureReason = "error" | "timeout" | "ratelimit";

function classifyChainError(err: unknown): LlmFallbackFailureReason {
  const msg = err instanceof Error ? err.message : String(err);
  if (/timeout|abort|ETIMEDOUT|deadline/i.test(msg)) return "timeout";
  if (/429|rate|ratelimit|too many requests/i.test(msg)) return "ratelimit";
  return "error";
}

/**
 * Încearcă `primary`; la eșec, pentru fiecare fallback înregistrează `recordLlmFallback` și încearcă următorul.
 */
export async function withLlmFallbackChain<T>(params: {
  readonly primary: () => Promise<T>;
  readonly fallbacks: ReadonlyArray<{ readonly name: string; readonly run: () => Promise<T> }>;
  /** Dacă `sensitive`, nu se execută niciun fallback frontier. */
  readonly dataSensitivity?: LlmDataSensitivity;
  /** După eșec primary: verifică plafon zilnic înainte de orice fallback. */
  readonly spendGuard?: {
    readonly redis: RedisStringGet;
    readonly tenantId: string;
    readonly tier: TenantLlmSpendTier;
  };
}): Promise<T> {
  const { primary, fallbacks, dataSensitivity = "non_sensitive", spendGuard } = params;

  try {
    return await primary();
  } catch (primaryErr) {
    if (dataSensitivity === "sensitive") {
      throw new LlmFrontierGdprViolation(
        "Primary LLM a eșuat; fallback frontier interzis pentru date sensibile (GDPR). Escaladare HITL necesară.",
      );
    }

    if (spendGuard) {
      await assertLlmDailySpendBelowHardCap(spendGuard);
      await assertLlmFrontierHourlySpendNoSpike(spendGuard);
    }

    let lastErr: unknown = primaryErr;

    for (const step of fallbacks) {
      recordLlmFallback(step.name, classifyChainError(lastErr));
      try {
        return await step.run();
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}

// ── Consensus triggers (Plan §XIII) ──────────────────────────────────────────

/** Scor credit „borderline” în jurul centrului 55 (bandă ±5 → [50,60]). */
export const LLM_CONSENSUS_CREDIT_BORDERLINE_CENTER = 55;
export const LLM_CONSENSUS_CREDIT_BORDERLINE_BAND = 5;

export function shouldTriggerLlmConsensusVote(ctx: {
  readonly discountPct?: number;
  readonly creditScore?: number;
  readonly churnScore?: number;
}): boolean {
  if (ctx.discountPct !== undefined && ctx.discountPct > 30) return true;
  if (ctx.churnScore !== undefined && ctx.churnScore > 70) return true;
  if (ctx.creditScore !== undefined) {
    const lo = LLM_CONSENSUS_CREDIT_BORDERLINE_CENTER - LLM_CONSENSUS_CREDIT_BORDERLINE_BAND;
    const hi = LLM_CONSENSUS_CREDIT_BORDERLINE_CENTER + LLM_CONSENSUS_CREDIT_BORDERLINE_BAND;
    if (ctx.creditScore >= lo && ctx.creditScore <= hi) return true;
  }
  return false;
}

// ── Consensus voting ──────────────────────────────────────────────────────────

export type ConsensusChatMessage = {
  readonly role: "system" | "user";
  readonly content: string;
};

export type ConsensusModelRunner = {
  readonly id: string;
  readonly generateText: (messages: ConsensusChatMessage[]) => Promise<string>;
};

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(trimmed);
  const body = fence?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((x) => stableStringify(x)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, "en"));
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",")}}`;
}

async function collectConsensusParsedOutputs<T>(params: {
  readonly models: readonly ConsensusModelRunner[];
  readonly messages: ConsensusChatMessage[];
  readonly schema: z.ZodType<T>;
}): Promise<Array<{ modelId: string; value: T }>> {
  const { models, messages, schema } = params;
  const parsed: Array<{ modelId: string; value: T }> = [];
  for (const m of models) {
    try {
      const text = await m.generateText(messages);
      const json = extractJsonObject(text);
      const r = schema.safeParse(json);
      if (r.success) {
        parsed.push({ modelId: m.id, value: r.data });
      }
    } catch {
      /* continuă cu celelalte modele */
    }
  }
  return parsed;
}

function buildConsensusVoteBuckets<T>(
  parsed: ReadonlyArray<{ modelId: string; value: T }>,
): Map<string, { value: T; modelIds: string[] }> {
  const buckets = new Map<string, { value: T; modelIds: string[] }>();
  for (const p of parsed) {
    const key = stableStringify(p.value);
    const cur = buckets.get(key);
    if (cur) {
      cur.modelIds.push(p.modelId);
    } else {
      buckets.set(key, { value: p.value, modelIds: [p.modelId] });
    }
  }
  return buckets;
}

function pickLargestConsensusBucket<T>(
  buckets: ReadonlyMap<string, { value: T; modelIds: string[] }>,
): { value: T; modelIds: string[] } | null {
  let best: { value: T; modelIds: string[] } | null = null;
  for (const b of buckets.values()) {
    if (!best || b.modelIds.length > best.modelIds.length) {
      best = b;
    }
  }
  return best;
}

export type ConsensusVoteResult<T> =
  | { ok: true; value: T; agreement: "unanimous" | "majority"; agreeingModelIds: string[] }
  | {
      ok: false;
      reason: "insufficient_models" | "parse_all_failed" | "divergence";
      detail?: string;
    };

/**
 * Rulează ≥2 modele; cere acord 2/3 pe valoarea validată Zod (egalitate structurală JSON).
 */
export async function consensusStructuredVote<T>(params: {
  readonly schema: z.ZodType<T>;
  readonly messages: ConsensusChatMessage[];
  readonly models: readonly ConsensusModelRunner[];
  /** Ex: discount_gt_30 | credit_borderline | churn_gt_70 */
  readonly triggerLabel: string;
  readonly onDivergence?: (detail: string) => Promise<void>;
}): Promise<ConsensusVoteResult<T>> {
  const { schema, messages, models, triggerLabel, onDivergence } = params;

  if (models.length < 2) {
    return {
      ok: false,
      reason: "insufficient_models",
      detail: "Need at least 2 models for consensus",
    };
  }

  const parsed = await collectConsensusParsedOutputs({ models, messages, schema });

  if (parsed.length === 0) {
    return { ok: false, reason: "parse_all_failed" };
  }

  const buckets = buildConsensusVoteBuckets(parsed);
  const threshold = Math.ceil((models.length * 2) / 3);
  const best = pickLargestConsensusBucket(buckets);

  if (!best || best.modelIds.length < threshold) {
    const detail = `No majority: need ${threshold}/${models.length}, best=${best?.modelIds.length ?? 0}`;
    llmConsensusDivergenceTotal.inc({ trigger: triggerLabel });
    await onDivergence?.(detail);
    return { ok: false, reason: "divergence", detail };
  }

  const agreement = best.modelIds.length === models.length ? "unanimous" : "majority";
  return {
    ok: true,
    value: best.value,
    agreement,
    agreeingModelIds: best.modelIds,
  };
}

// ── Factory modele default (env) — fără date sensibile aici ───────────────────

const DEEPSEEK_BASE = "https://api.deepseek.com";

function geminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim();
}

async function geminiGenerateText(messages: ConsensusChatMessage[]): Promise<string> {
  const key = geminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY is not set");

  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

function deepseekClient(): OpenAI | null {
  const k = process.env.DEEPSEEK_API_KEY?.trim();
  if (!k) return null;
  return new OpenAI({ baseURL: DEEPSEEK_BASE, apiKey: k, timeout: 120_000, maxRetries: 0 });
}

/**
 * Construiește până la 3 runner-e: infraq reasoning + Gemini + DeepSeek (doar dacă există chei).
 * Caller-ul trebuie să fi verificat `assertLlmFrontierGdprAllows` înainte de a folosi consensus pe date personale.
 */
export function buildDefaultConsensusModelRunners(): ConsensusModelRunner[] {
  const out: ConsensusModelRunner[] = [];

  out.push({
    id: INFRAQ_REASONING_MODEL,
    generateText: async (msgs) => {
      const sys = msgs.find((m) => m.role === "system")?.content ?? "";
      const user = msgs
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n");
      const res = await reasoningClient.chat.completions.create({
        model: INFRAQ_REASONING_MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      });
      return res.choices[0]?.message?.content ?? "";
    },
  });

  if (geminiApiKey()) {
    out.push({
      id: "gemini-2.0-flash",
      generateText: geminiGenerateText,
    });
  }

  const ds = deepseekClient();
  if (ds) {
    out.push({
      id: "deepseek-chat",
      generateText: async (msgs) => {
        const res = await ds.chat.completions.create({
          model: "deepseek-chat",
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.2,
          max_tokens: 1024,
        });
        return res.choices[0]?.message?.content ?? "";
      },
    });
  }

  return out;
}
