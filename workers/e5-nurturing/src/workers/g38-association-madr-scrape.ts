/**
 * g38-association-madr-scrape.ts — Worker G38: Scraping PDF Asociații MADR (Plan §X FAZA 9g)
 *
 * Queue: association:madr:scrape | Timeout: 600s | Rate limit: 5/min | Concurrency: 1
 *
 * Responsabilitate:
 *   - Descarcă PDF cooperative/grupuri producători de la MADR (URL din job data)
 *   - Apelează Python3 subprocess: pdf_scraper.py --action madr
 *   - INSERT/UPDATE goldAssociations per entry extras (dedup manual — fără unique constraint)
 *   - Filtrare opțională pe associationTypeFilter
 *   - Enqueue G39 (association:normalize) cu tenantId + scope="MADR"
 *
 * Anti-halucin. FAZA 9g:
 *   (B) Circuit breaker "madr-cooperative-download" cu reset 120s
 *   (C) Cleanup PDF temp în finally block
 *   (D) goldAssociations: dedup manual SELECT+INSERT/UPDATE (fără unique constraint)
 */

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Job, Worker } from "bullmq";
import { db, goldAssociations, eq, and, setSessionTenantId } from "@cerniq/db";
import {
  createWorker,
  createQueue,
  withCognitiveSpan,
  createCircuitBreaker,
} from "@cerniq/worker-shared";
import { runPdfScrape } from "../lib/ouai-scraper.js";
import type { MadrEntry } from "../lib/ouai-scraper.js";

// ── Queue names (hardcodate) ─────────────────────────────────────────────────
const QUEUE_ASSOCIATION_MADR_SCRAPE = "association:madr:scrape";
const QUEUE_ASSOCIATION_NORMALIZE = "association:normalize";

// ---------------------------------------------------------------------------
// Helper: upsert un singur entry în goldAssociations
// Extras pentru a reduce Cognitive Complexity a handler-ului principal
// ---------------------------------------------------------------------------

async function upsertMadrAssociation(entry: MadrEntry, tenantId: string): Promise<void> {
  const existing = await db
    .select({ id: goldAssociations.id })
    .from(goldAssociations)
    .where(
      and(
        eq(goldAssociations.tenantId, tenantId),
        eq(goldAssociations.name, entry.name),
        eq(goldAssociations.county, entry.county.toUpperCase()),
        eq(goldAssociations.source, "MADR"),
      ),
    )
    .limit(1);

  const declaredAreaHa = entry.declared_area_ha == null ? null : String(entry.declared_area_ha);

  if (existing.length === 0) {
    await db.insert(goldAssociations).values({
      tenantId,
      name: entry.name,
      associationType: entry.association_type,
      cui: entry.cui ?? null,
      county: entry.county.toUpperCase(),
      declaredAreaHa,
      source: "MADR",
      isActive: true,
    });
  } else {
    await db
      .update(goldAssociations)
      .set({
        cui: entry.cui ?? null,
        declaredAreaHa,
        updatedAt: new Date(),
      })
      .where(eq(goldAssociations.id, existing[0].id));
  }
}

// ── Timeout Python subprocess ─────────────────────────────────────────────────
const PDF_SUBPROCESS_TIMEOUT_MS = 660_000;

