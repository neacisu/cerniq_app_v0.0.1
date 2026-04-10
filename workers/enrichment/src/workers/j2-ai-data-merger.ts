import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { INFRAQ_REASONING_MODEL, withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";
import { infraqStructuredJson } from "../lib/infraq-structured-json.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

const svcLog = createServiceLogger("j2-ai-data-merger", { etapa: "e1" });

function promptPrefixSha256(prompt: string): string {
  return createHash("sha256").update(prompt.slice(0, 500), "utf8").digest("hex");
}

export type AiDataMergerJobData = {
  tenantId: string;
  companyId: string;
  dataSources: Record<string, unknown>;
  correlationId?: string;
};

export const aiDataMergerProcessor: Processor<AiDataMergerJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ai:merge-infraq",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "J2:ai-data-merger",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      let userPrompt = "";
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "J2 AI merge");

        const systemPrompt =
          "Reconciliezi date de companie din surse multiple. Respecti prioritatea ANAF > Termene > ONRC > scraping. Returnezi JSON.";
        userPrompt = `Unifica urmatoarele surse:\n${JSON.stringify(
          job.data.dataSources,
          null,
          2,
        )}\nReturneaza {"merged_data": {...},"conflicts_resolved":[{"field":"","chosen_value":"","reason":"","alternatives":[]}],"confidence":0.0}`;
        const result = await infraqStructuredJson(systemPrompt, userPrompt);

        const mergedData =
          result.merged_data && typeof result.merged_data === "object"
            ? (result.merged_data as Record<string, unknown>)
            : {};
        const confidence = Number(result.confidence ?? 0.5);
        const conflicts = Array.isArray(result.conflicts_resolved) ? result.conflicts_resolved : [];

        if (confidence < 0.7 && conflicts.length > 0) {
          log.info("ai", "Merge HITL", {
            modelUsed: INFRAQ_REASONING_MODEL,
            latencyMs: Date.now() - startedAt,
            confidenceScore: confidence,
          });
          await createHitlApprovalTask({
            tenantId: job.data.tenantId,
            entityType: "company",
            entityId: job.data.companyId,
            type: "ai_merge_review",
            title: "Revizuire AI merge date",
            description: "Conflict de date intre surse, necesita aprobare umana",
            aiConfidence: confidence,
            aiRecommendation: "review",
            urgency: "medium",
            metadata: { dataSources: job.data.dataSources, mergedData, conflicts },
            expiresInHours: 24,
          });
          return { ok: true, status: "hitl_required", confidence, conflicts: conflicts.length };
        }

        await db
          .update(silverCompanies)
          .set({
            denumire: typeof mergedData.denumire === "string" ? mergedData.denumire : undefined,
            adresa: typeof mergedData.adresa === "string" ? mergedData.adresa : undefined,
            email: typeof mergedData.email === "string" ? mergedData.email : undefined,
            telefon: typeof mergedData.telefon === "string" ? mergedData.telefon : undefined,
            website: typeof mergedData.website === "string" ? mergedData.website : undefined,
            statusFirma:
              typeof mergedData.status_firma === "string"
                ? (mergedData.status_firma as never)
                : undefined,
            codCaenPrincipal:
              typeof mergedData.cod_caen_principal === "string"
                ? mergedData.cod_caen_principal
                : undefined,
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{aiMerge}', ${JSON.stringify(
              {
                confidence,
                conflicts,
                mergedData,
                mergedAt: new Date().toISOString(),
              },
            )}::jsonb)`,
            lastEnrichedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "ai_data_merger",
          operation: "merge",
          requestPayload: { dataSources: job.data.dataSources },
          responsePayload: result,
          fieldsUpdated: [
            "denumire",
            "adresa",
            "email",
            "telefon",
            "website",
            "statusFirma",
            "codCaenPrincipal",
            "metadata",
          ],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "Merge aplicat", {
          modelUsed: INFRAQ_REASONING_MODEL,
          latencyMs: Date.now() - startedAt,
          confidenceScore: confidence,
        });
        return { ok: true, status: "success", confidence, conflicts: conflicts.length };
      } catch (error) {
        log.error(
          "fatal",
          `AI merge eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              model: INFRAQ_REASONING_MODEL,
              promptHash: promptPrefixSha256(userPrompt || ""),
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
