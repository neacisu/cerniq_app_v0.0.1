import type { Processor } from "bullmq";
import { withCognitiveSpan, importMutationTotal } from "@cerniq/worker-shared";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getTermeneRisk } from "../lib/termene-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("e2-termene-risk", { etapa: "e1" });
const TERMENE_ENDPOINT = "termene/risk";

export type TermeneRiskJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function mapRiskCategory(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score <= 30) return "LOW";
  if (score <= 60) return "MEDIUM";
  return "HIGH";
}

export const termeneRiskProcessor: Processor<TermeneRiskJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:termene-risk",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "E2:termene-risk",
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
          "E2 Termene risk",
        );
        log.step("termene_request", "Apel Termene risk", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
        });
        await setSessionTenantId(job.data.tenantId);

        const payload = await getTermeneRisk(cleanedCui);
        log.info("termene_response", "Răspuns Termene", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
          found: Boolean(payload),
          latencyMs: Date.now() - startedAt,
        });
        if (!payload) {
          await db.insert(silverEnrichmentLog).values({
            tenantId: job.data.tenantId,
            entityType: "company",
            entityId: job.data.companyId,
            source: "termene_risk",
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
            "termene_risk",
            job.data.correlationId,
          );
          log.step("done", "Termene risk: negăsit", {
            cui: cleanedCui,
            endpoint: TERMENE_ENDPOINT,
          });
          return { ok: true, status: "not_found", source: "termene_risk", cleanedCui };
        }

        const scoreRaw = Number(payload.scor_risc ?? payload.risk_score ?? Number.NaN);
        const hasValidScore = Number.isFinite(scoreRaw);
        const score = hasValidScore ? Math.max(0, Math.min(100, scoreRaw)) : null;
        const riskCategory = score === null ? undefined : mapRiskCategory(score);

        await db
          .update(silverCompanies)
          .set({
            categorieRisc: riskCategory,
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{termeneRisk}', ${JSON.stringify({ score, riskCategory, payload })}::jsonb)`,
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
          source: "termene_risk",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: payload,
          fieldsUpdated: ["categorieRisc", "metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        await markEnrichmentSourceComplete(
          job.data.tenantId,
          job.data.companyId,
          "termene_risk",
          job.data.correlationId,
        );

        log.step("done", "Termene risk: succes", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
          score,
          riskCategory,
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: "success",
          source: "termene_risk",
          cleanedCui,
          score,
          riskCategory,
        };
      } catch (error) {
        log.error(
          "fatal",
          `Termene risk eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
