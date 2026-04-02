/**
 * b12-sentiment-analyze.ts — Worker B12: Sentiment Analyze AI (Plan §X FAZA 9c)
 *
 * Queue: sentiment:analyze (REDIS_DB_E5=5)
 * Rate limit: 100/min (Plan L2249)
 *
 * Anti-halucin. (D): DOAR B12 folosește LLM — restul sunt deterministe.
 * Anti-halucin. (E): NU trimite CUI/date fiscale — DOAR text mesaj.
 * Anti-halucin. (G): logează EXACT modelul folosit.
 *
 * Logică:
 * - PRIMARY: QwQ-32B-AWQ pe infraq.app/llm/v1/reasoning
 * - FALLBACK: Claude claude-sonnet-4-20250514
 * - INSERT gold_sentiment_analysis cu modelName (actual, nu hardcodat)
 * - Trigger B9 cu semnale detectate din sentiment
 */

import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { analyzeSentiment } from "../lib/claude-sentiment.js";

export interface SentimentAnalyzeJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
  messageId: string;
  text: string; // max 2000 chars — text mesaj FĂRĂ date PII/fiscale
}

export interface SentimentAnalyzeResult {
  sentiment: string;
  score: number;
  churnSignalStrength: number;
  modelUsed: string;
  isFallback: boolean;
  signalsTriggered: number;
  analysisId: string;
}

export function createSentimentAnalyzeWorker(): Worker {
  const signalDetectQueue = createQueue(QUEUES.E5_CHURN_SIGNAL_DETECT, { db: 5 });

  const { worker } = createWorker<SentimentAnalyzeJobData>(
    QUEUES.E5_SENTIMENT_ANALYZE,
    async (job: Job<SentimentAnalyzeJobData>): Promise<SentimentAnalyzeResult> => {
      return withCognitiveSpan("e5:sentiment:analyze", async () => {
        const { tenantId, clientId, nurturingStateId, messageId, text } = job.data;

        // Anti-halucin. (E): trunchiază la 2000 chars, nu trimite date PII
        const safeText = text.slice(0, 2000);

        const analysisResult = await analyzeSentiment(safeText);

        // INSERT gold_sentiment_analysis
        const { db, setSessionTenantId, goldSentimentAnalysis } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        const [inserted] = await db
          .insert(goldSentimentAnalysis)
          .values({
            tenantId,
            leadId: clientId,
            messageId,
            modelName: analysisResult.modelUsed, // Anti-halucin. (G): exact model name
            sentimentScore: String(analysisResult.score),
            emotions: analysisResult.emotions,
            mentionedCompetitors: analysisResult.mentionedCompetitors,
            churnIndicators: analysisResult.churnIndicators,
            churnSignalStrength: analysisResult.churnSignalStrength,
            analyzedAt: new Date(),
          })
          .returning({ id: goldSentimentAnalysis.id });

        // Trigger B9 cu semnale din sentiment (dacă sunt relevante)
        const sentimentContext: Record<string, unknown> = {};
        let signalsTriggered = 0;

        if (analysisResult.score < -0.3) {
          sentimentContext["sentimentScore"] = analysisResult.score;
          signalsTriggered++;
        }
        if (analysisResult.mentionedCompetitors.length > 0) {
          sentimentContext["mentionedCompetitors"] = analysisResult.mentionedCompetitors;
          signalsTriggered++;
        }
        if (analysisResult.topics.includes("price")) {
          sentimentContext["topics"] = analysisResult.topics;
          signalsTriggered++;
        } else if (analysisResult.topics.includes("quality")) {
          sentimentContext["topics"] = analysisResult.topics;
          signalsTriggered++;
        }

        if (signalsTriggered > 0) {
          await signalDetectQueue.add(
            "from-sentiment",
            {
              tenantId,
              clientId,
              nurturingStateId,
              context: {
                ...sentimentContext,
                messageId,
              },
            },
            { removeOnComplete: 1000 },
          );
        }

        job.log(
          `[B12] sentiment=${analysisResult.sentiment} score=${analysisResult.score} model=${analysisResult.modelUsed} signals=${signalsTriggered}`,
        );

        return {
          sentiment: analysisResult.sentiment,
          score: analysisResult.score,
          churnSignalStrength: analysisResult.churnSignalStrength,
          modelUsed: analysisResult.modelUsed,
          isFallback: analysisResult.isFallback,
          signalsTriggered,
          analysisId: inserted?.id ?? "",
        };
      });
    },
    { concurrency: 10, db: 5 },
  );

  return worker;
}
