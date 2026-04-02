/**
 * b13-sentiment-aggregate.ts — Worker B13: Sentiment Aggregate (Plan §X FAZA 9c)
 *
 * Queue: sentiment:aggregate (REDIS_DB_E5=5)
 * Trigger: B12 (post sentiment analysis) sau cron periodic
 *
 * Logică:
 * - Per client: AVG(sentimentScore) last 30 days
 * - Trend: compară avg(last 30d) vs avg(previous 30d) → IMPROVING/STABLE/DECLINING
 * - UPDATE gold_nurturing_state SET satisfactionTrend
 *
 * Threshold: diferența > 0.1 → IMPROVING/DECLINING, altfel STABLE
 */

import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

export interface SentimentAggregateJobData {
  tenantId: string;
  clientId: string;
  nurturingStateId: string;
}

export interface SentimentAggregateResult {
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  avgLast30d: number | null;
  avgPrev30d: number | null;
  sampleCount30d: number;
}

const TREND_THRESHOLD = 0.1; // diferența minimă pentru a considera trend semnificativ

function calculateTrend(
  avgLast: number | null,
  avgPrev: number | null,
): "IMPROVING" | "STABLE" | "DECLINING" {
  if (avgLast === null || avgPrev === null) return "STABLE";
  const diff = avgLast - avgPrev;
  if (diff > TREND_THRESHOLD) return "IMPROVING";
  if (diff < -TREND_THRESHOLD) return "DECLINING";
  return "STABLE";
}

export function createSentimentAggregateWorker(): Worker {
  const { worker } = createWorker<SentimentAggregateJobData>(
    QUEUES.E5_SENTIMENT_AGGREGATE,
    async (job: Job<SentimentAggregateJobData>): Promise<SentimentAggregateResult> => {
      return withCognitiveSpan("e5:sentiment:aggregate", async () => {
        const { tenantId, clientId, nurturingStateId } = job.data;

        const {
          db,
          setSessionTenantId,
          goldSentimentAnalysis,
          goldNurturingState,
          sql,
          eq,
          and,
          gte,
          lt,
        } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);

        const now = new Date();
        const last30dStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const prev30dStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // AVG last 30 days
        const [last30dRow] = await db
          .select({
            avg: sql<string>`AVG(CAST(${goldSentimentAnalysis.sentimentScore} AS FLOAT))`.as("avg"),
            count: sql<number>`COUNT(*)`.as("count"),
          })
          .from(goldSentimentAnalysis)
          .where(
            and(
              eq(goldSentimentAnalysis.tenantId, tenantId),
              eq(goldSentimentAnalysis.leadId, clientId),
              gte(goldSentimentAnalysis.analyzedAt, last30dStart),
            ),
          );

        // AVG previous 30 days (30-60 days ago)
        const [prev30dRow] = await db
          .select({
            avg: sql<string>`AVG(CAST(${goldSentimentAnalysis.sentimentScore} AS FLOAT))`.as("avg"),
          })
          .from(goldSentimentAnalysis)
          .where(
            and(
              eq(goldSentimentAnalysis.tenantId, tenantId),
              eq(goldSentimentAnalysis.leadId, clientId),
              gte(goldSentimentAnalysis.analyzedAt, prev30dStart),
              lt(goldSentimentAnalysis.analyzedAt, last30dStart),
            ),
          );

        const avgLast30d = last30dRow?.avg == null ? null : Number.parseFloat(last30dRow.avg);
        const avgPrev30d = prev30dRow?.avg == null ? null : Number.parseFloat(prev30dRow.avg);
        const sampleCount30d = last30dRow?.count ?? 0;

        const trend = calculateTrend(avgLast30d, avgPrev30d);

        // UPDATE gold_nurturing_state.satisfactionTrend
        await db
          .update(goldNurturingState)
          .set({ satisfactionTrend: trend, updatedAt: new Date() })
          .where(eq(goldNurturingState.id, nurturingStateId));

        job.log(
          `[B13] trend=${trend} avgLast30d=${avgLast30d?.toFixed(3) ?? "null"} avgPrev30d=${avgPrev30d?.toFixed(3) ?? "null"} samples=${sampleCount30d}`,
        );

        return { trend, avgLast30d, avgPrev30d, sampleCount30d };
      });
    },
    { concurrency: 10, db: 5 },
  );

  return worker;
}
