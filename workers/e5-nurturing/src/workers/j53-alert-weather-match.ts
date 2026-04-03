/**
 * j53-alert-weather-match.ts — Worker J53: Match Clienți după Județ Alertă Meteo (FAZA 9h)
 *
 * Queue: alerts:weather:match | Concurrency: 5 | Redis DB: 5
 *
 * Responsabilitate:
 *   - SELECT goldCompanies WHERE judet ILIKE input.county (case-insensitive)
 *   - Enqueue J55 (alerts:campaign:trigger) per client găsit
 *
 * Anti-halucin. FAZA 9h:
 *   (A) goldCompanies.judet (NU "county") — câmpul real din schemă
 *   (B) Filtrăm doNotContact=false pentru a respecta preferințele clientului
 *   (C) tenantId din goldCompanies (NU injection din job data)
 */

import type { Job, Worker } from "bullmq";
import { db, goldCompanies, eq, and, sql } from "@cerniq/db";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ───────────────────────────────────────────────────────────────
const QUEUE_ALERTS_WEATHER_MATCH = "alerts:weather:match";
const QUEUE_ALERTS_CAMPAIGN_TRIGGER = "alerts:campaign:trigger";

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface WeatherMatchJobData {
  county: string;
  severity: "YELLOW" | "ORANGE" | "RED";
  alertType: "FROST" | "DROUGHT" | "HEAVY_RAIN" | "HAIL" | "WIND" | "OTHER";
  validFrom: string;
  validUntil: string;
  description?: string;
}

export interface WeatherMatchResult {
  county: string;
  matchedClients: number;
  enqueuedCount: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAlertWeatherMatchWorker(): Worker {
  const campaignTriggerQueue = createQueue(QUEUE_ALERTS_CAMPAIGN_TRIGGER, { db: 5 });

  const { worker } = createWorker<WeatherMatchJobData>(
    QUEUE_ALERTS_WEATHER_MATCH,
    async (job: Job<WeatherMatchJobData>): Promise<WeatherMatchResult> => {
      return withCognitiveSpan("e5:alert:weather-match", async () => {
        const { county, severity, alertType, validFrom, validUntil, description } = job.data;

        if (!county?.trim()) {
          throw new Error("[J53] county este obligatoriu", { cause: new Error("missing county") });
        }

        // ── 1. SELECT goldCompanies WHERE judet ILIKE county ─────────────────
        // Câmpul din schemă este `judet` (nu `county`) — normalizăm UPPER
        const matchedClients = await db
          .select({
            id: goldCompanies.id,
            tenantId: goldCompanies.tenantId,
            judet: goldCompanies.judet,
          })
          .from(goldCompanies)
          .where(
            and(
              sql`UPPER(${goldCompanies.judet}) = UPPER(${county})`,
              eq(goldCompanies.doNotContact, false),
            ),
          );

        // ── 2. Dacă 0 clienți → log și return ───────────────────────────────
        if (matchedClients.length === 0) {
          job.log(`[J53] Weather match county=${county}: no clients found`);
          console.log(`[J53] Weather match county=${county}: no clients in county`);
          return { county, matchedClients: 0, enqueuedCount: 0 };
        }

        job.log(`[J53] Weather match county=${county}: ${matchedClients.length} clients matched`);

        // ── 3. Enqueue alerts:campaign:trigger per client ────────────────────
        let enqueuedCount = 0;

        for (const company of matchedClients) {
          try {
            await campaignTriggerQueue.add(
              `campaign-trigger-${company.id}-${alertType}`,
              {
                tenantId: company.tenantId,
                leadId: company.id,
                county: county,
                alertType: alertType,
                severity: severity,
                validFrom: validFrom,
                validUntil: validUntil,
                source: "WEATHER" as const,
                description: description,
              },
              {
                jobId: `campaign-trigger-weather-${company.id}-${alertType}-${Date.now()}`,
                attempts: 3,
                backoff: { type: "exponential", delay: 5_000 },
              },
            );
            enqueuedCount++;
          } catch (err) {
            job.log(
              `[J53] WARN: Failed to enqueue campaign trigger for leadId=${company.id}: ${(err as Error).message}`,
            );
          }
        }

        // ── 4. Log final ─────────────────────────────────────────────────────
        console.log(
          `[J53] Weather match county=${county}: ${matchedClients.length} clients matched, ${enqueuedCount} enqueued`,
        );

        return { county, matchedClients: matchedClients.length, enqueuedCount };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
