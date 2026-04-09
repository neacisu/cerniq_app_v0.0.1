/**
 * AI Sentiment + Intent + Response Workers — Sprint 3 PR4
 * Source: etapa2-workers-F-L-remaining.md Cat. J, ADR-0063
 *
 * Workers:
 * - ai:sentiment:analyze  — score -100..100, requiresHuman detection, intent routing
 * - ai:response:generate  — max 2-3 propozitii (Romanian)
 *
 * @deprecated ai:intent:classify (createIntentClassifierWorker) a fost unificat în
 *   ai:sentiment:analyze. Logica NOT_INTERESTED este acum gestionată de sentiment worker.
 */
import type { Job, Worker } from "bullmq";
import { createHash } from "node:crypto";
import type { Redis } from "ioredis";
import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  getWaPhoneFollowupQueueName,
  fastClient,
  INFRAQ_FAST_MODEL,
  withLlmFallbackChain,
  buildFrontierChatTextFallbackSteps,
} from "@cerniq/worker-shared";

// AI rate limit: 60/min from workers-overview RATE_LIMITS
const AI_CACHE_TTL_SECONDS = 3600; // 1h cache

// =============================================================================
// Types
// =============================================================================

export type SentimentIntent =
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "QUESTION"
  | "COMPLAINT"
  | "NEUTRAL";

export type SentimentUrgency = "LOW" | "MEDIUM" | "HIGH";

export interface SentimentJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  content: string;
  channel: "WHATSAPP" | "EMAIL_COLD" | "EMAIL_WARM";
}

export interface SentimentResult {
  score: number; // -100..100
  intent: SentimentIntent;
  urgency: SentimentUrgency;
  requiresHuman: boolean;
  routedTo: "AI" | "HUMAN";
  cached?: boolean;
}

export interface IntentClassifyJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  content: string;
  channel: string;
}

export interface ResponseGenerateJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  content: string;
  analysis: {
    score: number;
    intent: SentimentIntent;
    urgency: SentimentUrgency;
  };
  companyName?: string;
  phoneLabel?: string; // e.g. "01"
  chatId?: string;
}

// =============================================================================
// Worker: ai:sentiment:analyze
// Score -100..100, rate 60/min
// ADR-0063: score >= 50 && !requiresHuman → ai:response:generate
//           requiresHuman || score < 0 → human:review:queue
// =============================================================================

export function createSentimentAnalyzerWorker(redis: Redis): Worker {
  const responseQueue = createQueue(QUEUES.AI_RESPONSE_GENERATE);
  const reviewQueue = createQueue(QUEUES.HUMAN_REVIEW_QUEUE);

  const { worker } = createWorker(
    QUEUES.AI_SENTIMENT_ANALYZE,
    async (job: Job<SentimentJobData>): Promise<SentimentResult> => {
      return withCognitiveSpan("e2:ai:sentiment-analyze", async () => {
        const { tenantId, leadId, journeyId, content, channel } = job.data;

        // Use cached wrapper — tenantId is included in the hash to prevent
        // cross-tenant cache leaks (different tenants may have different thresholds).
        const analysis = await callAIForSentimentCached({ content, tenantId, redis });

        // Update lead journey with sentiment.
        // NOT_INTERESTED intent triggers human review regardless of requiresHuman flag
        // (previously handled by the deprecated ai:intent:classify worker — unified here
        //  per ADR-0063 unification: single source of truth for intent → review routing).
        const requiresReview = analysis.requiresHuman || analysis.intent === "NOT_INTERESTED";

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney } = await import("@cerniq/db");
        const { eq } = await import("@cerniq/db");

        await db
          .update(leadJourney)
          .set({
            sentimentScore: analysis.score,
            requiresHumanReview: requiresReview,
            ...(requiresReview && {
              /** `review_reason_enum` — AI_UNCERTAIN = escaladare AI → HITL (ADR-0063). */
              humanReviewReason: "AI_UNCERTAIN",
              humanReviewPriority: analysis.urgency === "HIGH" ? "URGENT" : "MEDIUM",
            }),
            updatedAt: new Date(),
          })
          .where(eq(leadJourney.id, journeyId));

        // ADR-0063 routing
        let routedTo: "AI" | "HUMAN" = "AI";

        if (analysis.score >= 50 && !requiresReview) {
          await responseQueue.add(
            "generate",
            { tenantId, leadId, journeyId, content, analysis },
            { priority: 2, removeOnComplete: 100 },
          );
        } else if (requiresReview || analysis.score < 0) {
          routedTo = "HUMAN";
          await reviewQueue.add(
            "queue",
            {
              tenantId,
              leadId,
              journeyId,
              reason: analysis.score < 0 ? "NEGATIVE_SENTIMENT" : "AI_UNCERTAIN",
              priority: analysis.urgency,
              content,
              channel,
            },
            { priority: 1, removeOnComplete: 100 },
          );
        }

        return { ...analysis, routedTo };
      });
    },
    { concurrency: 60 },
  );
  return worker;
}

