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
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  getWaPhoneFollowupQueueName,
} from "@cerniq/worker-shared";

/** Primul bloc `text` din `message.content` (Messages API); altfel `fallback`. */
function anthropicFirstTextBlock(content: unknown, fallback: string): string {
  if (!Array.isArray(content) || content.length === 0) {
    return fallback;
  }
  const block = content[0] as { type?: string; text?: string };
  if (block?.type === "text" && typeof block.text === "string") {
    return block.text;
  }
  return fallback;
}

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

async function callAIForSentiment(content: string): Promise<{
  score: number;
  intent: SentimentIntent;
  urgency: SentimentUrgency;
  requiresHuman: boolean;
}> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Analizează sentimentul următorului mesaj de business în română și returnează JSON cu:
- score: număr între -100 (foarte negativ) și 100 (foarte pozitiv)
- intent: 'INTERESTED' | 'NOT_INTERESTED' | 'QUESTION' | 'COMPLAINT' | 'NEUTRAL'
- urgency: 'LOW' | 'MEDIUM' | 'HIGH'
- requiresHuman: boolean (true dacă necesită intervenție umană)

Mesaj: "${content.slice(0, 500)}"

Răspunde doar cu JSON valid.`,
      },
    ],
  });

  return JSON.parse(anthropicFirstTextBlock(response.content, "{}"));
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

        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: `Ești un reprezentant de vânzări profesionist pentru Cerniq, o platformă B2B pentru agricultură din România.
Răspunzi în română, prietenos dar profesional. Compania: ${companyName ?? "prospectul"}.
IMPORTANT: Răspunde în maxim 2-3 propoziții scurte.`,
          messages: [
            {
              role: "user",
              content: `Prospectul a răspuns: "${content.slice(0, 300)}"
Sentiment: ${analysis.intent}. Generează un răspuns natural care continuă conversația.`,
            },
          ],
        });

        const generatedResponse = anthropicFirstTextBlock(response.content, "");

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
