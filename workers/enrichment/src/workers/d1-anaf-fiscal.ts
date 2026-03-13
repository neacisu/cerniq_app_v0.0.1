import type { Processor } from "bullmq";
import {
  db,
  silverCompanies,
  silverEnrichmentLog,
  setSessionTenantId,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import { normalizeNrRegCom } from "@cerniq/worker-shared";
import { fetchAnafRecordByCui } from "../lib/anaf-api-client.js";
import { sanitizeCui } from "../lib/cui-validation.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type AnafFiscalJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function extractNrRegCom(record: Record<string, unknown>): {
  raw: string | null;
  canonical: string | null;
} {
  const raw =
    (typeof record.nrRegCom === "string" && record.nrRegCom) ||
    (typeof record.nr_reg_com === "string" && record.nr_reg_com) ||
    (typeof record.nrRegComert === "string" && record.nrRegComert) ||
    (typeof record.nr_reg_comert === "string" && record.nr_reg_comert) ||
    (typeof record.numar_reg_comert === "string" && record.numar_reg_comert) ||
    null;
  return { raw, canonical: raw ? normalizeNrRegCom(raw) : null };
}

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
    await markEnrichmentSourceComplete(
      job.data.tenantId,
      job.data.companyId,
      "anaf_fiscal",
      job.data.correlationId,
    );
    return { ok: true, status: "not_found", source: "anaf_fiscal", cleanedCui };
  }

  const denumire = String(record.denumire ?? record.denumire_firma ?? "").trim() || null;
  const adresa = String(record.adresa ?? "").trim() || null;
  const statusFirma = mapStatus(record.stare_inregistrare ?? record.stare);
  const codCaenPrincipal = String(record.caen ?? record.cod_CAEN ?? "").trim() || null;
  const nrRegCom = extractNrRegCom(record as Record<string, unknown>);

  await db
    .update(silverCompanies)
    .set({
      cui: cleanedCui,
      denumire: denumire ?? undefined,
      adresa: adresa ?? undefined,
      statusFirma,
      codCaenPrincipal: codCaenPrincipal ?? undefined,
      nrRegCom: nrRegCom.canonical ?? undefined,
      nrRegComOriginal: nrRegCom.raw ?? undefined,
      lastEnrichedAt: new Date(),
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify({ anafFiscal: record })}::jsonb`,
    })
    .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

  await upsertCompanyIdentityKey({
    tenantId: job.data.tenantId,
    companyId: job.data.companyId,
    keyType: "cui",
    keyValueCanonical: cleanedCui,
    keyValueOriginal: cleanedCui,
    sourceAuthority: "anaf",
    isAuthoritative: true,
  });
  if (nrRegCom.canonical) {
    await upsertCompanyIdentityKey({
      tenantId: job.data.tenantId,
      companyId: job.data.companyId,
      keyType: "nr_reg_com",
      keyValueCanonical: nrRegCom.canonical,
      keyValueOriginal: nrRegCom.raw,
      sourceAuthority: "anaf",
    });
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: "company",
    entityId: job.data.companyId,
    source: "anaf_fiscal",
    operation: "fetch",
    requestPayload: { cui: cleanedCui },
    responsePayload: record,
    fieldsUpdated: ["denumire", "adresa", "statusFirma", "codCaenPrincipal", "cui", "nrRegCom"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });
  await markEnrichmentSourceComplete(
    job.data.tenantId,
    job.data.companyId,
    "anaf_fiscal",
    job.data.correlationId,
  );

  return {
    ok: true,
    status: "success",
    source: "anaf_fiscal",
    cleanedCui,
  };
};
