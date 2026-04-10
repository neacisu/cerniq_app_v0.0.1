import type { Processor } from "bullmq";
import { withCognitiveSpan, importMutationTotal } from "@cerniq/worker-shared";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getTermeneActionari } from "../lib/termene-api-client.js";
import { upsertSilverContact } from "./company-enrichment-utils.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";
import { createJobLogger } from "../lib/job-logger.js";

const svcLog = createServiceLogger("e4-termene-associates", { etapa: "e1" });
const TERMENE_ENDPOINT = "termene/actionari";

export type TermeneAssociatesJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const termeneAssociatesProcessor: Processor<TermeneAssociatesJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:termene-actionari",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "E4:termene-associates",
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
          "E4 Termene acționari",
        );
        log.step("termene_request", "Apel Termene acționari", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
        });
        await setSessionTenantId(job.data.tenantId);

        const payload = await getTermeneActionari(cleanedCui);
        log.info("termene_response", "Răspuns Termene", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
          found: Boolean(payload),
          latencyMs: Date.now() - startedAt,
        });
        const actionari = Array.isArray(payload?.actionari)
          ? (payload?.actionari as Array<Record<string, unknown>>)
          : [];
        const administratori = Array.isArray(payload?.administratori)
          ? (payload?.administratori as Array<Record<string, unknown>>)
          : [];

        for (const person of [...actionari, ...administratori]) {
          const fullName = String(person.nume ?? person.name ?? "").trim();
          if (!fullName) continue;
          const role = String(person.functie ?? person.role ?? "ASOCIAT");
          const isDecisionMaker = /administrator|director|ceo|cfo|manager/i.test(role);
          await upsertSilverContact({
            tenantId: job.data.tenantId,
            companyId: job.data.companyId,
            fullName,
            functie: role,
            isDecisionMaker,
            metadata: { source: "termene_associates", raw: person },
          });
        }

        await db
          .update(silverCompanies)
          .set({
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{termeneAssociates}', ${JSON.stringify(
              {
                actionariCount: actionari.length,
                administratoriCount: administratori.length,
                payload,
              },
            )}::jsonb)`,
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
          source: "termene_actionari",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: payload,
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        await markEnrichmentSourceComplete(
          job.data.tenantId,
          job.data.companyId,
          "termene_actionari",
          job.data.correlationId,
        );

        log.step("done", "Termene acționari: finalizat", {
          cui: cleanedCui,
          endpoint: TERMENE_ENDPOINT,
          actionariCount: actionari.length,
          administratoriCount: administratori.length,
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: payload ? "success" : "not_found",
          source: "termene_actionari",
          cleanedCui,
          actionariCount: actionari.length,
          administratoriCount: administratori.length,
        };
      } catch (error) {
        log.error(
          "fatal",
          `Termene acționari eșuat: ${error instanceof Error ? error.message : String(error)}`,
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
