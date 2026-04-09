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

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  buildFrontierChatTextFallbackSteps,
  createCircuitBreaker,
  INFRAQ_REASONING_MODEL,
  reasoningClient,
  withExternalApiMetrics,
  withLlmFallbackChain,
} from "@cerniq/worker-shared";
import { e5LlmRequestsTotal } from "./e5-metrics.js";

const REASONING_MODEL = INFRAQ_REASONING_MODEL;

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

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * analyzeSentiment — PRIMARY infraq.app QwQ-32B-AWQ → lanț frontier (Plan §XIII).
 */
export async function analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
  const msgs: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(text) },
  ];
  const frontier = buildFrontierChatTextFallbackSteps(msgs, {
    maxTokens: 512,
    temperature: 0.1,
    timeoutMs: 90_000,
  }).map((f) => ({
    name: f.name,
    run: async () => {
      const raw = await f.run();
      const parsed = parseJsonSafely(raw);
      const r = normalizeResult(parsed, f.name, true);
      e5LlmRequestsTotal.inc({ model: f.name, provider: "frontier", status: "success" });
      return r;
    },
  }));

  return withLlmFallbackChain({
    primary: async () => {
      try {
        const r = await withExternalApiMetrics("infraq-sentiment-e5", () =>
          primaryBreaker.fire(text),
        );
        e5LlmRequestsTotal.inc({ model: REASONING_MODEL, provider: "infraq", status: "success" });
        return r;
      } catch (e) {
        e5LlmRequestsTotal.inc({ model: REASONING_MODEL, provider: "infraq", status: "error" });
        throw e;
      }
    },
    fallbacks: frontier,
    dataSensitivity: "non_sensitive",
  });
}