// ── Circuit breaker pentru download PDF cooperative MADR ─────────────────────
const madrCoopDownloadBreaker = createCircuitBreaker(
  async (url: string): Promise<Response> => {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/pdf,*/*" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(
        `[G38] MADR PDF download failed: HTTP ${response.status} ${response.statusText}`,
      );
    }
    return response;
  },
  "madr-cooperative-download",
  { timeout: 30_000, errorThresholdPercentage: 50, resetTimeout: 120_000, volumeThreshold: 3 },
);

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AssociationMadrScrapeJobData {
  tenantId: string;
  pdfUrl: string;
  registryYear: number;
  associationTypeFilter?: "COOPERATIVE" | "PRODUCER_GROUP" | "ALL";
  correlationId?: string;
}

export interface AssociationMadrScrapeResult {
  ok: boolean;
  entriesExtracted: number;
  entriesFiltered: number;
  entriesUpserted: number;
  totalPages: number;
  durationMs: number;
  normalizeJobEnqueued: boolean;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAssociationMadrScrapeWorker(): Worker {
  const normalizeQueue = createQueue(QUEUE_ASSOCIATION_NORMALIZE, { db: 5 });

  const { worker } = createWorker<AssociationMadrScrapeJobData>(
    QUEUE_ASSOCIATION_MADR_SCRAPE,
    async (job: Job<AssociationMadrScrapeJobData>): Promise<AssociationMadrScrapeResult> => {
      return withCognitiveSpan("e5:association:madr-scrape", async () => {
        const startedAt = Date.now();
        const { tenantId, pdfUrl, registryYear, associationTypeFilter, correlationId } = job.data;

        if (!pdfUrl?.trim()) {
          throw new Error("[G38] pdfUrl is required");
        }
        if (!tenantId) {
          throw new Error("[G38] tenantId is required");
        }

        await setSessionTenantId(tenantId);
        job.log(
          `[G38] Starting MADR scrape: year=${registryYear}, filter=${associationTypeFilter ?? "ALL"}`,
        );

        // ── 1. Download PDF cu circuit breaker ──────────────────────────────
        const pdfPath = join(tmpdir(), `madr-${randomUUID()}-${registryYear}.pdf`);
        let pdfDownloaded = false;

        try {
          const response = await madrCoopDownloadBreaker.fire(pdfUrl);
          const arrayBuffer = await response.arrayBuffer();
          await fs.writeFile(pdfPath, Buffer.from(arrayBuffer));
          pdfDownloaded = true;
          job.log(`[G38] PDF downloaded: ${pdfPath} (${arrayBuffer.byteLength} bytes)`);

          // ── 2. Python subprocess PDF scraping ────────────────────────────
          const scrapeResult = await runPdfScrape("madr", pdfPath, {
            timeoutMs: PDF_SUBPROCESS_TIMEOUT_MS,
          });

          if (scrapeResult.error) {
            throw new Error(`[G38] Python pdf_scraper error: ${scrapeResult.error}`);
          }

          const allEntries = scrapeResult.entries as MadrEntry[];
          job.log(
            `[G38] Scrape done: ${allEntries.length} entries extracted, ${scrapeResult.total_pages} pages`,
          );

          // ── 3. Filtrare opțională pe tip asociație ───────────────────────
          const typeFilter = associationTypeFilter ?? "ALL";
          const filteredEntries =
            typeFilter === "ALL"
              ? allEntries
              : allEntries.filter((e) => e.association_type === typeFilter);

          job.log(
            `[G38] After filter (${typeFilter}): ${filteredEntries.length}/${allEntries.length} entries`,
          );

          // ── 4. INSERT/UPDATE goldAssociations (dedup manual via helper) ──
          let entriesUpserted = 0;

          for (const entry of filteredEntries) {
            try {
              await upsertMadrAssociation(entry, tenantId);
              entriesUpserted++;
            } catch (err) {
              job.log(
                `[G38] WARN: Failed to upsert entry ${entry.name}: ${(err as Error).message}`,
              );
            }
          }

          job.log(`[G38] DB upsert done: ${entriesUpserted}/${filteredEntries.length} entries`);

          // ── 5. Enqueue association:normalize ─────────────────────────────
          let normalizeJobEnqueued = false;
          try {
            await normalizeQueue.add(
              "normalize-madr",
              { tenantId, scope: "MADR", correlationId },
              { jobId: `normalize-madr-${tenantId}-${registryYear}-${Date.now()}` },
            );
            normalizeJobEnqueued = true;
          } catch (err) {
            job.log(`[G38] WARN: Failed to enqueue normalize job: ${(err as Error).message}`);
          }

          const durationMs = Date.now() - startedAt;
          job.log(`[G38] Done: ${entriesUpserted} upserted, ${durationMs}ms`);

          return {
            ok: true,
            entriesExtracted: allEntries.length,
            entriesFiltered: filteredEntries.length,
            entriesUpserted,
            totalPages: scrapeResult.total_pages,
            durationMs,
            normalizeJobEnqueued,
          };
        } finally {
          if (pdfDownloaded) {
            await fs.unlink(pdfPath).catch(() => {
              // Ignorăm eroarea de cleanup
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
