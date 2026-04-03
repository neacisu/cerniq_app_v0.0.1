/**
 * h44-feedback-nps-process.ts — Worker H44: NPS Score Process (Plan §X FAZA 9h)
 *
 * Queue: feedback:nps:process | Timeout: 30s | Concurrency: 10 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Validare score 0-10
 *   - Clasificare DETRACTOR (0-6) / PASSIVE (7-8) / PROMOTER (9-10)
 *   - UPDATE goldNpsSurveys: score, comment, respondedAt
 *   - UPDATE goldNurturingState: npsScore
 *   - Trigger downstream: DETRACTOR → churn:signal:detect, PROMOTER → state:advocate:promote
 *   - Prometheus: e5NpsScoreRecorded.inc({ category, tenantId })
 *
 * Anti-halucinare FAZA 9h:
 *   (A) goldNpsSurveys NU are coloana `category` — clasificarea e calculată intern
 *   (B) QUEUES.E5_CHURN_SIGNAL_DETECT = "churn:signal:detect"
 *   (C) QUEUES.E5_STATE_ADVOCATE_PROMOTE = "state:advocate:promote"
 */

import type { Job, Worker } from "bullmq";
import { db, goldNpsSurveys, goldNurturingState, eq, and, setSessionTenantId } from "@cerniq/db";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { e5NpsScoreRecorded } from "../lib/e5-metrics.js";

// ── Queue names ──────────────────────────────────────────────────────────────
const QUEUE_NPS_PROCESS = "feedback:nps:process";
const QUEUE_ADVOCATE_PROMOTE = "state:advocate:promote";

// ── Timeout job BullMQ ───────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface NpsProcessJobData {
  tenantId: string;
  leadId: string;
  surveyId: string;
  score: number;
  comment?: string;
}

type NpsCategory = "DETRACTOR" | "PASSIVE" | "PROMOTER";

export interface NpsProcessResult {
  ok: boolean;
  category: NpsCategory;
  triggeredDownstream: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyNpsScore(score: number): NpsCategory {
  if (score <= 6) return "DETRACTOR";
  if (score <= 8) return "PASSIVE";
  return "PROMOTER";
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createFeedbackNpsProcessWorker(): Worker {
  const churnSignalQueue = createQueue(QUEUES.E5_CHURN_SIGNAL_DETECT, { db: 5 });
  const advocatePromoteQueue = createQueue(QUEUE_ADVOCATE_PROMOTE, { db: 5 });

  const { worker } = createWorker<NpsProcessJobData>(
    QUEUE_NPS_PROCESS,
    async (job: Job<NpsProcessJobData>): Promise<NpsProcessResult> => {
      return withCognitiveSpan("e5:feedback:nps:process", async () => {
        const { tenantId, leadId, surveyId, score, comment } = job.data;

        await setSessionTenantId(tenantId);

        // ── 1. Validare score ────────────────────────────────────────────────
        if (!Number.isInteger(score) || score < 0 || score > 10) {
          throw new Error(`[H44] Score invalid: ${String(score)} — trebuie să fie integer 0-10`, {
            cause: new RangeError("NPS score out of range [0, 10]"),
          });
        }

        // ── 2. Clasificare NPS ──────────────────────────────────────────────
        const category = classifyNpsScore(score);

        job.log(
          `[H44] Processing NPS: leadId=${leadId} surveyId=${surveyId} score=${score} category=${category}`,
        );

        // ── 3. UPDATE goldNpsSurveys: score, comment, respondedAt ────────────
        // Notă: goldNpsSurveys NU are coloana `category` în schema curentă
        const updatedSurveys = await db
          .update(goldNpsSurveys)
          .set({
            score,
            comment: comment ?? null,
            respondedAt: new Date(),
          })
          .where(and(eq(goldNpsSurveys.id, surveyId), eq(goldNpsSurveys.tenantId, tenantId)))
          .returning({ id: goldNpsSurveys.id });

        if (!updatedSurveys[0]) {
          throw new Error(
            `[H44] Survey surveyId=${surveyId} nu a fost găsit sau aparține altui tenant`,
            { cause: new Error("Survey not found") },
          );
        }

        // ── 4. UPDATE goldNurturingState: npsScore ──────────────────────────
        await db
          .update(goldNurturingState)
          .set({ npsScore: score })
          .where(
            and(eq(goldNurturingState.tenantId, tenantId), eq(goldNurturingState.leadId, leadId)),
          );

        // ── 5 & 6. Trigger downstream pe baza categoriei ────────────────────
        let triggeredDownstream: string | null = null;

        if (category === "DETRACTOR") {
          await churnSignalQueue.add(
            "nps-detractor-signal",
            {
              tenantId,
              leadId,
              signal: "QUALITY_COMPLAINT",
              score,
            },
            { jobId: `nps-churn-${surveyId}` },
          );
          triggeredDownstream = QUEUES.E5_CHURN_SIGNAL_DETECT;
          job.log(`[H44] DETRACTOR → enqueued churn:signal:detect pentru leadId=${leadId}`);
        } else if (category === "PROMOTER") {
          await advocatePromoteQueue.add(
            "nps-promoter-advocate",
            {
              tenantId,
              leadId,
              source: "NPS_PROMOTER",
            },
            { jobId: `nps-advocate-${surveyId}` },
          );
          triggeredDownstream = QUEUE_ADVOCATE_PROMOTE;
          job.log(`[H44] PROMOTER → enqueued state:advocate:promote pentru leadId=${leadId}`);
        }

        // ── 7. Prometheus ────────────────────────────────────────────────────
        e5NpsScoreRecorded.inc({ category, tenant_id: tenantId });

        job.log(`[H44] NPS processed leadId=${leadId} score=${score} category=${category}`);

        return { ok: true, category, triggeredDownstream };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 10,
      lockDuration: JOB_TIMEOUT_MS,
    },
  );

  return worker;
}
