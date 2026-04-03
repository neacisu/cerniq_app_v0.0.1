/**
 * h45-feedback-satisfaction-track.ts — Worker H45: Satisfaction Trend Track (Plan §X FAZA 9h)
 *
 * Queue: feedback:satisfaction:track | Timeout: 30s | Concurrency: 20 | Redis DB: 5
 *
 * Responsabilitate:
 *   - SELECT ultimele 3 răspunsuri NPS per lead
 *   - Calculează trend: IMPROVING / STABLE / DECLINING
 *   - UPDATE goldNurturingState.satisfactionTrend
 *
 * Anti-halucinare FAZA 9h:
 *   (A) Trend calculat din cel puțin 2 răspunsuri (altfel insufficient data → skip)
 *   (B) satisfactionTrendEnum: IMPROVING | STABLE | DECLINING (conform schema)
 */

import type { Job, Worker } from "bullmq";
import {
  db,
  goldNpsSurveys,
  goldNurturingState,
  eq,
  and,
  desc,
  isNotNull,
  setSessionTenantId,
} from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ──────────────────────────────────────────────────────────────
const QUEUE_SATISFACTION_TRACK = "feedback:satisfaction:track";

// ── Timeout job BullMQ ───────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface SatisfactionTrackJobData {
  tenantId: string;
  leadId: string;
}

type SatisfactionTrend = "IMPROVING" | "STABLE" | "DECLINING";

export interface SatisfactionTrackResult {
  ok: boolean;
  skipped: boolean;
  trend?: SatisfactionTrend;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createFeedbackSatisfactionTrackWorker(): Worker {
  const { worker } = createWorker<SatisfactionTrackJobData>(
    QUEUE_SATISFACTION_TRACK,
    async (job: Job<SatisfactionTrackJobData>): Promise<SatisfactionTrackResult> => {
      return withCognitiveSpan("e5:feedback:satisfaction:track", async () => {
        const { tenantId, leadId } = job.data;

        await setSessionTenantId(tenantId);

        job.log(`[H45] Satisfaction track: leadId=${leadId}`);

        // ── 1. SELECT ultimele 3 răspunsuri NPS cu score != null ────────────
        const surveys = await db
          .select({
            score: goldNpsSurveys.score,
            respondedAt: goldNpsSurveys.respondedAt,
          })
          .from(goldNpsSurveys)
          .where(
            and(
              eq(goldNpsSurveys.tenantId, tenantId),
              eq(goldNpsSurveys.leadId, leadId),
              isNotNull(goldNpsSurveys.score),
            ),
          )
          .orderBy(desc(goldNpsSurveys.respondedAt))
          .limit(3);

        // ── 2. Verifică date suficiente (minim 2 răspunsuri) ─────────────────
        if (surveys.length < 2) {
          job.log(
            `[H45] Insufficient data pentru leadId=${leadId} (${surveys.length} răspunsuri) — skip`,
          );
          return { ok: true, skipped: true };
        }

        // ── 3. Calculează trend ──────────────────────────────────────────────
        // isNotNull() în WHERE garantează score non-null; fallback 0 pentru type safety
        // surveys[0] = cel mai recent, surveys[1..] = anterioare
        const latestScore = surveys[0].score ?? 0;
        const previousScores = surveys.slice(1).map((s) => s.score ?? 0);
        const avgPrevious = previousScores.reduce((sum, s) => sum + s, 0) / previousScores.length;

        let trend: SatisfactionTrend;
        if (latestScore > avgPrevious) {
          trend = "IMPROVING";
        } else if (latestScore < avgPrevious) {
          trend = "DECLINING";
        } else {
          trend = "STABLE";
        }

        // ── 4. UPDATE goldNurturingState.satisfactionTrend ──────────────────
        await db
          .update(goldNurturingState)
          .set({ satisfactionTrend: trend })
          .where(
            and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, leadId)),
          );

        job.log(`[H45] Satisfaction trend updated leadId=${leadId} trend=${trend}`);

        return { ok: true, skipped: false, trend };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 20,
      lockDuration: JOB_TIMEOUT_MS,
    },
  );

  return worker;
}
