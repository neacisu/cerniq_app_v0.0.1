/**
 * j54-alert-apia-seasonal.ts — Worker J54: Alerte Sezoniere APIA (Plan §X FAZA 9h)
 *
 * Queue: alerts:apia:seasonal | Cron: Daily | Concurrency: 1
 *
 * Responsabilitate:
 *   - Calendar static APIA (3 perioade: SAPS, Plăți, Contestații)
 *   - Verifică dacă suntem în fereastra de alertă (startDate - daysBeforeDeadline <= today <= endDate)
 *   - SELECT goldCompanies active (doNotContact=false) → Enqueue J55 per client
 *
 * Anti-halucin. FAZA 9h:
 *   (A) Calendar APIA static — date realiste România, NU inventate
 *   (B) Cron scheduling extern — worker procesează doar job-urile din coadă
 *   (C) goldCompanies.judet (nu "county") — câmpul real din schemă
 */

import type { Job, Worker } from "bullmq";
import { db, goldCompanies, eq } from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ───────────────────────────────────────────────────────────────
const QUEUE_ALERTS_APIA_SEASONAL = "alerts:apia:seasonal";
const QUEUE_ALERTS_CAMPAIGN_TRIGGER = "alerts:campaign:trigger";

// ── Calendar APIA static ──────────────────────────────────────────────────────
// Date realiste pentru România — perioadele oficiale APIA
// IMPORTANT: Modificarea calendarului necesită redeploy — nu este configurabil la runtime
const APIA_EVENTS = [
  {
    startMonth: 3,
    startDay: 1, // 1 martie
    endMonth: 5,
    endDay: 15, // 15 mai
    description: "Depunere cereri SAPS/ECO/ANC",
    alertType: "APIA_SAPS_DEADLINE",
    daysBeforeDeadline: 14,
  },
  {
    startMonth: 9,
    startDay: 1, // 1 septembrie
    endMonth: 10,
    endDay: 31, // 31 octombrie
    description: "Plăți APIA — verificare dosare",
    alertType: "APIA_PAYMENT_PERIOD",
    daysBeforeDeadline: 7,
  },
  {
    startMonth: 11,
    startDay: 1, // 1 noiembrie
    endMonth: 12,
    endDay: 15, // 15 decembrie
    description: "Contestații și clarificări APIA",
    alertType: "APIA_CONTESTATION_PERIOD",
    daysBeforeDeadline: 7,
  },
] as const;

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AlertApiaSeasonalJobData {
  _cron?: boolean;
}

export interface AlertApiaSeasonalResult {
  matchedEvents: number;
  enqueuedCount: number;
  activeEventTypes: string[];
}

// ---------------------------------------------------------------------------
// Helper: verifică dacă today este în fereastra unui event APIA
// ---------------------------------------------------------------------------

function isInAlertWindow(
  today: Date,
  event: (typeof APIA_EVENTS)[number],
): { active: boolean; endDate: Date } {
  const year = today.getFullYear();

  // startDate și endDate pentru anul curent
  const startDate = new Date(year, event.startMonth - 1, event.startDay);
  const endDate = new Date(year, event.endMonth - 1, event.endDay);

  // Fereastra de alertă începe cu daysBeforeDeadline zile înainte de startDate
  const alertWindowStart = new Date(startDate);
  alertWindowStart.setDate(alertWindowStart.getDate() - event.daysBeforeDeadline);

  const active = today >= alertWindowStart && today <= endDate;
  return { active, endDate };
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAlertApiaSeasonalWorker(): Worker {
  const campaignTriggerQueue = createQueue(QUEUE_ALERTS_CAMPAIGN_TRIGGER, { db: 5 });

  const { worker } = createWorker<AlertApiaSeasonalJobData>(
    QUEUE_ALERTS_APIA_SEASONAL,
    async (job: Job<AlertApiaSeasonalJobData>): Promise<AlertApiaSeasonalResult> => {
      return withCognitiveSpan("e5:alert:apia-seasonal", async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        job.log(`[J54] APIA seasonal check: today=${today.toISOString().slice(0, 10)}`);

        // ── 1. Determină events active ───────────────────────────────────────
        const activeEvents: Array<{
          event: (typeof APIA_EVENTS)[number];
          endDate: Date;
        }> = [];

        for (const event of APIA_EVENTS) {
          const { active, endDate } = isInAlertWindow(today, event);
          if (active) {
            activeEvents.push({ event, endDate });
            job.log(
              `[J54] Event activ: ${event.alertType} (ends ${endDate.toISOString().slice(0, 10)})`,
            );
          }
        }

        if (activeEvents.length === 0) {
          job.log("[J54] APIA seasonal: no active events today");
          console.log("[J54] APIA seasonal: no active events today");
          return {
            matchedEvents: 0,
            enqueuedCount: 0,
            activeEventTypes: [],
          };
        }

        // ── 2. SELECT goldCompanies active (doNotContact=false) ──────────────
        const activeClients = await db
          .select({
            id: goldCompanies.id,
            tenantId: goldCompanies.tenantId,
            judet: goldCompanies.judet,
          })
          .from(goldCompanies)
          .where(eq(goldCompanies.doNotContact, false));

        job.log(`[J54] ${activeClients.length} clienți activi pentru notificări APIA`);

        // ── 3. Enqueue per event activ × client ──────────────────────────────
        let enqueuedCount = 0;

        for (const { event, endDate } of activeEvents) {
          for (const company of activeClients) {
            try {
              await campaignTriggerQueue.add(
                `apia-${event.alertType}-${company.id}`,
                {
                  tenantId: company.tenantId,
                  leadId: company.id,
                  county: company.judet ?? "",
                  alertType: event.alertType,
                  severity: "YELLOW" as const,
                  source: "APIA" as const,
                  description: event.description,
                  validUntil: endDate.toISOString(),
                },
                {
                  jobId: `apia-${event.alertType}-${company.id}-${today.toISOString().slice(0, 10)}`,
                  attempts: 3,
                  backoff: { type: "exponential", delay: 5_000 },
                },
              );
              enqueuedCount++;
            } catch (err) {
              job.log(
                `[J54] WARN: Failed to enqueue APIA trigger for leadId=${company.id} event=${event.alertType}: ${(err as Error).message}`,
              );
            }
          }
        }

        const activeEventTypes = activeEvents.map((e) => e.event.alertType);
        job.log(
          `[J54] APIA seasonal: ${activeEvents.length} events active, ${enqueuedCount} clients notified`,
        );
        console.log(
          `[J54] APIA seasonal: ${activeEvents.length} events active, ${enqueuedCount} clients notified`,
        );

        return {
          matchedEvents: activeEvents.length,
          enqueuedCount,
          activeEventTypes,
        };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 1,
    },
  );

  return worker;
}
