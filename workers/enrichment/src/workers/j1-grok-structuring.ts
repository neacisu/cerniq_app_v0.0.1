import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { INFRAQ_REASONING_MODEL, withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger, type JobLogger } from "../lib/job-logger.js";
import { sanitizeCui, validateCuiModulo11 } from "../lib/cui-validation.js";
import { infraqStructuredJson } from "../lib/infraq-structured-json.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";

const svcLog = createServiceLogger("j1-grok-structuring", { etapa: "e1" });

function promptPrefixSha256(prompt: string): string {
  return createHash("sha256").update(prompt.slice(0, 500), "utf8").digest("hex");
}

export type GrokStructuringJobData = {
  tenantId: string;
  companyId: string;
  rawData: Record<string, unknown>;
  correlationId?: string;
};

async function routeJ1StructuringToHitl(
  job: GrokStructuringJobData,
  log: JobLogger,
  structured: Record<string, unknown>,
  confidence: number,
  cuiValidation: ReturnType<typeof validateCuiModulo11> | null,
  startedAt: number,
): Promise<{ ok: true; status: "hitl_required"; confidence: number }> {
  await createHitlApprovalTask({
    tenantId: job.tenantId,
    entityType: "company",
    entityId: job.companyId,
    type: "ai_structuring_review",
    title: "Revizuire AI structuring",
    description: "Date structurate AI necesita revizie umana",
    aiConfidence: confidence,
    aiRecommendation: confidence >= 0.6 ? "review" : "reject",
    aiReasoning: JSON.stringify({ cuiValidation }),
    urgency: "medium",
    metadata: { rawData: job.rawData, structured, cuiValidation },
    expiresInHours: 48,
  });
  log.info("ai", "Structurare HITL", {
    modelUsed: INFRAQ_REASONING_MODEL,
    latencyMs: Date.now() - startedAt,
    confidenceScore: confidence,
  });
  return { ok: true, status: "hitl_required", confidence };
}

async function applyJ1StructuredDataToSilver(
  job: GrokStructuringJobData,
  log: JobLogger,
  bullmqJobId: string,
  structured: Record<string, unknown>,
  cleanedCui: string,
  confidence: number,
  startedAt: number,
): Promise<{ ok: true; status: "success"; confidence: number }> {
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
    .where(sql`${silverCompanies.id} = ${job.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.tenantId,
    entityType: "company",
    entityId: job.companyId,
    source: "ai_structuring",
    operation: "structure",
    requestPayload: { rawData: job.rawData },
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
    correlationId: job.correlationId,
    jobId: bullmqJobId,
    durationMs: Date.now() - startedAt,
  });

  log.step("done", "Structurare aplicată", {
    modelUsed: INFRAQ_REASONING_MODEL,
    latencyMs: Date.now() - startedAt,
    confidenceScore: confidence,
  });
  return { ok: true, status: "success", confidence };
}

export const grokStructuringProcessor: Processor<GrokStructuringJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ai:structure-infraq",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "J1:grok-structuring",
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
        svcLog.info(
          { tenantId: job.data.tenantId, companyId: job.data.companyId },
          "J1 AI structuring",
        );

        const systemPrompt =
          "Esti expert in structurarea datelor business din Romania. Returneaza strict JSON valid, fara text extra.";
        userPrompt = `Normalizeaza urmatorul payload brut de companie:\n${JSON.stringify(
          job.data.rawData,
          null,
          2,
        )}\nSchema JSON dorita: {"denumire":"","cui":"","adresa":"","localitate":"","judet":"","email":"","telefon":"","website":"","cod_caen_principal":"","is_agricol":false,"confidence":0.0}`;

        const structured = await infraqStructuredJson(systemPrompt, userPrompt);
        const confidence = Number(structured.confidence ?? 0.5);
        const cleanedCui = sanitizeCui(String(structured.cui ?? ""));
        const cuiValidation = cleanedCui ? validateCuiModulo11(cleanedCui) : null;

        const canAutoApply =
          confidence >= 0.7 && (!cleanedCui || (cuiValidation?.isValid ?? false));
        if (!canAutoApply) {
          return await routeJ1StructuringToHitl(
            job.data,
            log,
            structured,
            confidence,
            cuiValidation,
            startedAt,
          );
        }

        return await applyJ1StructuredDataToSilver(
          job.data,
          log,
          String(job.id ?? ""),
          structured,
          cleanedCui,
          confidence,
          startedAt,
        );
      } catch (error) {
        log.error(
          "fatal",
          `AI structuring eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
