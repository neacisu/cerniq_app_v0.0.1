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
 *
 * Chei LLM (ex. ANTHROPIC_API_KEY) vin din OpenBao → `/secrets/workers.env` (global per mediu).
 * Override per-tenant (tabel `integration_configs`) nu face parte din MVP — vezi plan cognitiv db-integration-configs.
 */
import type { Job, Worker } from "bullmq";
import { createHash, randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  getWaPhoneFollowupQueueName,
  withLlmFallbackChain,
  buildFrontierChatTextFallbackSteps,
  generateValidatedJsonWithRetries,
  resolveOutreachLlmRouting,
  OUTREACH_NODE_SENTIMENT,
  OUTREACH_NODE_RESPONSE,
  llmRegenerationAttempts,
} from "@cerniq/worker-shared";
import { enrichError } from "@cerniq/observability";
import { ensureJobDataCorrelationId } from "../lib/ensure-job-data-correlation.js";
import { createOutreachJobLogger } from "../lib/outreach-job-logger.js";

// AI rate limit: 60/min from workers-overview RATE_LIMITS
const AI_CACHE_TTL_SECONDS = 3600; // 1h cache

/** Răspuns minimal când generarea eșuează după retry-uri — conversația nu rămâne fără mesaj. */
const OUTREACH_RESPONSE_GENERATION_FALLBACK_RO =
  "Mulțumim pentru mesaj. Un consultant revine în curând cu detalii.";

const RESPONSE_TEXT_GUARD_LABEL = "structured_text" as const;
const MIN_GENERATED_RESPONSE_CHARS = 10;
const MAX_GENERATED_RESPONSE_CHARS = 4000;

function isStructuredOutputExhaustedError(e: unknown): boolean {
  return e instanceof Error && e.name === "LlmStructuredOutputExhaustedError";
}

function responseLengthValidationError(raw: string): string {
  if (raw.length === 0) return "empty";
  if (raw.length < MIN_GENERATED_RESPONSE_CHARS) return "too_short";
  return "too_long";
}

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
  correlationId?: string;
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
  correlationId?: string;
}

type OutreachLlmRoute = Awaited<ReturnType<typeof resolveOutreachLlmRouting>>;

