/**
 * @deprecated Use d0-anaf-full-fetch.ts (QUEUES.ENRICH_ANAF_FULL) instead.
 * Kept as reference implementation. Not registered as an active worker in main.ts.
 */
import type { Processor } from "bullmq";
import {
  db,
  silverCompanies,
  silverEnrichmentLog,
  setSessionTenantId,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import { sanitizeNrRegCom, sanitizeCui, withCognitiveSpan } from "@cerniq/worker-shared";
import { fetchAnafSingleByCui, type AnafV9CompanyRecord } from "../lib/anaf-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type AnafFiscalJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

const NEW_NR_REG_COM_RE = /^[JFC]\d{4}\d{6}\d{2}\d$/i;

function extractNrRegCom(record: AnafV9CompanyRecord): {
  raw: string | null;
  sanitized: string | null;
  isCanonicalNew: boolean;
} {
  const raw = record.date_generale?.nrRegCom;
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    return { raw: null, sanitized: null, isCanonicalNew: false };
  }
  const sanitized = sanitizeNrRegCom(raw.trim());
  const isCanonicalNew = sanitized !== null && NEW_NR_REG_COM_RE.test(sanitized);
  return { raw: raw.trim(), sanitized, isCanonicalNew };
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
  return withCognitiveSpan(
    "e1:enrich:anaf-fiscal",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      await setSessionTenantId(job.data.tenantId);

      const record = await fetchAnafSingleByCui(cleanedCui);
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

      const dg = record.date_generale;
      const denumire = dg.denumire?.trim() || null;
      const adresa = dg.adresa?.trim() || null;
      const statusFirma = mapStatus(dg.stare_inregistrare);
      const nrRegCom = extractNrRegCom(record);

      const anafSummary = {
        cui: dg.cui,
        denumire: dg.denumire,
        adresa: dg.adresa,
        stare_inregistrare: dg.stare_inregistrare,
        cod_CAEN: dg.cod_CAEN,
        nrRegCom: dg.nrRegCom,
        statusRO_e_Factura: dg.statusRO_e_Factura,
      };

      await db
        .update(silverCompanies)
        .set({
          cui: cleanedCui,
          denumire: denumire ?? undefined,
          adresa: adresa ?? undefined,
          statusFirma,
          nrRegCom: nrRegCom.sanitized ?? undefined,
          nrRegComOriginal: nrRegCom.raw ?? undefined,
          nrRegComCanonical: nrRegCom.isCanonicalNew ? nrRegCom.sanitized : undefined,
          lastEnrichedAt: new Date(),
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{anafFiscal}', ${JSON.stringify(anafSummary)}::jsonb)`,
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
      if (nrRegCom.sanitized) {
        await upsertCompanyIdentityKey({
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          keyType: "nr_reg_com",
          keyValueCanonical: nrRegCom.sanitized,
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
        responsePayload: anafSummary,
        fieldsUpdated: ["denumire", "adresa", "statusFirma", "cui", "nrRegCom"],
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
    },
    { tenantId: job.data.tenantId },
  );
};
