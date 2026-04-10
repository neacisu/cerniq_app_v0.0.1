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

const svcLog = createServiceLogger("d5-anaf-caen", { etapa: "e1" });

export type AnafCaenJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function isAgriculturalCaen(code: string): boolean {
  const prefix = code.slice(0, 2);
  return prefix === "01" || prefix === "02" || prefix === "03";
}

export const anafCaenProcessor: Processor<AnafCaenJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:anaf-caen",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "D5:anaf-caen",
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
          "D5 ANAF CAEN (deprecated path)",
        );
        log.step("anaf_request", "Fetch ANAF CAEN", {
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
            source: "anaf_caen",
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
            "anaf_caen",
            job.data.correlationId,
          );
          log.step("done", "ANAF CAEN: negăsit", {
            cui: cleanedCui,
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "not_found", source: "anaf_caen", cleanedCui };
        }

        const codCaen = record.date_generale?.cod_CAEN?.trim() ?? "";
        const agricultural = codCaen ? isAgriculturalCaen(codCaen) : false;

        const caenSummary = { codCaen, agricultural };

        await db
          .update(silverCompanies)
          .set({
            codCaenPrincipal: codCaen || undefined,
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafCaen}', ${JSON.stringify(caenSummary)}::jsonb)`,
            lastEnrichedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "anaf_caen",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: caenSummary,
          fieldsUpdated: codCaen ? ["codCaenPrincipal", "metadata"] : ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        await markEnrichmentSourceComplete(
          job.data.tenantId,
          job.data.companyId,
          "anaf_caen",
          job.data.correlationId,
        );

        log.step("done", "ANAF CAEN: succes", {
          cui: cleanedCui,
          codCaen: codCaen || null,
          agricultural,
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: "success",
          source: "anaf_caen",
          cleanedCui,
          codCaenPrincipal: codCaen || null,
          isAgricultural: agricultural,
        };
      } catch (error) {
        log.error(
          "fatal",
          `ANAF CAEN eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
