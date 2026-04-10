import type { Processor } from "bullmq";
import { withCognitiveSpan, importMutationTotal } from "@cerniq/worker-shared";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getTermeneBalance } from "../lib/termene-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("e1-termene-balance", { etapa: "e1" });
const TERMENE_ENDPOINT = "termene/balance";

export type TermeneBalanceJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const termeneBalanceProcessor: Processor<TermeneBalanceJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:termene-balance",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "E1:termene-balance",
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
          "E1 Termene balance",
        );
        log.step("termene_request", "Apel Termene balance", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
        });
        await setSessionTenantId(job.data.tenantId);

        const payload = await getTermeneBalance(cleanedCui);
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
            source: "termene_balance",
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
            "termene_balance",
            job.data.correlationId,
          );
          log.step("done", "Termene balance: negăsit", {
            cui: cleanedCui,
            endpoint: TERMENE_ENDPOINT,
          });
          return { ok: true, status: "not_found", source: "termene_balance", cleanedCui };
        }

        const cifraAfaceri =
          typeof payload.cifra_afaceri === "number"
            ? payload.cifra_afaceri
            : Number(payload.cifra_afaceri ?? Number.NaN);
        const profitNet =
          typeof payload.profit_net === "number"
            ? payload.profit_net
            : Number(payload.profit_net ?? Number.NaN);
        const numarAngajati =
          typeof payload.numar_angajati === "number"
            ? payload.numar_angajati
            : Number.parseInt(String(payload.numar_angajati ?? "NaN"), 10);

        await db
          .update(silverCompanies)
          .set({
            cifraAfaceri: Number.isFinite(cifraAfaceri) ? String(cifraAfaceri) : undefined,
            profitNet: Number.isFinite(profitNet) ? String(profitNet) : undefined,
            numarAngajati: Number.isFinite(numarAngajati) ? numarAngajati : undefined,
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{termeneBalance}', ${JSON.stringify(payload)}::jsonb)`,
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
          source: "termene_balance",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: payload,
          fieldsUpdated: ["cifraAfaceri", "profitNet", "numarAngajati", "metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        await markEnrichmentSourceComplete(
          job.data.tenantId,
          job.data.companyId,
          "termene_balance",
          job.data.correlationId,
        );

        log.step("done", "Termene balance: succes", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
          latencyMs: Date.now() - startedAt,
        });

        return { ok: true, status: "success", source: "termene_balance", cleanedCui };
      } catch (error) {
        log.error(
          "fatal",
          `Termene balance eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