async function generateOutreachResponseTextWithRetries(params: {
  readonly route: OutreachLlmRoute;
  readonly content: string;
  readonly analysis: ResponseGenerateJobData["analysis"];
  readonly system: string;
}): Promise<string> {
  const { route, content, analysis, system } = params;
  let lastTextErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const correction =
      attempt > 1
        ? `\n\n(Notă: ieșire invalidă — ${lastTextErr}. Generează 2-3 propoziții RO, fără liste lungi, fără ghilimele exterioare pe tot răspunsul.)`
        : "";
    const user = `Prospectul a răspuns: "${content.slice(0, 300)}"
Sentiment: ${analysis.intent}. Generează un răspuns natural care continuă conversația.${correction}`;

    const respMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const frontierResp = buildFrontierChatTextFallbackSteps(respMessages, {
      maxTokens: 300,
      temperature: 0.35,
      timeoutMs: 45_000,
    });
    const raw = (
      await withLlmFallbackChain({
        primary: async () => {
          const completion = await route.client.chat.completions.create(
            {
              model: route.model,
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

    if (raw.length >= MIN_GENERATED_RESPONSE_CHARS && raw.length <= MAX_GENERATED_RESPONSE_CHARS) {
      if (attempt > 1) {
        llmRegenerationAttempts.observe({ guardrail_type: RESPONSE_TEXT_GUARD_LABEL }, attempt - 1);
      }
      return raw;
    }
    lastTextErr = responseLengthValidationError(raw);
    llmRegenerationAttempts.observe({ guardrail_type: RESPONSE_TEXT_GUARD_LABEL }, attempt);
  }
  return "";
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
        const correlationId = job.data.correlationId?.trim() || randomUUID();

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-ai-sentiment",
          queueName: QUEUES.AI_SENTIMENT_ANALYZE,
          tenantId,
          entityType: "journey",
          entityId: journeyId,
          correlationId: job.data.correlationId,
        });
        jlog.info("ai_sentiment", "start", { channel, leadId });

        // Use cached wrapper — tenantId is included in the hash to prevent
        // cross-tenant cache leaks (different tenants may have different thresholds).
        let analysis: {
          score: number;
          intent: SentimentIntent;
          urgency: SentimentUrgency;
          requiresHuman: boolean;
        };
        try {
          analysis = await callAIForSentimentCached({ content, tenantId, redis });
        } catch (e) {
          if (isStructuredOutputExhaustedError(e)) {
            const { db, setSessionTenantId } = await import("@cerniq/db");
            await setSessionTenantId(tenantId);
            const { leadJourney } = await import("@cerniq/db");
            const { eq } = await import("@cerniq/db");
            await db
              .update(leadJourney)
              .set({
                sentimentScore: 0,
                requiresHumanReview: true,
                humanReviewReason: "AI_UNCERTAIN",
                humanReviewPriority: "URGENT",
                updatedAt: new Date(),
              })
              .where(eq(leadJourney.id, journeyId));
            await reviewQueue.add(
              "queue",
              ensureJobDataCorrelationId({
                tenantId,
                leadId,
                journeyId,
                reason: "AI_UNCERTAIN",
                priority: "HIGH",
                content,
                channel,
                correlationId,
              }),
              { priority: 1, removeOnComplete: 100 },
            );
            jlog.warn("ai_sentiment", "structured_output_exhausted", { journeyId });
            const exhausted: SentimentResult = {
              score: 0,
              intent: "NEUTRAL",
              urgency: "HIGH",
              requiresHuman: true,
              routedTo: "HUMAN",
            };
            jlog.done("ai_sentiment", "complete", {
              score: exhausted.score,
              intent: exhausted.intent,
              routedTo: exhausted.routedTo,
              path: "llm_structured_exhausted",
            });
            return exhausted;
          }
          const enr = enrichError(e, { tenantId, journeyId, leadId, channel });
          jlog.error("ai_sentiment", "llm_failed", {
            fingerprint: enr.fingerprint,
            errorType: enr.errorType,
            errorCode: enr.errorCode,
          });
          throw e;
        }

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
            ensureJobDataCorrelationId({
              tenantId,
              leadId,
              journeyId,
              content,
              analysis,
              correlationId,
            }),
            { priority: 2, removeOnComplete: 100 },
          );
        } else if (requiresReview || analysis.score < 0) {
          routedTo = "HUMAN";
          await reviewQueue.add(
            "queue",
            ensureJobDataCorrelationId({
              tenantId,
              leadId,
              journeyId,
              reason: analysis.score < 0 ? "NEGATIVE_SENTIMENT" : "AI_UNCERTAIN",
              priority: analysis.urgency,
              content,
              channel,
              correlationId,
            }),
            { priority: 1, removeOnComplete: 100 },
          );
        }

        const result: SentimentResult = { ...analysis, routedTo };
        jlog.done("ai_sentiment", "complete", {
          score: result.score,
          intent: result.intent,
          routedTo: result.routedTo,
          requiresHuman: result.requiresHuman,
        });
        return result;
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
    try {
      const parsed = sentimentAnalysisSchema.safeParse(JSON.parse(cached));
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      // cache corupt / non-JSON — reîncarcă de la LLM
    }
    await redis.del(cacheKey);
  }
  const result = await callAIForSentiment(content, tenantId);
  await redis.set(cacheKey, JSON.stringify(result), "EX", AI_CACHE_TTL_SECONDS);
  return result;
}

const sentimentAnalysisSchema = z.object({
  score: z.number().min(-100).max(100),
  intent: z.enum(["INTERESTED", "NOT_INTERESTED", "QUESTION", "COMPLAINT", "NEUTRAL"]),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
  requiresHuman: z.boolean(),
});

/**
 * Sentiment: rutare model via `cognitive_node_configs.configOverrides.preferredModel`;
 * validare Zod + max 3 runde cu corecție; fallback frontier în fiecare rundă (Plan §XIII).
 */
