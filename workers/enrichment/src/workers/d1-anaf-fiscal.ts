import type { Processor } from "bullmq";
import { db, silverCompanies, silverEnrichmentLog, setSessionTenantId, sql } from "@cerniq/db";
import { fetchAnafRecordByCui } from "../lib/anaf-api-client.js";
import { sanitizeCui } from "../lib/cui-validation.js";

export type AnafFiscalJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function mapStatus(value: unknown): "ACTIVA" | "INACTIVA" | "DIZOLVARE" | "RADIATA" | "INSOLVENTA" {
  const status = String(value ?? "").toUpperCase();
  if (status.includes("RADIAT")) return "RADIATA";
  if (status.includes("INACT")) return "INACTIVA";
  if (status.includes("INSOLV")) return "INSOLVENTA";
  if (status.includes("DIZOLV")) return "DIZOLVARE";
  return "ACTIVA";
}

export const anafFiscalProcessor: Processor<AnafFiscalJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  await setSessionTenantId(job.data.tenantId);

  const record = await fetchAnafRecordByCui(cleanedCui);
  if (!record) {
    await db.insert(silverEnrichmentLog).values({
      tenantId: job.data.tenantId,
      entityType: "company",
      entityId: job.data.companyId,
      source: "anaf_fiscal",
      operation: "fetch",
      requestPayload: { cui: cleanedCui },
      responsePayload: null,
      fieldsUpdated: [],
      correlationId: job.data.correlationId,
      jobId: String(job.id ?? ""),
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, status: "not_found", source: "anaf_fiscal", cleanedCui };
  }

  const denumire = String(record.denumire ?? record.denumire_firma ?? "").trim() || null;
  const adresa = String(record.adresa ?? "").trim() || null;
  const statusFirma = mapStatus(record.stare_inregistrare ?? record.stare);
  const codCaenPrincipal = String(record.caen ?? record.cod_CAEN ?? "").trim() || null;

  await db
    .update(silverCompanies)
    .set({
      denumire: denumire ?? undefined,
      adresa: adresa ?? undefined,
      statusFirma,
      codCaenPrincipal: codCaenPrincipal ?? undefined,
      lastEnrichedAt: new Date(),
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({ anafFiscal: record })}::jsonb`,
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "anaf_fiscal",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: record,
    fieldsUpdated: ["denumire", "adresa", "statusFirma", "codCaenPrincipal"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    status: "success",
    source: "anaf_fiscal",
    cleanedCui,
  };
};
