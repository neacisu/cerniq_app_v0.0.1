import type { Processor } from "bullmq";
import {
  db,
  silverCompanies,
  silverEnrichmentLog,
  setSessionTenantId,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import { sanitizeCui, sanitizeNrRegCom } from "@cerniq/worker-shared";
import { fetchAnafSingleByCui, type AnafV9CompanyRecord } from "../lib/anaf-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";
import type { Redis } from "ioredis";

const CACHE_TTL_SECONDS = 300; // 5 minutes

export type AnafFullFetchJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function cacheKey(tenantId: string, cui: string): string {
  return `anaf:cache:${tenantId}:${cui}`;
}

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

function isAgriculturalCaen(code: string): boolean {
  const prefix = code.slice(0, 2);
  return prefix === "01" || prefix === "02" || prefix === "03";
}

async function getCachedRecord(
  redis: Redis,
  tenantId: string,
  cui: string,
): Promise<AnafV9CompanyRecord | null | "miss"> {
  const cached = await redis.get(cacheKey(tenantId, cui));
  if (cached === null) return "miss";
  if (cached === "null") return null;
  return JSON.parse(cached) as AnafV9CompanyRecord;
}

async function setCachedRecord(
  redis: Redis,
  tenantId: string,
  cui: string,
  record: AnafV9CompanyRecord | null,
): Promise<void> {
  const value = record === null ? "null" : JSON.stringify(record);
  await redis.set(cacheKey(tenantId, cui), value, "EX", CACHE_TTL_SECONDS);
}

export function createAnafFullFetchProcessor(redis: Redis): Processor<AnafFullFetchJobData> {
  return async (job) => {
    const startedAt = Date.now();
    const cleanedCui = sanitizeCui(job.data.cui);
    await setSessionTenantId(job.data.tenantId);

    const cached = await getCachedRecord(redis, job.data.tenantId, cleanedCui);
    let record: AnafV9CompanyRecord | null;

    if (cached === "miss") {
      record = await fetchAnafSingleByCui(cleanedCui);
      await setCachedRecord(redis, job.data.tenantId, cleanedCui, record);
    } else {
      record = cached;
    }

    if (!record) {
      const sources = [
        "anaf_fiscal",
        "anaf_tva",
        "anaf_efactura",
        "anaf_datorii",
        "anaf_caen",
      ] as const;
      for (const source of sources) {
        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source,
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
          source,
          job.data.correlationId,
        );
      }
      return { ok: true, status: "not_found", source: "anaf_full", cleanedCui };
    }

    const dg = record.date_generale;
    const denumire = dg.denumire?.trim() || null;
    const adresa = dg.adresa?.trim() || null;
    const statusFirma = mapStatus(dg.stare_inregistrare);
    const nrRegCom = extractNrRegCom(record);
    const codCaen = dg.cod_CAEN?.trim() ?? "";
    const agricultural = codCaen ? isAgriculturalCaen(codCaen) : false;
    const tvaActive = record.inregistrare_scop_Tva?.scpTVA ?? null;
    const tvaIncasare = record.inregistrare_RTVAI?.statusTvaIncasare ?? null;
    const inregistratEFactura = dg.statusRO_e_Factura ?? null;
    const inactive = record.stare_inactiv?.statusInactivi ?? false;

    const allFieldsUpdated: string[] = [];

    // D1: Fiscal status
    const anafSummary = {
      cui: dg.cui,
      denumire: dg.denumire,
      adresa: dg.adresa,
      stare_inregistrare: dg.stare_inregistrare,
      cod_CAEN: dg.cod_CAEN,
      nrRegCom: dg.nrRegCom,
      statusRO_e_Factura: dg.statusRO_e_Factura,
    };

    // D2: TVA
    const tvaSummary = {
      scpTVA: tvaActive,
      statusTvaIncasare: tvaIncasare,
      perioade_TVA: record.inregistrare_scop_Tva?.perioade_TVA ?? [],
    };

    // D3: eFactura
    const efacturaSummary = { inregistratEFactura };

    // D4: Datorii/Inactivitate
    const datoriiSummary = {
      statusInactivi: inactive,
      dataInactivare: record.stare_inactiv?.dataInactivare ?? null,
      dataReactivare: record.stare_inactiv?.dataReactivare ?? null,
      dataRadiere: record.stare_inactiv?.dataRadiere ?? null,
    };

    // D5: CAEN
    const caenSummary = { codCaen, agricultural };

    const combinedMetadata = {
      anafFiscal: anafSummary,
      anafTva: tvaSummary,
      anafEfactura: efacturaSummary,
      anafDatorii: datoriiSummary,
      anafCaen: caenSummary,
    };

    const updateSet: Record<string, unknown> = {
      cui: cleanedCui,
      lastEnrichedAt: new Date(),
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(combinedMetadata)}::jsonb`,
    };

    if (denumire) {
      updateSet.denumire = denumire;
      allFieldsUpdated.push("denumire");
    }
    if (adresa) {
      updateSet.adresa = adresa;
      allFieldsUpdated.push("adresa");
    }
    updateSet.statusFirma = inactive ? "INACTIVA" : statusFirma;
    allFieldsUpdated.push("statusFirma");
    if (nrRegCom.sanitized) {
      updateSet.nrRegCom = nrRegCom.sanitized;
      updateSet.nrRegComOriginal = nrRegCom.raw;
      if (nrRegCom.isCanonicalNew) updateSet.nrRegComCanonical = nrRegCom.sanitized;
      allFieldsUpdated.push("nrRegCom");
    }
    if (codCaen) {
      updateSet.codCaenPrincipal = codCaen;
      allFieldsUpdated.push("codCaenPrincipal");
    }
    allFieldsUpdated.push("metadata", "cui");

    await db
      .update(silverCompanies)
      .set(updateSet)
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

    const durationMs = Date.now() - startedAt;
    const sources = [
      {
        source: "anaf_fiscal" as const,
        payload: anafSummary,
        fields: ["denumire", "adresa", "statusFirma", "cui", "nrRegCom"],
      },
      { source: "anaf_tva" as const, payload: tvaSummary, fields: ["metadata"] },
      { source: "anaf_efactura" as const, payload: efacturaSummary, fields: ["metadata"] },
      {
        source: "anaf_datorii" as const,
        payload: datoriiSummary,
        fields: inactive ? ["statusFirma", "metadata"] : ["metadata"],
      },
      {
        source: "anaf_caen" as const,
        payload: caenSummary,
        fields: codCaen ? ["codCaenPrincipal", "metadata"] : ["metadata"],
      },
    ];

    for (const s of sources) {
      await db.insert(silverEnrichmentLog).values({
        tenantId: job.data.tenantId,
        entityType: "company",
        entityId: job.data.companyId,
        source: s.source,
        operation: "fetch",
        requestPayload: { cui: cleanedCui },
        responsePayload: s.payload,
        fieldsUpdated: s.fields,
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs,
      });
      await markEnrichmentSourceComplete(
        job.data.tenantId,
        job.data.companyId,
        s.source,
        job.data.correlationId,
      );
    }

    return {
      ok: true,
      status: "success",
      source: "anaf_full",
      cleanedCui,
      fieldsUpdated: allFieldsUpdated,
      cacheHit: cached !== "miss",
    };
  };
}
