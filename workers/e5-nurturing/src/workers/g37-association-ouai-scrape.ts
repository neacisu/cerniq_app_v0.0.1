/**
 * g37-association-ouai-scrape.ts — Worker G37: Scraping PDF OUAI Registry MADR (Plan §X FAZA 9g)
 *
 * Queue: association:ouai:scrape | Timeout: 600s | Rate limit: 5/min | Concurrency: 1
 *
 * Responsabilitate:
 *   - Descarcă PDF registru OUAI de la MADR (URL din job data)
 *   - Apelează Python3 subprocess: pdf_scraper.py --action ouai
 *   - INSERT/UPDATE goldOuaiRegistry per entry extras (fără unique constraint → dedup manual)
 *   - Enqueue G39 (association:normalize) cu scope="OUAI"
 *
 * Anti-halucin. FAZA 9g:
 *   (A) goldOuaiRegistry = PUBLIC DATA (NU RLS per tenant)
 *   (B) Circuit breaker "madr-pdf-download" cu reset 120s
 *   (C) Cleanup PDF temp în finally block
 *   (D) Dedup manual cu SELECT+INSERT/UPDATE (goldOuaiRegistry fără unique constraint)
 */

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Job, Worker } from "bullmq";
import { db, goldOuaiRegistry, eq, and, setSessionTenantId, sql } from "@cerniq/db";
import {
  createWorker,
  createQueue,
  withCognitiveSpan,
  createCircuitBreaker,
} from "@cerniq/worker-shared";
import { runPdfScrape } from "../lib/ouai-scraper.js";
import type { OuaiEntry } from "../lib/ouai-scraper.js";

// ── Queue names (hardcodate) ─────────────────────────────────────────────────
const QUEUE_ASSOCIATION_OUAI_SCRAPE = "association:ouai:scrape";
const QUEUE_ASSOCIATION_NORMALIZE = "association:normalize";

// ── Timeout Python subprocess ─────────────────────────────────────────────────
const PDF_SUBPROCESS_TIMEOUT_MS = 660_000;

