/**
 * h47-feedback-report-generate.ts — Worker H47: NPS Report Generate (Plan §X FAZA 9h)
 *
 * Queue: feedback:report:generate | Timeout: 60s | Concurrency: 5 | Redis DB: 5
 *
 * Responsabilitate:
 *   - SELECT goldNpsSurveys per tenant și perioadă
 *   - Calculează: totalResponses, promoters, passives, detractors, npsScore, avgScore
 *   - Log raport NPS agregat
 *
 * Anti-halucinare FAZA 9h:
 *   (A) goldNurturingActions.nurturingStateId este NOT NULL (foreign key required)
 *       → Nu se poate insera un raport tenant-level fără un leadId specific
 *       → INSERT în goldNurturingActions este OMIS (nu există nurturingStateId tenant-level)
 *   (B) npsScore NPS = ((promoters - detractors) / totalResponses) * 100, rotunjit la 2 decimale
 *   (C) periodDays se interpola în INTERVAL via sql tagged template (anti-injection)
 */

import type { Job, Worker } from "bullmq";
import { db, goldNpsSurveys, isNotNull, sql, setSessionTenantId } from "@cerniq/db";
import { createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ──────────────────────────────────────────────────────────────
const QUEUE_REPORT_GENERATE = "feedback:report:generate";

// ── Timeout job BullMQ ───────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface ReportGenerateJobData {
  tenantId: string;
  periodDays: number;
  reportType: "NPS_SUMMARY" | "SATISFACTION_TREND" | "COMPLAINT_ANALYSIS";
}

export interface ReportGenerateResult {
  ok: boolean;
  skipped: boolean;
  totalResponses: number;
  npsScore?: number;
  avgScore?: number;
  promoters?: number;
  passives?: number;
  detractors?: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createFeedbackReportGenerateWorker(): Worker {
  const { worker } = createWorker<ReportGenerateJobData>(
    QUEUE_REPORT_GENERATE,
    async (job: Job<ReportGenerateJobData>): Promise<ReportGenerateResult> => {
      return withCognitiveSpan("e5:feedback:report:generate", async () => {
        const { tenantId, periodDays, reportType } = job.data;

        await setSessionTenantId(tenantId);

        job.log(
          `[H47] Report generate: tenantId=${tenantId} period=${periodDays}d type=${reportType}`,
        );

        // ── 1. SELECT surveys din perioada specificată cu score != null ───────
        // periodDays interpolat sigur via sql tag — nu se poate injecta valori string
        const surveys = await db
          .select({
            score: goldNpsSurveys.score,
            respondedAt: goldNpsSurveys.respondedAt,
          })
          .from(goldNpsSurveys)
          .where(
            sql`${goldNpsSurveys.tenantId} = ${tenantId}::uuid
              AND ${isNotNull(goldNpsSurveys.score)}
              AND ${goldNpsSurveys.respondedAt} > NOW() - INTERVAL '1 day' * ${periodDays}`,
          );

        const totalResponses = surveys.length;

        // ── 2. Verifică dacă există răspunsuri ──────────────────────────────
        if (totalResponses === 0) {
          job.log(`[H47] No responses pentru tenantId=${tenantId} period=${periodDays}d — skip`);
          return { ok: true, skipped: true, totalResponses: 0 };
        }

        // ── 3. Calculează metrici NPS ────────────────────────────────────────
        // isNotNull() în WHERE garantează score non-null; fallback 0 pentru type safety
        const scores = surveys.map((s) => s.score ?? 0);
        const promoters = scores.filter((s) => s >= 9).length;
        const passives = scores.filter((s) => s >= 7 && s <= 8).length;
        const detractors = scores.filter((s) => s <= 6).length;

        const npsScore = Math.round(((promoters - detractors) / totalResponses) * 100 * 100) / 100;

        const avgScore =
          Math.round((scores.reduce((sum, s) => sum + s, 0) / totalResponses) * 100) / 100;

        // ── 4. NOTE: INSERT goldNurturingActions OMIS ────────────────────────
        // goldNurturingActions.nurturingStateId este NOT NULL (foreign key obligatoriu).
        // Raportul este la nivel de tenant (fără leadId specific), deci nu există
        // un nurturingStateId valid. INSERT-ul va fi posibil după adăugarea
        // coloanei nullable `nurturingStateId` sau a unui tabel dedicat rapoartelor.

        job.log(
          `[H47] NPS report generated tenantId=${tenantId} npsScore=${npsScore} totalResponses=${totalResponses}`,
        );
        job.log(
          `[H47] Breakdown: promoters=${promoters} passives=${passives} detractors=${detractors} avgScore=${avgScore}`,
        );

        return {
          ok: true,
          skipped: false,
          totalResponses,
          npsScore,
          avgScore,
          promoters,
          passives,
          detractors,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
      lockDuration: JOB_TIMEOUT_MS,
    },
  );

  return worker;
}
