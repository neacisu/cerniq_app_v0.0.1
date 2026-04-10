import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("l5-animale-classifier", { etapa: "e1" });

export type AnimaleClassifierJobData = {
  tenantId: string;
  companyId: string;
  animaleRaw?: string[];
  codCaen?: string;
  correlationId?: string;
};

const ANIMALS_CAEN: Record<string, { type: string; category: string }> = {
  "0141": { type: "bovine", category: "ZOOTEHNIE_MARE" },
  "0142": { type: "bovine_lapte", category: "LAPTE" },
  "0145": { type: "ovine_caprine", category: "ZOOTEHNIE_MICA" },
  "0146": { type: "porcine", category: "ZOOTEHNIE_MARE" },
  "0147": { type: "pasari", category: "AVICULTURA" },
};

export const animaleClassifierProcessor: Processor<AnimaleClassifierJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:agri:animale",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "L5:animale-classifier",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info({ tenantId: job.data.tenantId, companyId: job.data.companyId }, "L5 animale");

        const company = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!company) return { ok: false, status: "not_found" };

        const caen = job.data.codCaen ?? company.codCaenPrincipal ?? "";
        const caenInfo = caen ? ANIMALS_CAEN[caen] : undefined;
        const types = [
          ...new Set([...(job.data.animaleRaw ?? []), ...(caenInfo ? [caenInfo.type] : [])]),
        ];
        const category =
          caenInfo?.category ?? (types.length > 0 ? "ALTA_ZOOTEHNIE" : "FARA_ANIMALE");

        await db
          .update(silverCompanies)
          .set({
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{agriculturalAnimals}', ${JSON.stringify(
              {
                types,
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
          source: "animale_classifier",
          operation: "classify",
          requestPayload: { animaleRaw: job.data.animaleRaw ?? null, codCaen: caen || null },
          responsePayload: { types, category },
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "Animale clasificate", {
          latencyMs: Date.now() - startedAt,
          fieldsExtracted: { typeCount: types.length, category },
        });
        return { ok: true, status: "success", animals: types.length, category };
      } catch (error) {
        log.error(
          "fatal",
          `Animale classifier eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
