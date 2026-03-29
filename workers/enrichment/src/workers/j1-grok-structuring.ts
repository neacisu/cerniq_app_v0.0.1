import type { Processor } from "bullmq";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { sanitizeCui, validateCuiModulo11 } from "../lib/cui-validation.js";
import { xaiStructuredJson } from "../lib/xai-client.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

export type GrokStructuringJobData = {
  tenantId: string;
  companyId: string;
  rawData: Record<string, unknown>;
  correlationId?: string;
};

export const grokStructuringProcessor: Processor<GrokStructuringJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ai:structure-xai",
    async (_span) => {
      const startedAt = Date.now();
      await setSessionTenantId(job.data.tenantId);

      const systemPrompt =
        "Esti expert in structurarea datelor business din Romania. Returneaza strict JSON valid, fara text extra.";
      const userPrompt = `Normalizeaza urmatorul payload brut de companie:\n${JSON.stringify(
        job.data.rawData,
        null,
        2,
      )}\nSchema JSON dorita: {"denumire":"","cui":"","adresa":"","localitate":"","judet":"","email":"","telefon":"","website":"","cod_caen_principal":"","is_agricol":false,"confidence":0.0}`;

      const structured = await xaiStructuredJson(systemPrompt, userPrompt);
      const confidence = Number(structured.confidence ?? 0.5);
      const cleanedCui = sanitizeCui(String(structured.cui ?? ""));
      const cuiValidation = cleanedCui ? validateCuiModulo11(cleanedCui) : null;

      const canAutoApply = confidence >= 0.7 && (!cleanedCui || (cuiValidation?.isValid ?? false));
      if (!canAutoApply) {
        await createHitlApprovalTask({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          type: "ai_structuring_review",
          title: "Revizuire AI structuring",
          description: "Date structurate AI necesita revizie umana",
          aiConfidence: confidence,
          aiRecommendation: confidence >= 0.6 ? "review" : "reject",
          aiReasoning: JSON.stringify({ cuiValidation }),
          urgency: "medium",
          metadata: { rawData: job.data.rawData, structured, cuiValidation },
          expiresInHours: 48,
        });
        return { ok: true, status: "hitl_required", confidence };
      }

      await db
        .update(silverCompanies)
        .set({
          denumire: typeof structured.denumire === "string" ? structured.denumire : undefined,
          cui: cleanedCui || undefined,
          adresa: typeof structured.adresa === "string" ? structured.adresa : undefined,
          localitate: typeof structured.localitate === "string" ? structured.localitate : undefined,
          judet: typeof structured.judet === "string" ? structured.judet : undefined,
          email: typeof structured.email === "string" ? structured.email : undefined,
          telefon: typeof structured.telefon === "string" ? structured.telefon : undefined,
          website: typeof structured.website === "string" ? structured.website : undefined,
          codCaenPrincipal:
            typeof structured.cod_caen_principal === "string"
              ? structured.cod_caen_principal
              : undefined,
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{aiStructuring}', ${JSON.stringify(
            {
              confidence,
              structured,
              appliedAt: new Date().toISOString(),
            },
          )}::jsonb)`,
          lastEnrichedAt: new Date(),
        })
        .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

      await db.insert(silverEnrichmentLog).values({
        tenantId: job.data.tenantId,
        entityType: "company",
        entityId: job.data.companyId,
        source: "ai_structuring",
        operation: "structure",
        requestPayload: { rawData: job.data.rawData },
        responsePayload: structured,
        fieldsUpdated: [
          "denumire",
          "cui",
          "adresa",
          "localitate",
          "judet",
          "email",
          "telefon",
          "website",
          "codCaenPrincipal",
          "metadata",
        ],
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });

      return { ok: true, status: "success", confidence };
    },
    { tenantId: job.data.tenantId },
  );
};
