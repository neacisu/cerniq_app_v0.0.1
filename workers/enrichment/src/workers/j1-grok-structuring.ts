import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import {
  INFRAQ_REASONING_MODEL,
  cognitiveAiStructureLlmSeconds,
  cognitiveAiStructureOutcomeTotal,
  emitCognitiveEvent,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger, type JobLogger } from "../lib/job-logger.js";
import { sanitizeCui, validateCuiModulo11 } from "../lib/cui-validation.js";
import { infraqStructuredJson } from "../lib/infraq-structured-json.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";
import { buildCognitiveWorkerEventContext } from "../lib/execution-correlation.js";

const svcLog = createServiceLogger("j1-grok-structuring", { etapa: "e1" });

const J1_STRUCTURE_NODE_KEY = "e1:ai:structure-xai" as const;

/** Faze granulare pentru SSE / `cognitive_events` (aliniat §5B plan E1). */
function j1EmitProcessingPhase(
  ctx: ReturnType<typeof buildCognitiveWorkerEventContext>,
  phase: string,
  data: Record<string, unknown> = {},
): void {
  if (!ctx.tenantId) return;
  void emitCognitiveEvent(
    J1_STRUCTURE_NODE_KEY,
    {
      eventType: `phase_${phase}`,
      data: {
        phase,
        worker: "J1:grok-structuring",
        ...data,
      },
    },
    ctx,
  ).catch(() => undefined);
}

function promptPrefixSha256(prompt: string): string {
  return createHash("sha256").update(prompt.slice(0, 500), "utf8").digest("hex");
}

/** Payload canonic cu snapshot brut pentru LLM. */
export type GrokStructuringJobData = {
  tenantId: string;
  companyId: string;
  correlationId?: string;
  /** Dacă e setat, este trimis direct la LLM. */
  rawData?: Record<string, unknown>;
  /** Câmpuri plate din P1 (`basePayload`) — folosite când `rawData` lipsește. */
  cui?: string | null;
  adresa?: string | null;
  localitate?: string | null;
};

const META_KEYS = new Set(["tenantId", "companyId", "correlationId", "rawData"]);

/** Rezolvă obiectul „brut” pentru prompt: `rawData` sau restul payload-ului fără meta-câmpuri. */
export function resolveGrokStructuringRawData(
  data: GrokStructuringJobData,
): Record<string, unknown> {
  if (data.rawData && typeof data.rawData === "object" && !Array.isArray(data.rawData)) {
    return data.rawData;
  }
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (META_KEYS.has(k)) continue;
    if (v !== undefined) rest[k] = v;
  }
  return rest;
}

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
    metadata: { rawData: resolveGrokStructuringRawData(job), structured, cuiValidation },
    expiresInHours: 48,
  });
  log.info("ai", "Structurare HITL", {
    modelUsed: INFRAQ_REASONING_MODEL,
    latencyMs: Date.now() - startedAt,
    confidenceScore: confidence,
  });
  cognitiveAiStructureOutcomeTotal.inc({ outcome: "hitl" });
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
    requestPayload: { rawData: resolveGrokStructuringRawData(job) },
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
  cognitiveAiStructureOutcomeTotal.inc({ outcome: "auto_applied" });
  return { ok: true, status: "success", confidence };
}

export const grokStructuringProcessor: Processor<GrokStructuringJobData> = async (job) => {
  const rawData = resolveGrokStructuringRawData(job.data);
  const spanCtx = buildCognitiveWorkerEventContext(
    job.data.tenantId,
    job.data.correlationId,
    job.data,
  );
  return withCognitiveSpan(
    "e1:ai:structure-xai",
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
          rawData,
          null,
          2,
        )}\nSchema JSON dorita: {"denumire":"","cui":"","adresa":"","localitate":"","judet":"","email":"","telefon":"","website":"","cod_caen_principal":"","is_agricol":false,"confidence":0.0}`;

        j1EmitProcessingPhase(spanCtx, "llm_request", {
          jobId: String(job.id ?? ""),
          progress: 10,
          model: INFRAQ_REASONING_MODEL,
        });
        const llmStarted = Date.now();
        const structured = await infraqStructuredJson(systemPrompt, userPrompt);
        const llmMs = Date.now() - llmStarted;
        cognitiveAiStructureLlmSeconds.observe(llmMs / 1000);
        j1EmitProcessingPhase(spanCtx, "llm_response", {
          jobId: String(job.id ?? ""),
          progress: 40,
          latencyMs: llmMs,
        });
        const confidence = Number(structured.confidence ?? 0.5);
        const cleanedCui = sanitizeCui(String(structured.cui ?? ""));
        const cuiValidation = cleanedCui ? validateCuiModulo11(cleanedCui) : null;

        const canAutoApply =
          confidence >= 0.7 && (!cleanedCui || (cuiValidation?.isValid ?? false));
        const jobDataForPersistence: GrokStructuringJobData = {
          ...job.data,
          rawData: Object.keys(rawData).length > 0 ? rawData : job.data.rawData,
        };

        j1EmitProcessingPhase(spanCtx, "validate_schema", {
          jobId: String(job.id ?? ""),
          progress: 60,
          canAutoApply,
          confidence,
          cuiValid: cleanedCui ? (cuiValidation?.isValid ?? false) : true,
        });

        if (!canAutoApply) {
          j1EmitProcessingPhase(spanCtx, "hitl_queued", {
            jobId: String(job.id ?? ""),
            progress: 75,
          });
          return await routeJ1StructuringToHitl(
            jobDataForPersistence,
            log,
            structured,
            confidence,
            cuiValidation,
            startedAt,
          );
        }

        j1EmitProcessingPhase(spanCtx, "silver_write", {
          jobId: String(job.id ?? ""),
          progress: 90,
        });
        return await applyJ1StructuredDataToSilver(
          jobDataForPersistence,
          log,
          String(job.id ?? ""),
          structured,
          cleanedCui,
          confidence,
          startedAt,
        );
      } catch (error) {
        cognitiveAiStructureOutcomeTotal.inc({ outcome: "error" });
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
    spanCtx,
  );
};
