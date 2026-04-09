/**
 * Client LLM pentru workers/e3-ai-sales — delegare către @cerniq/worker-shared (Plan §XIII).
 *
 * - Gateway infraq: apiKey „unused”; fără INFRAQ_API_KEY obligatoriu.
 * - Embeddings: qwen3-embedding-8b-q5km → halfvec(3072); fallback OpenAI 1536 la eroare.
 * - Fast / reasoning: `withLlmFallbackChain` + factory frontier (xAI → OpenAI → Anthropic → Gemini → DeepSeek).
 * - Cheltuială frontier: Redis zi + oră + `recordLlmCostUsd`.
 */

import OpenAI from "openai";
import {
  createCircuitBreaker,
  INFRAQ_EMBEDDINGS_MODEL,
  INFRAQ_FAST_MODEL,
  INFRAQ_REASONING_MODEL,
  embeddingsClient as sharedEmbeddingsClient,
  fastClient as sharedFastClient,
  reasoningClient as sharedReasoningClient,
  withExternalApiMetrics,
  withLlmFallbackChain,
  buildFrontierChatTextFallbackSteps,
} from "@cerniq/worker-shared";
import { noteFrontierReasoningSpend, resolveE3LlmSpendGuard } from "./llm-spend-redis.js";

export { embeddingsClient, fastClient, reasoningClient } from "@cerniq/worker-shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

const EMBEDDINGS_DIMENSIONS = 3072;
const OPENAI_FALLBACK_MODEL = "text-embedding-3-small";
const OPENAI_FALLBACK_DIMENSIONS = 1536;

const openAiFallbackClient = new OpenAI({
  apiKey: OPENAI_API_KEY || "no-key",
  timeout: 30_000,
  maxRetries: 1,
});

// ── Embeddings ────────────────────────────────────────────────────────────────

export interface EmbedResult {
  readonly embedding: number[];
  readonly model: string;
  readonly dimensions: number;
  readonly isFallback: boolean;
}

async function callInfraqEmbeddings(input: string): Promise<EmbedResult> {
  const response = await sharedEmbeddingsClient.embeddings.create({
    model: INFRAQ_EMBEDDINGS_MODEL,
    input,
  });
  const embedding = response.data[0]?.embedding;
  if (embedding?.length !== EMBEDDINGS_DIMENSIONS) {
    throw new Error(
      `infraq embeddings returned ${embedding?.length ?? 0} dims, expected ${EMBEDDINGS_DIMENSIONS}`,
    );
  }
  return {
    embedding,
    model: INFRAQ_EMBEDDINGS_MODEL,
    dimensions: EMBEDDINGS_DIMENSIONS,
    isFallback: false,
  };
}

const embeddingsBreaker = createCircuitBreaker(callInfraqEmbeddings, "infraq-embeddings", {
  timeout: 30_000,
  errorThresholdPercentage: 50,
  resetTimeout: 60_000,
  volumeThreshold: 5,
});

/**
 * Embedding halfvec(3072) via infraq; fallback OpenAI text-embedding-3-small (1536) la eroare.
 */
export async function embedText(input: string): Promise<EmbedResult> {
  const openAiFallback = async (): Promise<EmbedResult> => {
    if (!OPENAI_API_KEY) throw new Error("OpenAI fallback unavailable: no OPENAI_API_KEY");
    const response = await withExternalApiMetrics("openai-embeddings-fallback", () =>
      openAiFallbackClient.embeddings.create({
        model: OPENAI_FALLBACK_MODEL,
        input,
        dimensions: OPENAI_FALLBACK_DIMENSIONS,
      }),
    );
    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("OpenAI fallback embeddings returned empty");
    return {
      embedding,
      model: OPENAI_FALLBACK_MODEL,
      dimensions: OPENAI_FALLBACK_DIMENSIONS,
      isFallback: true,
    };
  };

  try {
    return await withExternalApiMetrics("infraq-embeddings", () => embeddingsBreaker.fire(input));
  } catch (primaryErr) {
    console.warn("[e3-llm-client] infraq embeddings failed, falling back to OpenAI", primaryErr);
    if (!OPENAI_API_KEY) throw primaryErr;
    return withLlmFallbackChain({
      primary: openAiFallback,
      fallbacks: [],
      dataSensitivity: "non_sensitive",
    });
  }
}

