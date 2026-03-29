import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { xaiStructuredJson } from "../lib/xai-client.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

export type AiDataMergerJobData = {
  tenantId: string;
  companyId: string;
  dataSources: Record<string, unknown>;
  correlationId?: string;
};

export const aiDataMergerProcessor: Processor<AiDataMergerJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ai:merge-xai",
    async (_span) => {
      const startedAt = Date.now();
      await setSessionTenantId(job.data.tenantId);

      const systemPrompt =
        "Reconciliezi date de companie din surse multiple. Respecti prioritatea ANAF > Termene > ONRC > scraping. Returnezi JSON.";
      const userPrompt = `Unifica urmatoarele surse:\n${JSON.stringify(
        job.data.dataSources,
        null,
        2,
      )}\nReturneaza {"merged_data": {...},"conflicts_resolved":[{"field":"","chosen_value":"","reason":"","alternatives":[]}],"confidence":0.0}`;
      const result = await xaiStructuredJson(systemPrompt, userPrompt);

      const mergedData =
        result.merged_data && typeof result.merged_data === "object"
          ? (result.merged_data as Record<string, unknown>)
          : {};
      const confidence = Number(result.confidence ?? 0.5);
      const conflicts = Array.isArray(result.conflicts_resolved) ? result.conflicts_resolved : [];

      if (confidence < 0.7 && conflicts.length > 0) {
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

      return { ok: true, status: "success", confidence, conflicts: conflicts.length };
    },
    { tenantId: job.data.tenantId },
  );
};
