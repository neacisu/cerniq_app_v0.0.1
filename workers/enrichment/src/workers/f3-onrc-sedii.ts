import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getOnrcSedii, getOnrcHistory } from "../lib/onrc-api-client.js";
import { upsertCompanyLocation } from "./company-enrichment-utils.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type OnrcSediiJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  includeHistory?: boolean;
  correlationId?: string;
};

function mapLocationType(
  value: string,
): "SEDIU_SOCIAL" | "PUNCT_LUCRU" | "SUCURSALA" | "DEPOZIT" | "FERMA" {
  const normalized = value.toUpperCase();
  if (normalized.includes("PUNCT")) return "PUNCT_LUCRU";
  if (normalized.includes("SUCURS")) return "SUCURSALA";
  if (normalized.includes("DEPOZ")) return "DEPOZIT";
  if (normalized.includes("FERM")) return "FERMA";
  return "SEDIU_SOCIAL";
}

export const onrcSediiProcessor: Processor<OnrcSediiJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const [sediiPayload, historyPayload] = await Promise.all([
    getOnrcSedii(cleanedCui),
    getOnrcHistory(cleanedCui),
  ]);

  const sedii = Array.isArray(sediiPayload?.sedii)
    ? (sediiPayload?.sedii as Array<Record<string, unknown>>)
    : [];

  for (const sediu of sedii) {
    await upsertCompanyLocation({
      tenantId: job.data.tenantId,
      companyId: job.data.companyId,
      tipLocatie: mapLocationType(String(sediu.tip ?? "SEDIU_SOCIAL")),
      adresa: String(sediu.adresa ?? sediu.address ?? "N/A"),
      localitate: String(sediu.localitate ?? "") || null,
      judet: String(sediu.judet ?? "") || null,
      source: "onrc",
    });
  }

  const historyEvents = Array.isArray(historyPayload?.events)
    ? (historyPayload?.events as Array<Record<string, unknown>>)
    : [];
  const historyData = {
    totalEvents: historyEvents.length,
    events: historyEvents.slice(0, 50).map((ev) => ({
      date: ev.date ?? ev.data ?? null,
      type: ev.type ?? ev.tipModificare ?? null,
      description: ev.description ?? ev.descriere ?? null,
      field: ev.field ?? ev.camp ?? null,
      oldValue: ev.oldValue ?? ev.valoareVeche ?? null,
      newValue: ev.newValue ?? ev.valoareNoua ?? null,
    })),
    fetchedAt: new Date().toISOString(),
  };

  await db
    .update(silverCompanies)
    .set({
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({
        onrcSedii: { count: sedii.length, payload: sediiPayload },
        onrcHistory: historyData,
      })}::jsonb`,
      lastEnrichedAt: new Date(),
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "onrc_sedii_history",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: { sediiCount: sedii.length, historyEventsCount: historyEvents.length },
    fieldsUpdated: ["metadata"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });
  await markEnrichmentSourceComplete(
    job.data.tenantId,
    job.data.companyId,
    "onrc_sedii",
    job.data.correlationId,
  );

  return {
    ok: true,
    status: sediiPayload || historyPayload ? "success" : "not_found",
    source: "onrc_sedii_history",
    cleanedCui,
    locationsCount: sedii.length,
    historyEventsCount: historyEvents.length,
  };
};
