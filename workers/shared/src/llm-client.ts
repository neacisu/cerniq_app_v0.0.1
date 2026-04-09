/**
 * Client LLM unificat pentru gateway-ul self-hosted infraq.app (Plan §XIII).
 *
 * - NU Ollama local în workers, NU LiteLLM proxy — doar https://infraq.app/llm/v1/*
 * - Modele: reasoning, fast, embeddings (OpenAI-compatible); guard = Bearer separat
 * - Auth modele: apiKey "unused" (gateway fără cheie). Guard: INFRAQ_GUARD_TOKEN (OpenBao)
 * - Rate limit client-side: 60 req/s burst 120 (modele), 30 req/s burst 60 (guard)
 */

import OpenAI from "openai";
import { llmLatencySeconds, llmRequestsTotal, llmTokensTotal } from "./metrics.js";

// ── Constante model (tabel Plan §XIII L9498-9503) ─────────────────────────────

export const INFRAQ_REASONING_MODEL = "Qwen/QwQ-32B-AWQ" as const;
export const INFRAQ_FAST_MODEL = "Qwen/Qwen2.5-14B-Instruct-AWQ" as const;
export const INFRAQ_EMBEDDINGS_MODEL = "qwen3-embedding-8b-q5km" as const;

export const INFRAQ_DEFAULT_BASE_URL = "https://infraq.app/llm/v1" as const;

const UNUSED_API_KEY = "unused";

// ── Base URL (INFRAQ_BASE_URL din plan L10089; alias INFRAQ_BASE folosit în workeri) ─

export function resolveInfraqBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.INFRAQ_BASE_URL ?? env.INFRAQ_BASE ?? INFRAQ_DEFAULT_BASE_URL).trim();
  return raw.replace(/\/+$/, "");
}

/** Bază LLM Guard: `${resolveInfraqBaseUrl()}/guard` */
export function resolveInfraqGuardBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return `${resolveInfraqBaseUrl(env)}/guard`;
}

export const GUARD_BASE = resolveInfraqGuardBaseUrl();

/** Path relativ la `resolveInfraqGuardBaseUrl()`, ex. `analyze/prompt` (Plan §XIII). */
export function infraqGuardUrl(relativePath: string): string {
  const base = resolveInfraqGuardBaseUrl().replace(/\/+$/, "");
  const p = relativePath.replace(/^\/+/, "");
  return `${base}/${p}`;
}

// ── Token bucket (proces / worker) ───────────────────────────────────────────

export class InfraqTokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    initialFull = true,
  ) {
    this.tokens = initialFull ? capacity : 0;
    this.lastRefillMs = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefillMs) / 1000;
    if (elapsedSec <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSecond);
    this.lastRefillMs = now;
  }

  /** Așteaptă până există `cost` jetoane (1 apel HTTP = cost 1). */
  async acquire(cost = 1): Promise<void> {
    if (cost > this.capacity) {
      throw new Error(`InfraqTokenBucket: acquire(${cost}) exceeds capacity ${this.capacity}`);
    }
    for (;;) {
      this.refill();
      if (this.tokens >= cost) {
        this.tokens -= cost;
        return;
      }
      const needed = cost - this.tokens;
      const waitMs = Math.min(1000, Math.max(1, (needed / this.refillPerSecond) * 1000));
      await new Promise<void>((r) => setTimeout(r, waitMs));
    }
  }

  /** Pentru teste — stare curentă după refill logic (fără a consuma). */
  getAvailableTokensForTest(): number {
    this.refill();
    return this.tokens;
  }
}

/** Plan: 60/s, burst 120 */
const modelsRateBucket = new InfraqTokenBucket(120, 60);
/** Plan: 30/s, burst 60 */
const guardRateBucket = new InfraqTokenBucket(60, 30);

export async function acquireInfraqModelsRateSlot(): Promise<void> {
  await modelsRateBucket.acquire(1);
}

export async function acquireInfraqGuardRateSlot(): Promise<void> {
  await guardRateBucket.acquire(1);
}

// ── Clasificare URL → metrici ────────────────────────────────────────────────

function classifyInfraqOpenAiUrl(urlStr: string): { modelId: string; taskType: string } | null {
  if (urlStr.includes("/reasoning")) {
    return { modelId: INFRAQ_REASONING_MODEL, taskType: "chat_completion" };
  }
  if (urlStr.includes("/fast")) {
    return { modelId: INFRAQ_FAST_MODEL, taskType: "chat_completion" };
  }
  if (urlStr.includes("/embeddings")) {
    return { modelId: INFRAQ_EMBEDDINGS_MODEL, taskType: "embeddings" };
  }
  return null;
}

