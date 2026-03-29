import type { Processor } from "bullmq";
import {
  db,
  silverCompanies,
  silverEnrichmentLog,
  setSessionTenantId,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import {
  sanitizeNrRegCom,
  sanitizeCui,
  importMutationTotal,
  getRedisConnectionOptions,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import IORedis from "ioredis";
import { fetchAnafSingleByCui, type AnafV9CompanyRecord } from "../lib/anaf-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type AnafFullFetchJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

const CACHE_TTL_SECONDS = 300;
const CACHE_PREFIX = "anaf:cache:";

let _redis: IORedis | null = null;
function getCacheRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(getRedisConnectionOptions());
    _redis.on("error", (err) =>
      console.warn("[d0-anaf-cache] Redis error (non-fatal)", err.message),
    );
  }
  return _redis;
}

async function getCachedRecord(
  tenantId: string,
  cui: string,
): Promise<AnafV9CompanyRecord | null | undefined> {
  try {
    const raw = await getCacheRedis().get(`${CACHE_PREFIX}${tenantId}:${cui}`);
    if (raw === null) return undefined;
    if (raw === "NOT_FOUND") return null;
    return JSON.parse(raw) as AnafV9CompanyRecord;
  } catch {
    return undefined;
  }
}

async function setCachedRecord(
  tenantId: string,
  cui: string,
  record: AnafV9CompanyRecord | null,
): Promise<void> {
  try {
    const value = record === null ? "NOT_FOUND" : JSON.stringify(record);
    await getCacheRedis().setex(`${CACHE_PREFIX}${tenantId}:${cui}`, CACHE_TTL_SECONDS, value);
  } catch {
    // cache write failure is non-fatal
  }
}

const NEW_NR_REG_COM_RE = /^[JFC]\d{4}\d{6}\d{2}\d$/i;

