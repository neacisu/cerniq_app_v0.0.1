import type { Processor } from "bullmq";
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
      await setSessionTenantId(job.data.tenantId);

      const result = await hlrLookup(job.data.phone);
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

      return {
        ok: true,
        status: result ? "success" : "not_found",
        reachable: result?.reachable ?? null,
        carrier: result?.carrier ?? null,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
