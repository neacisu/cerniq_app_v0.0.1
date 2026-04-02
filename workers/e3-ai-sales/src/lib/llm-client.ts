/**
 * Client LLM local pentru workers/e3-ai-sales.
 *
 * ANTI-HALLUCINARE (Plan §XIII L2598-2602):
 *  - embeddingsClient: EXCLUSIV infraq.app/llm/v1/embeddings — qwen3-embedding-8b → halfvec(3072)
 *  - fastClient: EXCLUSIV infraq.app/llm/v1/fast — Qwen/Qwen2.5-14B-Instruct-AWQ
 *  - Fallback OpenAI text-embedding-3-small (1536) NUMAI la eroare embeddingsClient (A2 plan L1764)
 *  - NU Ollama, NU LiteLLM proxy
 *
 * Notă: Acest modul este temporar local până când llm-infraq-client (FAZA 13a) este implementat
 * în workers/shared/src/llm-client.ts. La momentul migrației, importurile din acest fișier
 * vor fi înlocuite cu imports din @cerniq/worker-shared.
 */

import OpenAI from "openai";
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

// ── Environment ───────────────────────────────────────────────────────────────

const INFRAQ_BASE = process.env.INFRAQ_BASE ?? "https://infraq.app/llm/v1";
const INFRAQ_API_KEY = process.env.INFRAQ_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

const EMBEDDINGS_MODEL = "qwen3-embedding-8b";
const EMBEDDINGS_DIMENSIONS = 3072;
const FAST_MODEL = "Qwen/Qwen2.5-14B-Instruct-AWQ";
const OPENAI_FALLBACK_MODEL = "text-embedding-3-small";
const OPENAI_FALLBACK_DIMENSIONS = 1536;

// ── Clients ───────────────────────────────────────────────────────────────────

export const embeddingsClient = new OpenAI({
  baseURL: `${INFRAQ_BASE}/embeddings`,
  apiKey: INFRAQ_API_KEY || "no-key",
  timeout: 30_000,
  maxRetries: 0,
});

