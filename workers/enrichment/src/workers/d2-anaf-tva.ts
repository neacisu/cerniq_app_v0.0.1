/**
 * @deprecated Use d0-anaf-full-fetch.ts (QUEUES.ENRICH_ANAF_FULL) instead.
 * Kept as reference implementation. Not registered as an active worker in main.ts.
 */
import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui, withCognitiveSpan } from "@cerniq/worker-shared";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { fetchAnafSingleByCui } from "../lib/anaf-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("d2-anaf-tva", { etapa: "e1" });

export type AnafTvaJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const anafTvaProcessor: Processor<AnafTvaJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:anaf-tva",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "D2:anaf-tva",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });

      try {
        svcLog.info(
          { tenantId: job.data.tenantId, companyId: job.data.companyId, cui: cleanedCui },
          "D2 ANAF TVA (deprecated path)",
        );
        log.step("anaf_request", "Fetch ANAF TVA", {
          cui: cleanedCui,
          endpoint: "anaf_v9_platitor_single",
        });
        await setSessionTenantId(job.data.tenantId);

        const record = await fetchAnafSingleByCui(cleanedCui);
        log.info("anaf_response", "Răspuns ANAF", {
          cui: cleanedCui,
          found: Boolean(record),
          latencyMs: Date.now() - startedAt,
        });
        if (!record) {
          await db.insert(silverEnrichmentLog).values({
            tenantId: job.data.tenantId,
            entityType: "company",
            entityId: job.data.companyId,
            source: "anaf_tva",
            operation: "fetch",
            requestPayload: { cui: cleanedCui },
            responsePayload: null,
            fieldsUpdated: [],
            correlationId: job.data.correlationId,
            jobId: String(job.id ?? ""),
            durationMs: Date.now() - startedAt,
          });
          await markEnrichmentSourceComplete(
            job.data.tenantId,
            job.data.companyId,
            "anaf_tva",
            job.data.correlationId,
          );
          log.step("done", "ANAF TVA: negăsit", {
            cui: cleanedCui,
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "not_found", source: "anaf_tva", cleanedCui };
        }

        const tvaActive = record.inregistrare_scop_Tva?.scpTVA ?? null;
        const tvaIncasare = record.inregistrare_RTVAI?.statusTvaIncasare ?? null;

        const tvaSummary = {
          scpTVA: tvaActive,
          statusTvaIncasare: tvaIncasare,
          perioade_TVA: record.inregistrare_scop_Tva?.perioade_TVA ?? [],
        };

        await db
          .update(silverCompanies)
          .set({
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafTva}', ${JSON.stringify(tvaSummary)}::jsonb)`,
            lastEnrichedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "anaf_tva",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: tvaSummary,
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        await markEnrichmentSourceComplete(
          job.data.tenantId,
          job.data.companyId,
          "anaf_tva",
          job.data.correlationId,
        );

        log.step("done", "ANAF TVA: succes", {
          cui: cleanedCui,
          tvaActive,
          latencyMs: Date.now() - startedAt,
        });

        return { ok: true, status: "success", source: "anaf_tva", cleanedCui, tvaActive };
      } catch (error) {
        log.error(
          "fatal",
          `ANAF TVA eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              companyId: job.data.companyId,
              cui: cleanedCui,
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