function extractNrRegCom(record: AnafV9CompanyRecord) {
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

const ANAF_SOURCES = [
  "anaf_fiscal",
  "anaf_tva",
  "anaf_efactura",
  "anaf_datorii",
  "anaf_caen",
] as const;

export const anafFullFetchProcessor: Processor<AnafFullFetchJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:anaf-full-fetch",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      const { tenantId, companyId, correlationId } = job.data;
      await setSessionTenantId(tenantId);

      // Check Redis cache first — avoids hitting ANAF rate limits when
      // multiple sources (d1-d5) are replaced by a single d0 call.
      const cached = await getCachedRecord(tenantId, cleanedCui);
      let record: AnafV9CompanyRecord | null;
      if (cached === undefined) {
        record = await fetchAnafSingleByCui(cleanedCui);
        await setCachedRecord(tenantId, cleanedCui, record);
      } else {
        record = cached;
      }

      if (!record) {
        await db.insert(silverEnrichmentLog).values({
          tenantId,
          entityType: "company",
          entityId: companyId,
          source: "anaf_full",
          operation: "fetch",
          requestPayload: { cui: cleanedCui },
          responsePayload: null,
          fieldsUpdated: [],
          correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });
        for (const src of ANAF_SOURCES) {
          await markEnrichmentSourceComplete(tenantId, companyId, src, correlationId);
        }
        return { ok: true, status: "not_found", source: "anaf_full", cleanedCui };
      }

      // ── Extract all fields ──────────────────────────────────────────────────
      const dg = record.date_generale;

      // d1 — fiscal identity
      const denumire = dg?.denumire?.trim() || null;
      const adresa = dg?.adresa?.trim() || null;
      const statusFirma = mapStatus(dg?.stare_inregistrare);
      const nrRegCom = extractNrRegCom(record);

      // d2 — TVA
      const tvaActive = record.inregistrare_scop_Tva?.scpTVA ?? null;
      const tvaIncasare = record.inregistrare_RTVAI?.statusTvaIncasare ?? null;
      const perioade_TVA = record.inregistrare_scop_Tva?.perioade_TVA ?? [];

      // d3 — e-factură (statusRO_e_Factura on date_generale or dedicated array)
      const efacturaStatus = dg?.statusRO_e_Factura ?? null;
      const efacturaPeriods =
        ((record as Record<string, unknown>).inregistrare_RO_e_Factura as unknown[] | undefined) ??
        [];

      // d4 — datorii / insolvență (stored in metadata, no dedicated column)
      const stareInsolv = (record as Record<string, unknown>).stare_insolv ?? null;
      const stareInactivi = (record as Record<string, unknown>).stare_inactivi ?? null;

      // d5 — CAEN
      const codCaen = dg?.cod_CAEN?.trim() ?? "";
      const isAgricultural = codCaen ? isAgriculturalCaen(codCaen) : false;

      // ── Build composite metadata patch ─────────────────────────────────────
      const anafFiscalSummary = {
        cui: dg?.cui,
        denumire: dg?.denumire,
        adresa: dg?.adresa,
        stare_inregistrare: dg?.stare_inregistrare,
        cod_CAEN: dg?.cod_CAEN,
        nrRegCom: dg?.nrRegCom,
        statusRO_e_Factura: efacturaStatus,
      };
      const anafTvaSummary = { scpTVA: tvaActive, statusTvaIncasare: tvaIncasare, perioade_TVA };
      const anafEfacturaSummary = { status: efacturaStatus, periods: efacturaPeriods };
      const anafDatoriiSummary = { stareInsolv, stareInactivi };
      const anafCaenSummary = { codCaen, agricultural: isAgricultural };

      // Single UPDATE covering all d1-d5 fields
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
          codCaenPrincipal: codCaen || undefined,
          lastEnrichedAt: new Date(),
          metadata: sql`
          COALESCE(${silverCompanies.metadata}, '{}'::jsonb)
          || jsonb_build_object(
            'anafFiscal',   ${JSON.stringify(anafFiscalSummary)}::jsonb,
            'anafTva',      ${JSON.stringify(anafTvaSummary)}::jsonb,
            'anafEfactura', ${JSON.stringify(anafEfacturaSummary)}::jsonb,
            'anafDatorii',  ${JSON.stringify(anafDatoriiSummary)}::jsonb,
            'anafCaen',     ${JSON.stringify(anafCaenSummary)}::jsonb
          )
        `,
        })
        .where(sql`${silverCompanies.id} = ${companyId}`);

      // Identity keys (same as d1)
      await upsertCompanyIdentityKey({
        tenantId,
        companyId,
        keyType: "cui",
        keyValueCanonical: cleanedCui,
        keyValueOriginal: cleanedCui,
        sourceAuthority: "anaf",
        isAuthoritative: true,
      });
      if (nrRegCom.sanitized) {
        await upsertCompanyIdentityKey({
          tenantId,
          companyId,
          keyType: "nr_reg_com",
          keyValueCanonical: nrRegCom.sanitized,
          keyValueOriginal: nrRegCom.raw,
          sourceAuthority: "anaf",
        });
      }

      // Increment mutation counter (shared metrics)
      importMutationTotal.inc({
        operation: "update",
        table: "silver_companies",
        tenant_id: tenantId,
      });

      const fieldsUpdated = [
        "cui",
        "denumire",
        "adresa",
        "statusFirma",
        "nrRegCom",
        "codCaenPrincipal",
        "metadata",
      ];
      const responsePayload = {
        anafFiscal: anafFiscalSummary,
        anafTva: anafTvaSummary,
        anafEfactura: anafEfacturaSummary,
        anafDatorii: anafDatoriiSummary,
        anafCaen: anafCaenSummary,
      };

      await db.insert(silverEnrichmentLog).values({
        tenantId,
        entityType: "company",
        entityId: companyId,
        source: "anaf_full",
        operation: "fetch",
        requestPayload: { cui: cleanedCui },
        responsePayload,
        fieldsUpdated,
        correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });

      // Mark ALL d1-d5 sources complete so the pipeline does not re-enqueue them.
      for (const src of ANAF_SOURCES) {
        await markEnrichmentSourceComplete(tenantId, companyId, src, correlationId);
      }

      return {
        ok: true,
        status: "success",
        source: "anaf_full",
        cleanedCui,
        statusFirma,
        tvaActive,
        efacturaStatus,
        codCaenPrincipal: codCaen || null,
        isAgricultural,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
