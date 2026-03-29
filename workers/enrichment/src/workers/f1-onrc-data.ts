import type { Processor } from "bullmq";
import {
  db,
  silverCompanies,
  silverEnrichmentLog,
  setSessionTenantId,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import { sanitizeNrRegCom, withCognitiveSpan, importMutationTotal } from "@cerniq/worker-shared";
import { sanitizeCui } from "../lib/cui-validation.js";
import { getOnrcData } from "../lib/onrc-api-client.js";
import { markEnrichmentSourceComplete } from "../lib/enrichment-completion.js";

export type OnrcDataJobData = {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId?: string;
};

function extractOnrcNrRegCom(payload: unknown): { raw: string | null; canonical: string | null } {
  if (!payload || typeof payload !== "object") return { raw: null, canonical: null };
  const record = payload as Record<string, unknown>;
  const raw =
    (typeof record.nrRegCom === "string" && record.nrRegCom) ||
    (typeof record.nr_reg_com === "string" && record.nr_reg_com) ||
    (typeof record.numar_reg_comert === "string" && record.numar_reg_comert) ||
    (typeof record.nrRegComert === "string" && record.nrRegComert) ||
    null;
  const sanitized = raw ? sanitizeNrRegCom(raw) : null;
  // canonical is only set when ONRC provides new format directly (no slash = new canonical).
  // We do NOT auto-convert old format (J09/98/2003) to new canonical (J2003000098095).
  const canonical = sanitized && !sanitized.includes("/") ? sanitized : null;
  return { raw: sanitized, canonical };
}

function mapFormaJuridica(
  raw: string | null,
): "SRL" | "SA" | "PFA" | "II" | "IF" | "SNC" | "SCS" | "ONG" | "COOP" | "OTHER" {
  const value = String(raw ?? "").toUpperCase();
  if (value.includes("SRL")) return "SRL";
  if (value.includes("SA")) return "SA";
  if (value.includes("PFA")) return "PFA";
  if (value.includes("II")) return "II";
  if (value.includes("IF")) return "IF";
  if (value.includes("SNC")) return "SNC";
  if (value.includes("SCS")) return "SCS";
  if (value.includes("ONG")) return "ONG";
  if (value.includes("COOP")) return "COOP";
  return "OTHER";
}

export const onrcDataProcessor: Processor<OnrcDataJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:enrich:onrc-data",
    async (_span) => {
      const startedAt = Date.now();
      const cleanedCui = sanitizeCui(job.data.cui);
      await setSessionTenantId(job.data.tenantId);

      const payload = await getOnrcData(cleanedCui);
      const denumire = String(payload?.denumire ?? payload?.name ?? "").trim();
      const formaJuridica = mapFormaJuridica(String(payload?.forma_juridica ?? ""));
      const formaJuridicaValue = formaJuridica === "OTHER" ? undefined : formaJuridica;
      const adresa = String(payload?.adresa ?? payload?.address ?? "").trim();
      const nrRegCom = extractOnrcNrRegCom(payload);

      await db
        .update(silverCompanies)
        .set({
          cui: cleanedCui,
          denumire: denumire || undefined,
          formaJuridica: formaJuridicaValue,
          adresa: adresa || undefined,
          nrRegCom: nrRegCom.raw || undefined,
          nrRegComOriginal: nrRegCom.raw || undefined,
          // nrRegComCanonical: only set when ONRC provides new canonical format directly
          nrRegComCanonical: nrRegCom.canonical || undefined,
          metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{onrcData}', ${JSON.stringify(payload)}::jsonb)`,
          lastEnrichedAt: new Date(),
        })
        .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

      importMutationTotal.inc({
        operation: "update",
        table: "silver_companies",
        tenant_id: job.data.tenantId,
      });

      await upsertCompanyIdentityKey({
        tenantId: job.data.tenantId,
        companyId: job.data.companyId,
        keyType: "cui",
        keyValueCanonical: cleanedCui,
        keyValueOriginal: cleanedCui,
        sourceAuthority: "onrc",
      });
      if (nrRegCom.raw) {
        await upsertCompanyIdentityKey({
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          keyType: "nr_reg_com",
          // Use canonical (new format) if ONRC provided it directly; otherwise raw
          keyValueCanonical: nrRegCom.canonical ?? nrRegCom.raw,
          keyValueOriginal: nrRegCom.raw,
          sourceAuthority: "onrc",
          isAuthoritative: true,
        });
      }

      await db.insert(silverEnrichmentLog).values({
        tenantId: job.data.tenantId,
        entityType: "company",
        entityId: job.data.companyId,
        source: "onrc_data",
        operation: "fetch",
        requestPayload: { cui: cleanedCui },
        responsePayload: payload,
        fieldsUpdated: ["denumire", "formaJuridica", "adresa", "cui", "nrRegCom", "metadata"],
        correlationId: job.data.correlationId,
        jobId: String(job.id ?? ""),
        durationMs: Date.now() - startedAt,
      });
      await markEnrichmentSourceComplete(
        job.data.tenantId,
        job.data.companyId,
        "onrc_data",
        job.data.correlationId,
      );

      return {
        ok: true,
        status: payload ? "success" : "not_found",
        source: "onrc_data",
        cleanedCui,
      };
    },
    { tenantId: job.data.tenantId },
  );
};
