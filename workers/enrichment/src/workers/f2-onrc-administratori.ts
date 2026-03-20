import type { Processor } from "bullmq";
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
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        onrcAdministratori: { count: administratori.length, payload },
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

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
};
