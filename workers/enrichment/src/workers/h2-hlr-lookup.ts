import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { withCognitiveSpan } from "@cerniq/worker-shared";
import {
  db,
  setSessionTenantId,
  silverCompanies,
  silverContacts,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import { hlrLookup } from "../lib/hlr-api-client.js";
import { createJobLogger } from "../lib/job-logger.js";
import { phoneLast4 } from "../lib/phone-last4.js";

const svcLog = createServiceLogger("h2-hlr-lookup", { etapa: "e1" });

export type HlrLookupJobData = {
  tenantId: string;
  entityType: "company" | "contact";
  entityId: string;
  phone: string;
  correlationId?: string;
};

export const hlrLookupProcessor: Processor<HlrLookupJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:phone-hlr",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "H2:hlr-lookup",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: job.data.entityType,
        entityId: job.data.entityId,
      });

      try {
        svcLog.info(
          {
            tenantId: job.data.tenantId,
            phoneLast4: phoneLast4(job.data.phone),
            entityType: job.data.entityType,
          },
          "H2 HLR lookup",
        );
        log.step("hlr_request", "Apel HLR", {
          phoneLast4: phoneLast4(job.data.phone),
          endpoint: "hlr/lookup",
        });
        await setSessionTenantId(job.data.tenantId);

        const result = await hlrLookup(job.data.phone);
        log.info("hlr_response", "Răspuns HLR", {
          phoneLast4: phoneLast4(job.data.phone),
          hasResult: Boolean(result),
          latencyMs: Date.now() - startedAt,
        });
        const patch = {
          hlrLookup: {
            phone: job.data.phone,
            status: result?.status ?? null,
            reachable: result?.reachable ?? null,
            carrier: result?.carrier ?? null,
            carrierType: result?.carrier_type ?? null,
            countryCode: result?.country_code ?? null,
            mccMnc: result?.mcc_mnc ?? null,
            ported: result?.ported ?? null,
            checkedAt: new Date().toISOString(),
          },
        };

        if (job.data.entityType === "company") {
          await db
            .update(silverCompanies)
            .set({
              metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{hlrLookup}', ${JSON.stringify(patch.hlrLookup)}::jsonb)`,
              updatedAt: new Date(),
            })
            .where(sql`${silverCompanies.id} = ${job.data.entityId}`);
        } else {
          await db
            .update(silverContacts)
            .set({
              metadata: sql`jsonb_set(COALESCE(${silverContacts.metadata}, '{}'::jsonb), '{hlrLookup}', ${JSON.stringify(patch.hlrLookup)}::jsonb)`,
              updatedAt: new Date(),
            })
            .where(sql`${silverContacts.id} = ${job.data.entityId}`);
        }

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: job.data.entityType,
          entityId: job.data.entityId,
          source: "hlr_lookup",
          operation: "lookup",
          requestPayload: { phone: job.data.phone },
          responsePayload: result,
          fieldsUpdated: ["metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "HLR finalizat", {
          phoneLast4: phoneLast4(job.data.phone),
          latencyMs: Date.now() - startedAt,
        });

        return {
          ok: true,
          status: result ? "success" : "not_found",
          reachable: result?.reachable ?? null,
          carrier: result?.carrier ?? null,
        };
      } catch (error) {
        log.error(
          "fatal",
          `HLR lookup eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: job.data.entityType,
              entityId: job.data.entityId,
              phoneLast4: phoneLast4(job.data.phone),
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
