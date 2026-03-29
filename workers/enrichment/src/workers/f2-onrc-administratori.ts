import type { Processor } from "bullmq";
import { withCognitiveSpan, importMutationTotal } from "@cerniq/worker-shared";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getOnrcAdministratori } from "../lib/onrc-api-client.js";
import { upsertSilverContact } from "./company-enrichment-utils.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type OnrcAdministratoriJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const onrcAdministratoriProcessor: Processor<OnrcAdministratoriJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:onrc-administratori",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      await setSessionTenantId(job.data.tenantId);

      const payload = await getOnrcAdministratori(cleanedCui);
      const administratori = Array.isArray(payload?.administratori)
        ? (payload?.administratori as Array<Record<string, unknown>>)
        : [];

      for (const admin of administratori) {
        const fullName = String(admin.nume_complet ?? admin.nume ?? admin.name ?? "").trim();
        if (!fullName) continue;
        const role = String(admin.functie ?? "ADMINISTRATOR");
        const isDecisionMaker = /administrator unic|director|ceo|cfo|manager/i.test(role);
        await upsertSilverContact({
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          fullName,
          functie: role,
          isDecisionMaker,
          metadata: { source: "onrc_admin", raw: admin },
        });
      }

      await db
        .update(silverCompanies)
        .set({
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{onrcAdministratori}', ${JSON.stringify({ count: administratori.length, payload })}::jsonb)`,
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
        source: "onrc_admin",
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
        "onrc_administratori",
        job.data.correlationId,
      );

      return {
        ok: true,
        status: payload ? "success" : "not_found",
        source: "onrc_admin",
        cleanedCui,
        count: administratori.length,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
