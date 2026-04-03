/**
 * j52-alert-weather-monitor.ts — Worker J52: Monitor Alerte Meteo ANM (Plan §X FAZA 9h)
 *
 * Queue: alerts:weather:monitor | Cron: every 6h (every 360 min) | Concurrency: 1
 *
 * Responsabilitate:
 *   - Fetch ANM API (process.env.ANM_API_URL) cu timeout 30s
 *   - Filtrare alerte cu severitate YELLOW/ORANGE/RED
 *   - Enqueue J53 (alerts:weather:match) per alertă relevantă
 *
 * Anti-halucin. FAZA 9h:
 *   (A) Dacă ANM_API_URL lipsește → WARN + return { skipped: true }, fără eroare
 *   (B) AbortController cu timeout 30s explicit (NU AbortSignal.timeout)
 *   (C) Cron scheduling extern — acest worker doar procesează job-urile din coadă
 */

import type { Job, Worker } from "bullmq";
import { createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";

// ── Queue names ───────────────────────────────────────────────────────────────
const QUEUE_ALERTS_WEATHER_MONITOR = "alerts:weather:monitor";
const QUEUE_ALERTS_WEATHER_MATCH = "alerts:weather:match";

// ── Severități relevante (YELLOW, ORANGE, RED) ────────────────────────────────
const RELEVANT_SEVERITIES = new Set<string>(["YELLOW", "ORANGE", "RED"]);

// ---------------------------------------------------------------------------
// Tipuri ANM API
// ---------------------------------------------------------------------------

interface AnmWeatherAlert {
  id: string;
  county: string;
  severity: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  alertType: "FROST" | "DROUGHT" | "HEAVY_RAIN" | "HAIL" | "WIND" | "OTHER";
  validFrom: string;
  validUntil: string;
  description?: string;
}

interface AnmApiResponse {
  alerts: AnmWeatherAlert[];
  fetchedAt: string;
}

export interface AlertWeatherMonitorJobData {
  _cron?: boolean;
}

export interface AlertWeatherMonitorResult {
  skipped?: boolean;
  total?: number;
  enqueued?: number;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAlertWeatherMonitorWorker(): Worker {
  const weatherMatchQueue = createQueue(QUEUE_ALERTS_WEATHER_MATCH, { db: 5 });

  const { worker } = createWorker<AlertWeatherMonitorJobData>(
    QUEUE_ALERTS_WEATHER_MONITOR,
    async (job: Job<AlertWeatherMonitorJobData>): Promise<AlertWeatherMonitorResult> => {
      return withCognitiveSpan("e5:alert:weather-monitor", async () => {
        // ── 1. Verifică ENV ──────────────────────────────────────────────────
        const anmApiUrl = process.env.ANM_API_URL;
        if (!anmApiUrl) {
          job.log("[J52] WARN: ANM_API_URL not configured, skipping weather monitor");
          console.warn("[J52] ANM_API_URL not configured, skipping weather monitor");
          return { skipped: true };
        }

        // ── 2. Fetch ANM API cu AbortController timeout 30s ──────────────────
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);
        let anmResponse: Response;

        try {
          anmResponse = await fetch(anmApiUrl, { signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!anmResponse.ok) {
          throw new Error(
            `[J52] ANM API fetch failed: HTTP ${anmResponse.status} ${anmResponse.statusText}`,
            { cause: new Error(`status=${anmResponse.status}`) },
          );
        }

        // ── 3. Parse JSON ────────────────────────────────────────────────────
        let parsed: AnmApiResponse;
        try {
          parsed = (await anmResponse.json()) as AnmApiResponse;
        } catch (err) {
          throw new Error("[J52] ANM API response is not valid JSON", { cause: err });
        }

        const alerts = parsed.alerts ?? [];
        job.log(
          `[J52] ANM API returned ${alerts.length} total alerts fetchedAt=${parsed.fetchedAt}`,
        );

        // ── 4. Filtrare: YELLOW / ORANGE / RED ───────────────────────────────
        const relevantAlerts = alerts.filter((a) => RELEVANT_SEVERITIES.has(a.severity));
        job.log(`[J52] ${relevantAlerts.length}/${alerts.length} alerte relevante (>=YELLOW)`);

        // ── 5. Enqueue alerts:weather:match per alertă ───────────────────────
        let enqueuedCount = 0;

        for (const alert of relevantAlerts) {
          try {
            const alertKey = alert.id ?? `${alert.county}-${alert.alertType}`;
            await weatherMatchQueue.add(
              `weather-match-${alert.county}-${alert.alertType}`,
              {
                county: alert.county,
                severity: alert.severity as "YELLOW" | "ORANGE" | "RED",
                alertType: alert.alertType,
                validFrom: alert.validFrom,
                validUntil: alert.validUntil,
                description: alert.description,
              },
              {
                jobId: `weather-match-${alertKey}-${Date.now()}`,
                attempts: 3,
                backoff: { type: "exponential", delay: 5_000 },
              },
            );
            enqueuedCount++;
          } catch (err) {
            job.log(
              `[J52] WARN: Failed to enqueue match for county=${alert.county} alertType=${alert.alertType}: ${(err as Error).message}`,
            );
          }
        }

        // ── 6. Log final ─────────────────────────────────────────────────────
        job.log(
          `[J52] Weather monitor: ${relevantAlerts.length} alerts fetched, ${enqueuedCount} enqueued`,
        );
        console.log(
          `[J52] Weather monitor: ${relevantAlerts.length} alerts fetched, ${enqueuedCount} enqueued`,
        );

        return { total: alerts.length, enqueued: enqueuedCount };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 1,
    },
  );

  return worker;
}
