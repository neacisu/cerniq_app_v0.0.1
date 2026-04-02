/**
 * claude-sentiment.ts — Client LLM E5 Sentiment Analysis (Plan §X FAZA 9c)
 *
 * POLITICA LLM (Plan §XIII L2560, L2601):
 * - PRIMARY: QwQ-32B-AWQ pe infraq.app/llm/v1/reasoning (OpenAI-compat SDK)
 * - FALLBACK: Anthropic claude-sonnet-4-20250514 — SPECIALIST pentru sentiment (NU date PII)
 *
 * Anti-halucin. (A): Claude = FALLBACK SPECIALIST, NU primar.
 * Anti-halucin. (E): NU trimite CUI/date fiscale — DOAR text mesaj.
 * Anti-halucin. (G): Loghează EXACT modelul folosit (QwQ-32B-AWQ SAU claude-sonnet), NU hardcodat.
 *
 * Pattern copiat din workers/e3-ai-sales/src/lib/llm-client.ts.
 * La implementarea FAZA 13a (llm-infraq-client), importurile vor fi migrate la @cerniq/worker-shared.
 */

import OpenAI from "openai";
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";
import { e5LlmRequestsTotal } from "./e5-metrics.js";

// ── Environment ───────────────────────────────────────────────────────────────

const INFRAQ_BASE = process.env.INFRAQ_BASE ?? "https://infraq.app/llm/v1";
const INFRAQ_API_KEY = process.env.INFRAQ_API_KEY ?? "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

const REASONING_MODEL = "Qwen/QwQ-32B-AWQ";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// ── OpenAI-compat client → infraq.app reasoning ───────────────────────────────

const reasoningClient = new OpenAI({
  baseURL: `${INFRAQ_BASE}/reasoning`,
  apiKey: INFRAQ_API_KEY || "no-key",
  timeout: 90_000,
  maxRetries: 0,
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface SentimentAnalysisResult {
  sentiment: SentimentLabel;
  score: number; // -1.0..1.0
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
  };
  topics: string[];
  churnIndicators: string[];
  mentionedCompetitors: string[];
  churnSignalStrength: number; // min(100, churnIndicators.length × 25)
  modelUsed: string; // EXACT model name used — NU hardcodat
  isFallback: boolean;
}

// ── Prompt helpers ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ești un specialist în analiza sentimentelor pentru comunicare B2B agricolă în România.
Analizează sentimentul mesajului și returnează EXCLUSIV JSON valid cu structura:
{
  "sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
  "score": <număr între -1.0 și 1.0>,
  "emotions": {"joy": 0.0, "anger": 0.0, "sadness": 0.0, "fear": 0.0, "surprise": 0.0},
  "topics": ["topic1", "topic2"],
  "churn_indicators": ["indicator1"],
  "mentioned_competitors": ["CompanyX"],
  "churnSignalStrength": <min(100, churn_indicators.length × 25)>
}
IMPORTANT: Returnează DOAR JSON valid. Niciun text suplimentar.`;

function buildUserPrompt(text: string): string {
  // Anti-halucin. (E): trunchiez la 2000 chars, FĂRĂ date PII/fiscale
  const safeText = text.slice(0, 2000);
  return `Analizează sentimentul urmatorului mesaj:\n\n"${safeText}"`;
}

function parseJsonSafely(raw: string): Record<string, unknown> {
  // Extrage primul bloc JSON din răspuns (QwQ poate returna text + JSON)
  const jsonMatch = /\{[\s\S]*\}/.exec(raw);
  if (!jsonMatch) throw new Error("No JSON block found in LLM response");
  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

function normalizeResult(
  parsed: Record<string, unknown>,
  modelUsed: string,
  isFallback: boolean,
): SentimentAnalysisResult {
  const score = Number(parsed.score ?? 0);
  const churnIndicators = (parsed.churn_indicators as string[] | undefined) ?? [];
  const churnSignalStrength = Math.min(100, churnIndicators.length * 25);
  const emotions = parsed.emotions as Record<string, number> | undefined;

  return {
    sentiment: (parsed.sentiment as SentimentLabel) ?? "NEUTRAL",
    score: Math.max(-1, Math.min(1, Number.isNaN(score) ? 0 : score)),
    emotions: {
      joy: emotions?.joy ?? 0,
      anger: emotions?.anger ?? 0,
      sadness: emotions?.sadness ?? 0,
      fear: emotions?.fear ?? 0,
      surprise: emotions?.surprise ?? 0,
    },
    topics: (parsed.topics as string[]) ?? [],
    churnIndicators,
    mentionedCompetitors: (parsed.mentioned_competitors as string[]) ?? [],
    churnSignalStrength,
    modelUsed,
    isFallback,
  };
}

// ── PRIMARY: QwQ-32B-AWQ pe infraq.app ────────────────────────────────────────

async function callPrimaryLlm(text: string): Promise<SentimentAnalysisResult> {
  if (!INFRAQ_API_KEY) throw new Error("Missing INFRAQ_API_KEY — cannot call infraq.app");

  const response = await reasoningClient.chat.completions.create(
    {
      model: REASONING_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(text) },
      ],
      temperature: 0.1,
      max_tokens: 512,
    },
    { signal: AbortSignal.timeout(60_000) },
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = parseJsonSafely(raw);
  return normalizeResult(parsed, REASONING_MODEL, false);
}

const primaryBreaker = createCircuitBreaker(callPrimaryLlm, "infraq-sentiment-e5", {
  timeout: 60_000,
  errorThresholdPercentage: 50,
  resetTimeout: 60_000,
  volumeThreshold: 3,
});

// ── FALLBACK: Anthropic Claude Sonnet ────────────────────────────────────────

async function callFallbackClaude(text: string): Promise<SentimentAnalysisResult> {
  if (!ANTHROPIC_API_KEY)
    throw new Error("Missing ANTHROPIC_API_KEY — Claude fallback unavailable");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(text) }],
  });

  const block = response.content[0];
  const raw = block?.type === "text" ? block.text : "{}";
  const parsed = parseJsonSafely(raw);
  return normalizeResult(parsed, CLAUDE_MODEL, true);
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * analyzeSentiment — PRIMARY infraq.app QwQ-32B-AWQ → FALLBACK Claude Sonnet
 * Anti-halucin. (E): NU trimite date PII/fiscale — DOAR text mesaj!
 * Anti-halucin. (G): returnează modelUsed cu exact modelul apelat
 */
export async function analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
  // PRIMARY: infraq.app QwQ-32B-AWQ
  if (INFRAQ_API_KEY) {
    try {
      const result = await withExternalApiMetrics("infraq-sentiment-e5", () =>
        primaryBreaker.fire(text),
      );
      e5LlmRequestsTotal.inc({ model: REASONING_MODEL, provider: "infraq", status: "success" });
      return result;
    } catch (primaryErr) {
      console.warn("[e5-sentiment] QwQ-32B failed, fallback Claude Sonnet:", primaryErr);
      e5LlmRequestsTotal.inc({ model: REASONING_MODEL, provider: "infraq", status: "error" });
    }
  }

  // FALLBACK: Anthropic Claude Sonnet — SPECIALIST sentiment (NU date PII)
  const result = await withExternalApiMetrics("claude-sentiment-e5", () =>
    callFallbackClaude(text),
  );
  e5LlmRequestsTotal.inc({ model: CLAUDE_MODEL, provider: "anthropic", status: "success" });
  return result;
}