/** Cache-aware wrapper used by both sentiment analyzer and intent classifier workers. */
async function callAIForSentimentCached(opts: {
  content: string;
  tenantId: string;
  redis: Redis;
}): Promise<{
  score: number;
  intent: SentimentIntent;
  urgency: SentimentUrgency;
  requiresHuman: boolean;
}> {
  const { content, tenantId, redis } = opts;
  const sentimentHash = createHash("sha256")
    .update(`${tenantId}:${content}`)
    .digest("hex")
    .slice(0, 16);
  const cacheKey = `sentiment:${tenantId}:${sentimentHash}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  const result = await callAIForSentiment(content);
  await redis.set(cacheKey, JSON.stringify(result), "EX", AI_CACHE_TTL_SECONDS);
  return result;
}

const sentimentAnalysisSchema = z.object({
  score: z.number().min(-100).max(100),
  intent: z.enum(["INTERESTED", "NOT_INTERESTED", "QUESTION", "COMPLAINT", "NEUTRAL"]),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
  requiresHuman: z.boolean(),
});

function parseSentimentJsonText(text: string): z.infer<typeof sentimentAnalysisSchema> {
  const cleaned = text.replaceAll(/```(?:json)?/gi, "").trim();
  const raw = JSON.parse(cleaned) as unknown;
  const parsed = sentimentAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Sentiment JSON invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Plan §XIII: clasificare/sentiment pe fastClient (Qwen2.5-14B); fallback frontier complet.
 */
async function callAIForSentiment(content: string): Promise<{
  score: number;
  intent: SentimentIntent;
  urgency: SentimentUrgency;
  requiresHuman: boolean;
}> {
  const userMsg = `Analizează sentimentul mesajului de business (RO/EN). Returnează DOAR JSON:
{"score": <int -100..100>, "intent": "INTERESTED"|"NOT_INTERESTED"|"QUESTION"|"COMPLAINT"|"NEUTRAL", "urgency": "LOW"|"MEDIUM"|"HIGH", "requiresHuman": <bool>}

Mesaj: ${JSON.stringify(content.slice(0, 500))}`;

  const messages: ChatCompletionMessageParam[] = [{ role: "user", content: userMsg }];
  const frontier = buildFrontierChatTextFallbackSteps(messages, {
    maxTokens: 256,
    temperature: 0.1,
    timeoutMs: 25_000,
  });

  return withLlmFallbackChain({
    primary: async () => {
      const completion = await fastClient.chat.completions.create(
        {
          model: INFRAQ_FAST_MODEL,
          max_tokens: 256,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages,
        },
        { signal: AbortSignal.timeout(10_000) },
      );
      const text = completion.choices[0]?.message?.content ?? "{}";
      return parseSentimentJsonText(text);
    },
    fallbacks: frontier.map((f) => ({
      name: f.name,
      run: async () => parseSentimentJsonText(await f.run()),
    })),
    dataSensitivity: "non_sensitive",
  });
}

