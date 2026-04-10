import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("l4-culturi-classifier", { etapa: "e1" });

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

        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) return { ok: false, status: "not_found" };

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
        return { ok: true, status: "success", crops: crops.length, category };
      } catch (error) {
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
    { tenantId: job.data.tenantId },
  );
};
