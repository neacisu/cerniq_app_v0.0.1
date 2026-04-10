import type { Processor } from "bullmq";
import { createHash } from "node:crypto";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { INFRAQ_REASONING_MODEL, withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";
import { infraqStructuredJson } from "../lib/infraq-structured-json.js";

const svcLog = createServiceLogger("j4-ai-fallback", { etapa: "e1" });

function promptPrefixSha256(prompt: string): string {
  return createHash("sha256").update(prompt.slice(0, 500), "utf8").digest("hex");
}

export type AiFallbackJobData = {
  tenantId: string;
  companyId: string;
  missingFields: string[];
  correlationId?: string;
};

const J4_ALLOWED_FALLBACK_FIELDS = new Set([
  "email",
  "telefon",
  "website",
  "adresa",
  "localitate",
  "judet",
  "denumire",
  "cod_caen_principal",
]);

export function buildJ4SilverUpdatesFromFoundData(
  foundData: Record<string, Record<string, unknown>>,
): { updates: Record<string, unknown>; applied: string[] } {
  const updates: Record<string, unknown> = {};
  const applied: string[] = [];

  for (const [field, payload] of Object.entries(foundData)) {
    const confidence = Number(payload.confidence ?? 0);
    if (confidence < 0.6) continue;
    if (
      typeof payload.value !== "string" &&
      typeof payload.value !== "number" &&
      typeof payload.value !== "boolean"
    ) {
      continue;
    }
    if (!J4_ALLOWED_FALLBACK_FIELDS.has(field)) continue;
    const column = field === "cod_caen_principal" ? "codCaenPrincipal" : field;
    updates[column] = String(payload.value);
    applied.push(field);
  }

  return { updates, applied };
}

export const aiFallbackProcessor: Processor<AiFallbackJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ai:fallback-infraq",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "J4:ai-fallback",
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
          "J4 AI fallback",
        );
        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) return { ok: false, status: "not_found" };

        const systemPrompt = "Esti asistent de research business. Returnezi doar JSON.";
        userPrompt = `Completeaza campurile lipsa pentru compania:
denumire=${company.denumire ?? ""}
cui=${company.cui ?? ""}
judet=${company.judet ?? ""}
campuri_lipsa=${job.data.missingFields.join(",")}

Returneaza {"found_data":{"camp":{"value":"...","source":"...","confidence":0.0}},"not_found":[]}`;

        const result = await infraqStructuredJson(systemPrompt, userPrompt);
        const foundData =
          result.found_data && typeof result.found_data === "object"
            ? (result.found_data as Record<string, Record<string, unknown>>)
            : {};
        const { updates, applied } = buildJ4SilverUpdatesFromFoundData(foundData);

        if (Object.keys(updates).length > 0) {
          await db
            .update(silverCompanies)
            .set({
              ...updates,
              metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{aiFallback}', ${JSON.stringify(
                {
                  result,
                  applied,
                  fallbackAt: new Date().toISOString(),
                },
              )}::jsonb)`,
              lastEnrichedAt: new Date(),
            })
            .where(sql`${silverCompanies.id} = ${job.data.companyId}`);
        }

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "ai_fallback",
          operation: "enrich",
          requestPayload: { missingFields: job.data.missingFields },
          responsePayload: result,
          fieldsUpdated: applied,
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "Fallback AI finalizat", {
          modelUsed: INFRAQ_REASONING_MODEL,
          latencyMs: Date.now() - startedAt,
          confidenceScore: applied.length > 0 ? 0.75 : 0,
        });
        return {
          ok: true,
          status: "success",
          applied: applied.length,
          notFound: (result.not_found as unknown[] | undefined)?.length ?? 0,
        };
      } catch (error) {
        log.error(
          "fatal",
          `AI fallback eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