export const fastClient = new OpenAI({
  baseURL: `${INFRAQ_BASE}/fast`,
  apiKey: INFRAQ_API_KEY || "no-key",
  timeout: 60_000,
  maxRetries: 0,
});

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
  if (!INFRAQ_API_KEY) throw new Error("Missing INFRAQ_API_KEY");
  const response = await embeddingsClient.embeddings.create({
    model: EMBEDDINGS_MODEL,
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
    model: EMBEDDINGS_MODEL,
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
 * Returnează embedding halfvec(3072) folosind qwen3-embedding-8b pe infraq.app.
 * Fallback la OpenAI text-embedding-3-small (1536) EXCLUSIV la eroare (Plan L1764).
 */
export async function embedText(input: string): Promise<EmbedResult> {
  try {
    return await withExternalApiMetrics("infraq-embeddings", () => embeddingsBreaker.fire(input));
  } catch (primaryErr) {
    console.warn("[e3-llm-client] infraq embeddings failed, falling back to OpenAI", primaryErr);
    if (!OPENAI_API_KEY) throw primaryErr;
    const response = await withExternalApiMetrics("openai-embeddings-fallback", () =>
      openAiFallbackClient.embeddings.create({
        model: OPENAI_FALLBACK_MODEL,
        input,
        dimensions: OPENAI_FALLBACK_DIMENSIONS,
      }),
    );
    const embedding = response.data[0]?.embedding;
    if (!embedding)
      throw new Error("OpenAI fallback embeddings returned empty", { cause: primaryErr });
    return {
      embedding,
      model: OPENAI_FALLBACK_MODEL,
      dimensions: OPENAI_FALLBACK_DIMENSIONS,
      isFallback: true,
    };
  }
}

// ── Fast LLM (Qwen2.5-14B) ────────────────────────────────────────────────────

export interface FastChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

async function callFastClient(messages: FastChatMessage[], timeoutMs = 5_000): Promise<string> {
  if (!INFRAQ_API_KEY) throw new Error("Missing INFRAQ_API_KEY");
  const response = await fastClient.chat.completions.create(
    {
      model: FAST_MODEL,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.1,
      max_tokens: 1024,
    },
    { signal: AbortSignal.timeout(timeoutMs) },
  );
  const content = response.choices[0]?.message?.content ?? "";
  return content;
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
 * Apelează Qwen2.5-14B pe infraq.app/llm/v1/fast.
 * Folosit pentru: query:rewrite (B7), handover:detect, sentiment:analyze.
 */
export async function fastChat(messages: FastChatMessage[], timeoutMs = 5_000): Promise<string> {
  return withExternalApiMetrics("infraq-fast", () => fastBreaker.fire(messages, timeoutMs));
}

// ── Reasoning LLM (QwQ-32B-AWQ) ───────────────────────────────────────────────

const REASONING_MODEL = "Qwen/QwQ-32B-AWQ";
const XAI_API_KEY = process.env.XAI_API_KEY ?? "";

export const reasoningClient = new OpenAI({
  baseURL: `${INFRAQ_BASE}/reasoning`,
  apiKey: INFRAQ_API_KEY || "no-key",
  timeout: 120_000,
  maxRetries: 0,
});

const grokClient = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: XAI_API_KEY || "no-key",
  timeout: 90_000,
  maxRetries: 0,
});

export interface ReasoningChatOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

async function callReasoningModel(
  systemPrompt: string,
  userPrompt: string,
  options: ReasoningChatOptions = {},
): Promise<string> {
  if (!INFRAQ_API_KEY) throw new Error("Missing INFRAQ_API_KEY");
  const response = await reasoningClient.chat.completions.create(
    {
      model: REASONING_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
    },
    { signal: AbortSignal.timeout(options.timeoutMs ?? 90_000) },
  );
  const content = response.choices[0]?.message?.content ?? "";
  return content;
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
 * QwQ-32B-AWQ pe infraq.app/llm/v1/reasoning.
 * Fallback: Grok-4 → GPT-4o la eroare.
 * Folosit pentru: C14 ai:agent:orchestrate, C15 ai:response:generate complex.
 */
export async function reasoningChat(
  systemPrompt: string,
  userPrompt: string,
  options: ReasoningChatOptions = {},
): Promise<{ text: string; modelUsed: string }> {
  // Primary: QwQ-32B-AWQ pe infraq.app
  try {
    const text = await withExternalApiMetrics("infraq-reasoning", () =>
      reasoningBreaker.fire(systemPrompt, userPrompt, options),
    );
    return { text, modelUsed: REASONING_MODEL };
  } catch (primaryErr) {
    console.warn("[e3-llm-client] QwQ-32B failed, falling back to Grok-4", primaryErr);
  }

  // Fallback 1: Grok-4 pe api.x.ai
  if (XAI_API_KEY) {
    try {
      const response = await withExternalApiMetrics("grok4-fallback", () =>
        grokClient.chat.completions.create(
          {
            model: "grok-4",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 4096,
          },
          { signal: AbortSignal.timeout(options.timeoutMs ?? 90_000) },
        ),
      );
      const text = response.choices[0]?.message?.content ?? "";
      return { text, modelUsed: "grok-4" };
    } catch (grokErr) {
      console.warn("[e3-llm-client] Grok-4 failed, falling back to GPT-4o", grokErr);
    }
  }

  // Fallback 2: GPT-4o pe api.openai.com
  if (!OPENAI_API_KEY) throw new Error("All reasoning LLM fallbacks exhausted: no OPENAI_API_KEY");
  const response = await withExternalApiMetrics("gpt4o-fallback", () =>
    openAiFallbackClient.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
      },
      { signal: AbortSignal.timeout(options.timeoutMs ?? 90_000) },
    ),
  );
  const text = response.choices[0]?.message?.content ?? "";
  return { text, modelUsed: "gpt-4o" };
}