// ── Fast LLM ───────────────────────────────────────────────────────────────────

export interface FastChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export type FastChatOptions = {
  readonly tenantId?: string;
};

async function callFastClient(messages: FastChatMessage[], timeoutMs = 5_000): Promise<string> {
  const response = await sharedFastClient.chat.completions.create(
    {
      model: INFRAQ_FAST_MODEL,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.1,
      max_tokens: 1024,
    },
    { signal: AbortSignal.timeout(timeoutMs) },
  );
  return response.choices[0]?.message?.content ?? "";
}

const fastBreaker = createCircuitBreaker(
  (messages: FastChatMessage[], timeoutMs?: number) => callFastClient(messages, timeoutMs),
  "infraq-fast",
  {
    timeout: 60_000,
    errorThresholdPercentage: 50,
    resetTimeout: 30_000,
    volumeThreshold: 3,
  },
);

/**
 * Qwen2.5-14B pe infraq fast + lanț frontier la eșec.
 */
export async function fastChat(
  messages: FastChatMessage[],
  timeoutMs = 5_000,
  opts?: FastChatOptions,
): Promise<string> {
  const spendGuard = resolveE3LlmSpendGuard(opts?.tenantId) ?? undefined;
  const openAiMsgs = messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  const frontier = buildFrontierChatTextFallbackSteps(openAiMsgs, {
    maxTokens: 1024,
    temperature: 0.1,
    timeoutMs: Math.min(timeoutMs + 50_000, 120_000),
  });

  return withLlmFallbackChain({
    primary: async () =>
      withExternalApiMetrics("infraq-fast", () => fastBreaker.fire(messages, timeoutMs)),
    fallbacks: frontier.map((f) => ({ name: f.name, run: f.run })),
    dataSensitivity: "non_sensitive",
    spendGuard,
  });
}

// ── Reasoning LLM ──────────────────────────────────────────────────────────────

export interface ReasoningChatOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  tenantId?: string;
}

async function callReasoningModel(
  systemPrompt: string,
  userPrompt: string,
  options: ReasoningChatOptions = {},
): Promise<string> {
  const response = await sharedReasoningClient.chat.completions.create(
    {
      model: INFRAQ_REASONING_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
    },
    { signal: AbortSignal.timeout(options.timeoutMs ?? 90_000) },
  );
  return response.choices[0]?.message?.content ?? "";
}

const reasoningBreaker = createCircuitBreaker(
  (systemPrompt: string, userPrompt: string, options?: ReasoningChatOptions) =>
    callReasoningModel(systemPrompt, userPrompt, options),
  "infraq-reasoning",
  {
    timeout: 120_000,
    errorThresholdPercentage: 50,
    resetTimeout: 60_000,
    volumeThreshold: 3,
  },
);

/**
 * QwQ-32B-AWQ primary; fallback frontier complet (Plan §XIII).
 */
export async function reasoningChat(
  systemPrompt: string,
  userPrompt: string,
  options: ReasoningChatOptions = {},
): Promise<{ text: string; modelUsed: string }> {
  const promptLen = systemPrompt.length + userPrompt.length;
  const spendGuard = resolveE3LlmSpendGuard(options.tenantId) ?? undefined;

  const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const frontier = buildFrontierChatTextFallbackSteps(msgs, {
    maxTokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
    timeoutMs: options.timeoutMs ?? 90_000,
  }).map((f) => ({
    name: f.name,
    run: async () => {
      const text = await f.run();
      await noteFrontierReasoningSpend(options.tenantId, f.name, promptLen, text.length);
      return { text, modelUsed: f.name };
    },
  }));

  return withLlmFallbackChain({
    primary: async () => {
      const text = await withExternalApiMetrics("infraq-reasoning", () =>
        reasoningBreaker.fire(systemPrompt, userPrompt, options),
      );
      return { text, modelUsed: INFRAQ_REASONING_MODEL };
    },
    fallbacks: frontier,
    dataSensitivity: "non_sensitive",
    spendGuard,
  });
}
