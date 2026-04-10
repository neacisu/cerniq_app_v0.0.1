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

const svcLog = createServiceLogger("d3-anaf-efactura", { etapa: "e1" });

export type AnafEfacturaJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const anafEfacturaProcessor: Processor<AnafEfacturaJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:anaf-efactura",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "D3:anaf-efactura",
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
          "D3 ANAF e-factura (deprecated path)",
        );
        log.step("anaf_request", "Fetch ANAF e-factura", {
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
            source: "anaf_efactura",
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
            "anaf_efactura",
            job.data.correlationId,
          );
          log.step("done", "ANAF e-factura: negăsit", {
            cui: cleanedCui,
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "not_found", source: "anaf_efactura", cleanedCui };
        }

        const inregistratEFactura = record.date_generale?.statusRO_e_Factura ?? null;

        const efacturaSummary = { inregistratEFactura };

        await db
          .update(silverCompanies)
          .set({
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafEfactura}', ${JSON.stringify(efacturaSummary)}::jsonb)`,
            lastEnrichedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "anaf_efactura",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: efacturaSummary,
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        await markEnrichmentSourceComplete(
          job.data.tenantId,
          job.data.companyId,
          "anaf_efactura",
          job.data.correlationId,
        );

        log.step("done", "ANAF e-factura: succes", {
          cui: cleanedCui,
          inregistratEFactura,
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: "success",
          source: "anaf_efactura",
          cleanedCui,
          inregistratEFactura,
        };
      } catch (error) {
        log.error(
          "fatal",
          `ANAF e-factura eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