// =============================================================================
// Worker: ai:response:generate
// max 2-3 propozitii, Romanian
// =============================================================================

export function createResponseGeneratorWorker(redis: Redis): Worker {
  const { worker } = createWorker(
    QUEUES.AI_RESPONSE_GENERATE,
    async (job: Job<ResponseGenerateJobData>): Promise<{ response: string; sent: boolean }> => {
      return withCognitiveSpan("e2:ai:response-generate", async () => {
        const { tenantId, leadId, journeyId, content, analysis, companyName, phoneLabel, chatId } =
          job.data;

        // Check cache
        const cacheKey = `ai:response:${createHash("sha256")
          .update(`${journeyId}:${content}`)
          .digest("hex")
          .slice(0, 16)}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          return { response: cached, sent: false };
        }

        const system = `Ești un reprezentant de vânzări profesionist pentru Cerniq, o platformă B2B pentru agricultură din România.
Răspunzi în română, prietenos dar profesional. Compania: ${companyName ?? "prospectul"}.
IMPORTANT: Răspunde în maxim 2-3 propoziții scurte.`;

        const user = `Prospectul a răspuns: "${content.slice(0, 300)}"
Sentiment: ${analysis.intent}. Generează un răspuns natural care continuă conversația.`;

        const respMessages: ChatCompletionMessageParam[] = [
          { role: "system", content: system },
          { role: "user", content: user },
        ];
        const frontierResp = buildFrontierChatTextFallbackSteps(respMessages, {
          maxTokens: 300,
          temperature: 0.35,
          timeoutMs: 45_000,
        });
        const generatedResponse = (
          await withLlmFallbackChain({
            primary: async () => {
              const completion = await fastClient.chat.completions.create(
                {
                  model: INFRAQ_FAST_MODEL,
                  max_tokens: 300,
                  temperature: 0.35,
                  messages: respMessages,
                },
                { signal: AbortSignal.timeout(15_000) },
              );
              return completion.choices[0]?.message?.content?.trim() ?? "";
            },
            fallbacks: frontierResp.map((f) => ({ name: f.name, run: f.run })),
            dataSensitivity: "non_sensitive",
          })
        ).trim();

        // Cache generated response
        await redis.set(cacheKey, generatedResponse, "EX", AI_CACHE_TTL_SECONDS);

        // Queue for WA followup if phone available
        if (phoneLabel && chatId) {
          const phoneIdx = Number(phoneLabel) || 1;
          const followupQueueName = getWaPhoneFollowupQueueName(phoneIdx);
          const followupQueue = createQueue(followupQueueName);
          await followupQueue.add(
            "ai-response",
            {
              tenantId,
              leadId,
              journeyId,
              bodyTemplate: generatedResponse,
              recipientPhone: "", // will be looked up from journey
              chatId,
              isFollowup: true,
              personalization: { companyName: companyName ?? "" },
            },
            { priority: 2, removeOnComplete: 100 },
          );
          return { response: generatedResponse, sent: true };
        }

        return { response: generatedResponse, sent: false };
      });
    },
    { concurrency: 20 },
  );
  return worker;
}

// =============================================================================
// Worker: ai:intent:classify
// @deprecated — Merged into createSentimentAnalyzerWorker (ADR-0063 unification).
// The NOT_INTERESTED human-review logic is now handled inside ai:sentiment:analyze.
// This worker is kept as a no-op stub for reference. Do NOT re-register it in index.ts.
// The queue QUEUES.AI_INTENT_CLASSIFY has been removed from queue-registry.ts.
// =============================================================================

/**
 * @deprecated Use createSentimentAnalyzerWorker instead.
 * Intent classification is now unified with sentiment analysis in ai:sentiment:analyze.
 * NOT_INTERESTED → humanReview logic is handled there.
 */
export function createIntentClassifierWorker(_redis: Redis): never {
  throw new Error(
    "[createIntentClassifierWorker] DEPRECATED: Intent classification is now handled by " +
      "createSentimentAnalyzerWorker (ai:sentiment:analyze). Remove this call from index.ts.",
  );
}