async function callAIForSentiment(
  content: string,
  tenantId: string,
): Promise<{
  score: number;
  intent: SentimentIntent;
  urgency: SentimentUrgency;
  requiresHuman: boolean;
}> {
  const route = await resolveOutreachLlmRouting(tenantId, OUTREACH_NODE_SENTIMENT);

  return generateValidatedJsonWithRetries({
    schema: sentimentAnalysisSchema,
    maxAttempts: 3,
    generateRaw: async ({ correctionHint }) => {
      const base = `Analizează sentimentul mesajului de business (RO/EN). Returnează DOAR JSON:
{"score": <int -100..100>, "intent": "INTERESTED"|"NOT_INTERESTED"|"QUESTION"|"COMPLAINT"|"NEUTRAL", "urgency": "LOW"|"MEDIUM"|"HIGH", "requiresHuman": <bool>}

Mesaj: ${JSON.stringify(content.slice(0, 500))}`;
      const userMsg = correctionHint
        ? `${base}\n\nEroare validare anterioară: ${correctionHint}. Repetă DOAR un obiect JSON valid conform schemei, fără text în plus.`
        : base;

      const messages: ChatCompletionMessageParam[] = [{ role: "user", content: userMsg }];
      const frontier = buildFrontierChatTextFallbackSteps(messages, {
        maxTokens: 256,
        temperature: 0.1,
        timeoutMs: 25_000,
      });

      return withLlmFallbackChain({
        primary: async () => {
          const completion = await route.client.chat.completions.create(
            {
              model: route.model,
              max_tokens: 256,
              temperature: 0.1,
              response_format: { type: "json_object" },
              messages,
            },
            { signal: AbortSignal.timeout(10_000) },
          );
          return completion.choices[0]?.message?.content ?? "{}";
        },
        fallbacks: frontier.map((f) => ({
          name: f.name,
          run: f.run,
        })),
        dataSensitivity: "non_sensitive",
      });
    },
  });
}

// =============================================================================
// Worker: ai:response:generate
// max 2-3 propozitii, Romanian
// =============================================================================

export function createResponseGeneratorWorker(redis: Redis): Worker {
  const reviewQueue = createQueue(QUEUES.HUMAN_REVIEW_QUEUE);
  const { worker } = createWorker(
    QUEUES.AI_RESPONSE_GENERATE,
    async (job: Job<ResponseGenerateJobData>): Promise<{ response: string; sent: boolean }> => {
      return withCognitiveSpan("e2:ai:response-generate", async () => {
        const { tenantId, leadId, journeyId, content, analysis, companyName, phoneLabel, chatId } =
          job.data;
        const correlationId = job.data.correlationId?.trim() || randomUUID();

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-ai-response",
          queueName: QUEUES.AI_RESPONSE_GENERATE,
          tenantId,
          entityType: "journey",
          entityId: journeyId,
          correlationId: job.data.correlationId,
        });
        jlog.info("ai_response", "start", { leadId });

        // Check cache
        const cacheKey = `ai:response:${createHash("sha256")
          .update(`${journeyId}:${content}`)
          .digest("hex")
          .slice(0, 16)}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          jlog.done("ai_response", "cache_hit", { sent: false });
          return { response: cached, sent: false };
        }

        const route = await resolveOutreachLlmRouting(tenantId, OUTREACH_NODE_RESPONSE);

        const system = `Ești un reprezentant de vânzări profesionist pentru Cerniq, o platformă B2B pentru agricultură din România.
Răspunzi în română, prietenos dar profesional. Compania: ${companyName ?? "prospectul"}.
IMPORTANT: Răspunde în maxim 2-3 propoziții scurte.`;

        let generatedResponse = await generateOutreachResponseTextWithRetries({
          route,
          content,
          analysis,
          system,
        });

        if (!generatedResponse) {
          jlog.warn("ai_response", "generation_empty_fallback", { journeyId });
          await reviewQueue.add(
            "queue",
            ensureJobDataCorrelationId({
              tenantId,
              leadId,
              journeyId,
              reason: "AI_UNCERTAIN",
              priority: "HIGH",
              content: content.slice(0, 500),
              correlationId,
            }),
            { priority: 1, removeOnComplete: 100 },
          );
          generatedResponse = OUTREACH_RESPONSE_GENERATION_FALLBACK_RO;
        }

        // Cache generated response
        await redis.set(cacheKey, generatedResponse, "EX", AI_CACHE_TTL_SECONDS);

        // Queue for WA followup if phone available
        if (phoneLabel && chatId) {
          const phoneIdx = Number(phoneLabel) || 1;
          const followupQueueName = getWaPhoneFollowupQueueName(phoneIdx);
          const followupQueue = createQueue(followupQueueName);
          await followupQueue.add(
            "ai-response",
            ensureJobDataCorrelationId({
              tenantId,
              leadId,
              journeyId,
              bodyTemplate: generatedResponse,
              recipientPhone: "", // will be looked up from journey
              chatId,
              isFollowup: true,
              personalization: { companyName: companyName ?? "" },
              correlationId,
            }),
            { priority: 2, removeOnComplete: 100 },
          );
          jlog.done("ai_response", "complete", { sent: true, followupQueued: true });
          return { response: generatedResponse, sent: true };
        }

        jlog.done("ai_response", "complete", { sent: false, followupQueued: false });
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
