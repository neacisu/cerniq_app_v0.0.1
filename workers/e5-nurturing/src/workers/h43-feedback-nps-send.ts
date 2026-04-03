/**
 * h43-feedback-nps-send.ts — Worker H43: NPS Survey Send (Plan §X FAZA 9h)
 *
 * Queue: feedback:nps:send | Timeout: 30s | Concurrency: 10 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Verifică cooldown 90 zile — NU trimitem survey dacă există unul recent
 *   - INSERT gold_nps_surveys cu sentVia, sentAt, cooldownUntil
 *   - Enqueue outreach:orchestrator:dispatch pentru trimitere EMAIL/WHATSAPP
 *
 * Anti-halucinare FAZA 9h:
 *   (A) goldNpsSurveys.sentVia folosește e5ActionChannelEnum → doar EMAIL/WHATSAPP valide
 *   (B) Cooldown 90 zile — NU duplicăm surveys active
 *   (C) score=null la INSERT — se va completa de H44 la primirea răspunsului
 */

import type { Job, Worker } from "bullmq";
import { db, goldNpsSurveys, sql, eq, and, setSessionTenantId } from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { addDays } from "date-fns";

// ── Queue names ──────────────────────────────────────────────────────────────
const QUEUE_NPS_SEND = "feedback:nps:send";
const QUEUE_OUTREACH_DISPATCH = "outreach:orchestrator:dispatch";

// ── Timeout job BullMQ ───────────────────────────────────────────────────────
const JOB_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface NpsSendJobData {
  tenantId: string;
  leadId: string;
  channel: "EMAIL" | "WHATSAPP";
  triggerSource: "CRON" | "EVENT";
}

export interface NpsSendResult {
  ok: boolean;
  skipped: boolean;
  surveyId?: string;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createFeedbackNpsSendWorker(): Worker {
  const outreachQueue = createQueue(QUEUE_OUTREACH_DISPATCH, { db: 5 });

  const { worker } = createWorker<NpsSendJobData>(
    QUEUE_NPS_SEND,
    async (job: Job<NpsSendJobData>): Promise<NpsSendResult> => {
      return withCognitiveSpan("e5:feedback:nps:send", async () => {
        const { tenantId, leadId, channel, triggerSource } = job.data;

        await setSessionTenantId(tenantId);

        job.log(
          `[H43] NPS send check: leadId=${leadId} channel=${channel} trigger=${triggerSource}`,
        );

        // ── 1. Cooldown check — NU trimitem dacă există survey în ultimele 90 zile ──
        const recentRows = await db
          .select({ id: goldNpsSurveys.id })
          .from(goldNpsSurveys)
          .where(
            and(
              eq(goldNpsSurveys.tenantId, tenantId),
              eq(goldNpsSurveys.leadId, leadId),
              sql`${goldNpsSurveys.sentAt} > NOW() - INTERVAL '90 days'`,
            ),
          )
          .limit(1);

        if (recentRows.length > 0) {
          job.log(`[H43] Cooldown activ pentru leadId=${leadId} — skip NPS send`);
          return { ok: true, skipped: true };
        }

        // ── 2. INSERT goldNpsSurveys ─────────────────────────────────────────
        const now = new Date();
        const cooldownUntil = addDays(now, 90);

        const inserted = await db
          .insert(goldNpsSurveys)
          .values({
            tenantId,
            leadId,
            sentVia: channel,
            sentAt: now,
            cooldownUntil,
          })
          .returning({ id: goldNpsSurveys.id });

        if (!inserted[0]) {
          throw new Error("[H43] Failed to insert gold_nps_surveys — no row returned");
        }

        const surveyId = inserted[0].id;

        job.log(`[H43] NPS survey creat: surveyId=${surveyId}`);

        // ── 3. Enqueue outreach:orchestrator:dispatch ────────────────────────
        await outreachQueue.add(
          "nps-survey-dispatch",
          {
            tenantId,
            leadId,
            channel,
            templateId: "NPS_SURVEY",
            subject: "Pe o scară de la 0 la 10, cât de probabil e să ne recomandați?",
            surveyId,
          },
          { jobId: `nps-send-${surveyId}` },
        );

        job.log(`[H43] NPS survey sent leadId=${leadId} via ${channel}`);

        return { ok: true, skipped: false, surveyId };
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