function recordUsageFromOpenAiJson(json: unknown, modelId: string): void {
  if (!json || typeof json !== "object") return;
  const usage = (json as { usage?: Record<string, unknown> }).usage;
  if (!usage || typeof usage !== "object") return;

  const prompt = usage.prompt_tokens;
  const completion = usage.completion_tokens;
  const total = usage.total_tokens;

  if (typeof prompt === "number" && prompt > 0) {
    llmTokensTotal.inc({ model_id: modelId, type: "input" }, prompt);
  }
  if (typeof completion === "number" && completion > 0) {
    llmTokensTotal.inc({ model_id: modelId, type: "output" }, completion);
  }
  if (
    typeof total === "number" &&
    total > 0 &&
    typeof prompt !== "number" &&
    typeof completion !== "number"
  ) {
    llmTokensTotal.inc({ model_id: modelId, type: "input" }, total);
  }
}

type FetchInput = Parameters<typeof fetch>[0];

function fetchInputToUrlString(input: FetchInput): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * Rezolvă `fetch` la fiecare apel (nu la load), ca stub-urile din teste și orice
 * patch global să se aplice corect după importul modulului.
 */
function createInfraqInstrumentedFetch(): typeof fetch {
  return async (input, init) => {
    const rawFetch = globalThis.fetch.bind(globalThis);
    await acquireInfraqModelsRateSlot();
    const urlStr = fetchInputToUrlString(input);
    const classified = classifyInfraqOpenAiUrl(urlStr);
    const modelId = classified?.modelId ?? "unknown";
    const taskType = classified?.taskType ?? "unknown";
    const t0 = process.hrtime.bigint();
    try {
      const res = await rawFetch(input, init);
      const elapsed = Number(process.hrtime.bigint() - t0) / 1e9;
      const statusLabel = res.ok ? "success" : "error";
      llmRequestsTotal.inc({
        model_id: modelId,
        task_type: taskType,
        status: statusLabel,
        is_selfhosted: "true",
      });
      llmLatencySeconds.observe({ model_id: modelId, task_type: taskType }, elapsed);

      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const text = await res.text();
        try {
          recordUsageFromOpenAiJson(JSON.parse(text) as unknown, modelId);
        } catch {
          /* corp non-JSON sau trunchiat */
        }
        return new Response(text, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }

      return res;
    } catch (err) {
      const elapsed = Number(process.hrtime.bigint() - t0) / 1e9;
      llmRequestsTotal.inc({
        model_id: modelId,
        task_type: taskType,
        status: "error",
        is_selfhosted: "true",
      });
      llmLatencySeconds.observe({ model_id: modelId, task_type: taskType }, elapsed);
      throw err;
    }
  };
}

const infraqFetch = createInfraqInstrumentedFetch();

function createOpenAIClient(
  pathSegment: "reasoning" | "fast" | "embeddings",
  timeoutMs: number,
  maxRetries: number,
): OpenAI {
  const base = `${resolveInfraqBaseUrl()}/${pathSegment}`;
  return new OpenAI({
    baseURL: base,
    apiKey: UNUSED_API_KEY,
    timeout: timeoutMs,
    maxRetries,
    fetch: infraqFetch,
  });
}

/**
 * QwQ-32B-AWQ — orchestrare agent, raționament complex (timeout 120s, Plan §XIII).
 */
export const reasoningClient = createOpenAIClient("reasoning", 120_000, 2);

/**
 * Qwen2.5-14B — chat rapid, clasificare, sentiment (timeout 60s).
 */
export const fastClient = createOpenAIClient("fast", 60_000, 3);

/**
 * qwen3-embedding-8b-q5km — embeddings OpenAI-compat (timeout 30s).
 */
export const embeddingsClient = createOpenAIClient("embeddings", 30_000, 2);

// ── LLM Guard (Bearer) — fără client OpenAI ───────────────────────────────────

/**
 * Header-e Authorization pentru apeluri către `${GUARD_BASE}/...`.
 * @throws dacă INFRAQ_GUARD_TOKEN lipsește (OpenBao trebuie să injecteze în workers.env).
 */
export function getInfraqGuardAuthHeaders(): Record<string, string> {
  const token = process.env.INFRAQ_GUARD_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "INFRAQ_GUARD_TOKEN is missing — LLM Guard requires Bearer token from OpenBao (workers.env)",
    );
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * fetch către LLM Guard cu rate-limit 30/s burst 60 și Bearer obligatoriu.
 */
export async function infraqGuardFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  await acquireInfraqGuardRateSlot();
  const headers = new Headers(init?.headers);
  const auth = getInfraqGuardAuthHeaders();
  for (const [k, v] of Object.entries(auth)) headers.set(k, v);
  return globalThis.fetch(input, { ...init, headers });
}
