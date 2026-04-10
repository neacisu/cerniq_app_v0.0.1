import type { Processor } from "bullmq";
import { withCognitiveSpan, importMutationTotal } from "@cerniq/worker-shared";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getTermeneDosare } from "../lib/termene-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("e3-termene-dosare", { etapa: "e1" });
const TERMENE_ENDPOINT = "termene/dosare";

export type TermeneDosareJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const termeneDosareProcessor: Processor<TermeneDosareJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:termene-dosare",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "E3:termene-dosare",
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
          "E3 Termene dosare",
        );
        log.step("termene_request", "Apel Termene dosare", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
        });
        await setSessionTenantId(job.data.tenantId);

        const payload = await getTermeneDosare(cleanedCui);
        log.info("termene_response", "Răspuns Termene", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
          found: Boolean(payload),
          latencyMs: Date.now() - startedAt,
        });
        const cases = Array.isArray(payload?.dosare)
          ? (payload?.dosare as Array<Record<string, unknown>>)
          : [];
        const activeCases = cases.filter((d) => String(d.status ?? "").toUpperCase() === "ACTIV");
        const inInsolventa = activeCases.some((d) => {
          const tip = String(d.tip_dosar ?? d.tip ?? "").toLowerCase();
          return tip.includes("insolventa") || tip.includes("faliment");
        });
        const areExecutariSilite = activeCases.some((d) => {
          const tip = String(d.tip_dosar ?? d.tip ?? "").toLowerCase();
          return tip.includes("executare");
        });
        const tipuri = Array.from(
          new Set(
            activeCases
              .map((d) => String(d.tip_dosar ?? d.tip ?? "").trim())
              .filter((value) => value.length > 0),
          ),
        );

        await db
          .update(silverCompanies)
          .set({
            statusFirma: inInsolventa ? "INSOLVENTA" : undefined,
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{termeneDosare}', ${JSON.stringify(
              {
                totalCases: cases.length,
                activeCases: activeCases.length,
                inInsolventa,
                areExecutariSilite,
                tipuri,
                payload,
              },
            )}::jsonb)`,
            lastEnrichedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        importMutationTotal.inc({
          operation: "update",
          table: "silver_companies",
          tenant_id: job.data.tenantId,
        });

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "termene_dosare",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: payload,
          fieldsUpdated: ["statusFirma", "metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        await markEnrichmentSourceComplete(
          job.data.tenantId,
          job.data.companyId,
          "termene_dosare",
          job.data.correlationId,
        );

        log.step("done", "Termene dosare: finalizat", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
          activeCases: activeCases.length,
          inInsolventa,
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: payload ? "success" : "not_found",
          source: "termene_dosare",
          cleanedCui,
          activeCases: activeCases.length,
          inInsolventa,
          areExecutariSilite,
        };
      } catch (error) {
        log.error(
          "fatal",
          `Termene dosare eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              companyId: job.data.companyId,
              cui: cleanedCui,
              endpoint: TERMENE_ENDPOINT,
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
