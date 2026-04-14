import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import {
  cognitiveAgriCulturiOutcomeTotal,
  emitCognitiveEvent,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";
import { buildCognitiveWorkerEventContext } from "../lib/execution-correlation.js";

const svcLog = createServiceLogger("l4-culturi-classifier", { etapa: "e1" });

const L4_NODE_KEY = "e1:agri:culturi" as const;

function l4EmitPhase(
  ctx: ReturnType<typeof buildCognitiveWorkerEventContext>,
  phase: string,
  data: Record<string, unknown> = {},
): void {
  if (!ctx.tenantId) return;
  void emitCognitiveEvent(
    L4_NODE_KEY,
    {
      eventType: `phase_${phase}`,
      data: { phase, worker: "L4:culturi-classifier", ...data },
    },
    ctx,
  ).catch(() => undefined);
}

export type CulturiClassifierJobData = {
  tenantId: string;
  companyId: string;
  culturiRaw?: string[];
  codCaen?: string;
  correlationId?: string;
};

const CULTURES_MAP: Record<string, string[]> = {
  "0111": ["cereale", "grau", "porumb", "orz", "ovaz"],
  "0113": ["legume", "cartofi", "rosii", "castraveti"],
  "0121": ["struguri", "vita de vie"],
  "0123": ["fructe", "mere", "pere", "prune"],
  "0126": ["oleaginoase", "floarea soarelui", "rapita"],
};

function determineCategory(
  crops: string[],
): "CEREALE" | "LEGUME" | "FRUCTE" | "OLEAGINOASE" | "DIVERSE" {
  const joined = crops.join(" ").toLowerCase();
  if (/(grau|porumb|orz|ovaz|cereale)/.test(joined)) return "CEREALE";
  if (/(legume|cartofi|rosii|castraveti)/.test(joined)) return "LEGUME";
  if (/(fruct|mere|pere|prune|struguri)/.test(joined)) return "FRUCTE";
  if (/(rapita|floarea soarelui|oleaginoase)/.test(joined)) return "OLEAGINOASE";
  return "DIVERSE";
}

export const culturiClassifierProcessor: Processor<CulturiClassifierJobData> = async (job) => {
  const spanCtx = buildCognitiveWorkerEventContext(
    job.data.tenantId,
    job.data.correlationId,
    job.data,
  );
  return withCognitiveSpan(
    "e1:agri:culturi",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "L4:culturi-classifier",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "L4 culturi");

        l4EmitPhase(spanCtx, "classify_start", {
          jobId: String(job.id ?? ""),
          progress: 15,
        });

        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) {
          l4EmitPhase(spanCtx, "not_found", { jobId: String(job.id ?? ""), progress: 100 });
          cognitiveAgriCulturiOutcomeTotal.inc({ outcome: "not_found" });
          return { ok: false, status: "not_found" };
        }

        const effectiveCaen = job.data.codCaen ?? company.codCaenPrincipal ?? null;
        const fromCaen = effectiveCaen ? (CULTURES_MAP[effectiveCaen] ?? []) : [];
        const crops = [
          ...new Set(
            [...(job.data.culturiRaw ?? []), ...fromCaen].map((c) => c.trim()).filter(Boolean),
          ),
        ];
        const category = determineCategory(crops);

        await db
          .update(silverCompanies)
          .set({
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{agriculturalCrops}', ${JSON.stringify(
              {
                crops,
                category,
                classifiedAt: new Date().toISOString(),
              },
            )}::jsonb)`,
            updatedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "culturi_classifier",
          operation: "classify",
          requestPayload: {
            culturiRaw: job.data.culturiRaw ?? null,
            codCaen: job.data.codCaen ?? company.codCaenPrincipal ?? null,
          },
          responsePayload: { crops, category },
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "Culturi clasificate", {
          latencyMs: Date.now() - startedAt,
          fieldsExtracted: { cropCount: crops.length, category },
        });
        l4EmitPhase(spanCtx, "metadata_persisted", {
          jobId: String(job.id ?? ""),
          progress: 100,
          category,
          cropCount: crops.length,
        });
        cognitiveAgriCulturiOutcomeTotal.inc({ outcome: "success" });
        return { ok: true, status: "success", crops: crops.length, category };
      } catch (error) {
        cognitiveAgriCulturiOutcomeTotal.inc({ outcome: "error" });
        log.error(
          "fatal",
          `Culturi classifier eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
            }),
          },
        );
        throw error;
      }
    },
    spanCtx,
  );
};
