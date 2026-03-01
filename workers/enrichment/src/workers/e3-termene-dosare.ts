import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getTermeneDosare } from "../lib/termene-api-client.js";

export type TermeneDosareJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

export const termeneDosareProcessor: Processor<TermeneDosareJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const payload = await getTermeneDosare(cleanedCui);
  const cases = Array.isArray(payload?.dosare)
    ? (payload?.dosare as Array<Record<string, unknown>>)
    : [];
  const activeCases = cases.filter((d) => String(d.status ?? "").toUpperCase() === "ACTIV");
  const inInsolventa = activeCases.some((d) => {
    const tip = String(d.tip_dosar ?? d.tip ?? "").toLowerCase();
    return tip.includes("insolventa") || tip.includes("faliment");
  });
  const areExecutariSilite = activeCases.some((d) => {
    const tip = String(d.tip_dosar ?? d.tip ?? "").toLowerCase();
    return tip.includes("executare");
  });
  const tipuri = Array.from(
    new Set(
      activeCases
        .map((d) => String(d.tip_dosar ?? d.tip ?? "").trim())
        .filter((value) => value.length > 0),
    ),
  );

  await db
    .update(silverCompanies)
    .set({
      statusFirma: inInsolventa ? "INSOLVENTA" : undefined,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        termeneDosare: {
          totalCases: cases.length,
          activeCases: activeCases.length,
          inInsolventa,
          areExecutariSilite,
          tipuri,
          payload,
        },
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "termene_dosare",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: payload,
    fieldsUpdated: ["statusFirma", "metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: payload ? "success" : "not_found",
    source: "termene_dosare",
    cleanedCui,
    activeCases: activeCases.length,
    inInsolventa,
    areExecutariSilite,
  };
};
