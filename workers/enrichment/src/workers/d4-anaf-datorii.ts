/**
 * @deprecated Use d0-anaf-full-fetch.ts (QUEUES.ENRICH_ANAF_FULL) instead.
 * Kept as reference implementation. Not registered as an active worker in main.ts.
 */
import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui, withCognitiveSpan } from "@cerniq/worker-shared";
import { fetchAnafSingleByCui } from "../lib/anaf-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type AnafDatoriiJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const anafDatoriiProcessor: Processor<AnafDatoriiJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:anaf-datorii",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      await setSessionTenantId(job.data.tenantId);

      const record = await fetchAnafSingleByCui(cleanedCui);
      if (!record) {
        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "anaf_datorii",
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
          "anaf_datorii",
          job.data.correlationId,
        );
        return { ok: true, status: "not_found", source: "anaf_datorii", cleanedCui };
      }

      const inactive = record.stare_inactiv?.statusInactivi ?? false;

      const datoriiSummary = {
        statusInactivi: inactive,
        dataInactivare: record.stare_inactiv?.dataInactivare ?? null,
        dataReactivare: record.stare_inactiv?.dataReactivare ?? null,
        dataRadiere: record.stare_inactiv?.dataRadiere ?? null,
      };

      await db
        .update(silverCompanies)
        .set({
          statusFirma: inactive ? "INACTIVA" : undefined,
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafDatorii}', ${JSON.stringify(datoriiSummary)}::jsonb)`,
          lastEnrichedAt: new Date(),
        })
        .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

      await db.insert(silverEnrichmentLog).values({
        tenantId: job.data.tenantId,
        entityType: "company",
        entityId: job.data.companyId,
        source: "anaf_datorii",
        operation: "fetch",
        requestPayload: { cui: cleanedCui },
        responsePayload: datoriiSummary,
        fieldsUpdated: inactive ? ["statusFirma", "metadata"] : ["metadata"],
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });
      await markEnrichmentSourceComplete(
        job.data.tenantId,
        job.data.companyId,
        "anaf_datorii",
        job.data.correlationId,
      );

      return { ok: true, status: "success", source: "anaf_datorii", cleanedCui };
    },
    { tenantId: job.data.tenantId },
  );
};