// ── Circuit breaker pentru download PDF MADR ─────────────────────────────────
const madrPdfDownloadBreaker = createCircuitBreaker(
  async (url: string): Promise<Response> => {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/pdf,*/*" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `[G37] MADR PDF download failed: HTTP ${response.status} ${response.statusText}`,
      );
    }
    return response;
  },
  "madr-pdf-download",
  { timeout: 30_000, errorThresholdPercentage: 50, resetTimeout: 120_000, volumeThreshold: 3 },
);

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AssociationOuaiScrapeJobData {
  pdfUrl: string;
  registryYear: number;
  tenantId?: string;
  correlationId?: string;
}

export interface AssociationOuaiScrapeResult {
  ok: boolean;
  entriesExtracted: number;
  entriesUpserted: number;
  totalPages: number;
  durationMs: number;
  normalizeJobEnqueued: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAssociationOuaiScrapeWorker(): Worker {
  const normalizeQueue = createQueue(QUEUE_ASSOCIATION_NORMALIZE, { db: 5 });

  const { worker } = createWorker<AssociationOuaiScrapeJobData>(
    QUEUE_ASSOCIATION_OUAI_SCRAPE,
    async (job: Job<AssociationOuaiScrapeJobData>): Promise<AssociationOuaiScrapeResult> => {
      return withCognitiveSpan("e5:association:ouai-scrape", async () => {
        const startedAt = Date.now();
        const { pdfUrl, registryYear, tenantId, correlationId } = job.data;

        if (!pdfUrl?.trim()) {
          throw new Error("[G37] pdfUrl is required");
        }

        job.log(`[G37] Starting OUAI scrape: year=${registryYear}, url=${pdfUrl}`);

        // ── Session context (opțional — goldOuaiRegistry nu are RLS) ─────────
        if (tenantId) {
          await setSessionTenantId(tenantId);
        }

        // ── 1. Download PDF cu circuit breaker ──────────────────────────────
        const pdfPath = join(tmpdir(), `ouai-${randomUUID()}-${registryYear}.pdf`);
        let pdfDownloaded = false;

        try {
          const response = await madrPdfDownloadBreaker.fire(pdfUrl);
          const arrayBuffer = await response.arrayBuffer();
          await fs.writeFile(pdfPath, Buffer.from(arrayBuffer));
          pdfDownloaded = true;
          job.log(`[G37] PDF downloaded: ${pdfPath} (${arrayBuffer.byteLength} bytes)`);

          // ── 2. Python subprocess PDF scraping ────────────────────────────
          const scrapeResult = await runPdfScrape("ouai", pdfPath, {
            timeoutMs: PDF_SUBPROCESS_TIMEOUT_MS,
          });

          if (scrapeResult.error) {
            throw new Error(`[G37] Python pdf_scraper error: ${scrapeResult.error}`);
          }

          const entries = scrapeResult.entries as OuaiEntry[];
          job.log(
            `[G37] Scrape done: ${entries.length} entries extracted, ${scrapeResult.total_pages} pages`,
          );

          // ── 3. INSERT/UPDATE goldOuaiRegistry (dedup manual) ─────────────
          let entriesUpserted = 0;

          for (const entry of entries) {
            try {
              const existing = await db
                .select({ id: goldOuaiRegistry.id })
                .from(goldOuaiRegistry)
                .where(
                  and(
                    eq(goldOuaiRegistry.ouaiName, entry.ouai_name),
                    eq(goldOuaiRegistry.county, entry.county.toUpperCase()),
                    eq(goldOuaiRegistry.registryYear, registryYear),
                  ),
                )
                .limit(1);

              if (existing.length === 0) {
                await db.insert(goldOuaiRegistry).values({
                  ouaiName: entry.ouai_name,
                  county: entry.county.toUpperCase(),
                  netAreaHa: String(entry.net_area_ha),
                  hydroameliorationName: entry.hydroamelioration_name ?? null,
                  registryYear,
                  cui: null,
                  memberCount: null,
                });
              } else {
                await db
                  .update(goldOuaiRegistry)
                  .set({
                    netAreaHa: String(entry.net_area_ha),
                    hydroameliorationName: entry.hydroamelioration_name ?? null,
                    updatedAt: sql`NOW()`,
                  })
                  .where(eq(goldOuaiRegistry.id, existing[0].id));
              }

              entriesUpserted++;
            } catch (err) {
              job.log(
                `[G37] WARN: Failed to upsert entry ${entry.ouai_name}: ${(err as Error).message}`,
              );
            }
          }

          job.log(`[G37] DB upsert done: ${entriesUpserted}/${entries.length} entries`);

          // ── 4. Enqueue association:normalize ─────────────────────────────
          let normalizeJobEnqueued = false;
          try {
            await normalizeQueue.add(
              "normalize-ouai",
              { scope: "OUAI", correlationId },
              { jobId: `normalize-ouai-${registryYear}-${Date.now()}` },
            );
            normalizeJobEnqueued = true;
          } catch (err) {
            job.log(`[G37] WARN: Failed to enqueue normalize job: ${(err as Error).message}`);
          }

          const durationMs = Date.now() - startedAt;
          job.log(`[G37] Done: ${entriesUpserted} upserted, ${durationMs}ms`);

          return {
            ok: true,
            entriesExtracted: entries.length,
            entriesUpserted,
            totalPages: scrapeResult.total_pages,
            durationMs,
            normalizeJobEnqueued,
          };
        } finally {
          if (pdfDownloaded) {
            await fs.unlink(pdfPath).catch(() => {
              // Ignorăm eroarea de cleanup — fișierul poate fi deja șters
            });
          }
        }
      });
    },
    {
      connection: { db: 5 },
      concurrency: 1,
    },
  );

  return worker;
}
