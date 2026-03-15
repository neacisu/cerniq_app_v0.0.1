import type { Processor } from "bullmq";
import { createCircuitBreaker, createQueue, normalizeNrRegCom } from "@cerniq/worker-shared";
import {
  bronzeContacts,
  db,
  setSessionTenantId,
  silverCompanies,
  silverEnrichmentLog,
  sql,
  upsertCompanyIdentityKey,
} from "@cerniq/db";
import { sanitizeCui } from "../lib/cui-validation.js";

export type CuiAnafJobData = {
  tenantId: string;
  companyId?: string;
  bronzeContactId?: string;
  cui: string;
  correlationId: string;
};

function extractNrRegCom(value: unknown): { raw: string | null; canonical: string | null } {
  if (!value || typeof value !== "object") {
    return { raw: null, canonical: null };
  }
  const record = value as Record<string, unknown>;
  const rawCandidate =
    (typeof record.nrRegCom === "string" && record.nrRegCom) ||
    (typeof record.nr_reg_com === "string" && record.nr_reg_com) ||
    (typeof record.nrRegComert === "string" && record.nrRegComert) ||
    (typeof record.nr_reg_comert === "string" && record.nr_reg_comert) ||
    (typeof record.numar_reg_comert === "string" && record.numar_reg_comert) ||
    null;
  return {
    raw: rawCandidate,
    canonical: rawCandidate ? normalizeNrRegCom(rawCandidate) : null,
  };
}

type AnafCompanyResult = {
  denumire?: string;
  adresa?: string;
  scpTVA?: boolean;
  [key: string]: unknown;
};

const ANAF_API_URL =
  process.env.ANAF_API_URL ?? "https://webservicesp.anaf.ro/AsynchProdFurniz/api/v10/ws/tva";
const ANAF_TIMEOUT_MS = Number(process.env.ANAF_API_TIMEOUT_MS ?? "25000");

async function callAnafApi(cleanCui: string): Promise<AnafCompanyResult | null> {
  const payload = [
    { cui: Number.parseInt(cleanCui, 10), data: new Date().toISOString().split("T")[0] },
  ];
  const response = await fetch(ANAF_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(ANAF_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`ANAF API error: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data[0] as AnafCompanyResult;
  }
  if (
    data &&
    typeof data === "object" &&
    "found" in data &&
    Array.isArray((data as { found: unknown[] }).found) &&
    (data as { found: unknown[] }).found.length > 0
  ) {
    return (data as { found: AnafCompanyResult[] }).found[0];
  }

  return null;
}

const anafBreaker = createCircuitBreaker(
  async (...args: unknown[]) => callAnafApi(String(args[0] ?? "")),
  "anaf-cui-validation",
  {
    timeout: ANAF_TIMEOUT_MS,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
);

function buildAnafPatch(cleanedCui: string, companyData: AnafCompanyResult) {
  return {
    anafValidation: {
      status: "valid",
      cui: cleanedCui,
      validatedAt: new Date().toISOString(),
      response: companyData,
    },
  };
}

async function persistAnafNotFound(jobData: CuiAnafJobData, cleanedCui: string) {
  const notFoundPatch = {
    anafValidation: {
      status: "not_found",
      cui: cleanedCui,
      validatedAt: new Date().toISOString(),
    },
  };

  if (jobData.bronzeContactId) {
    await db
      .update(bronzeContacts)
      .set({
        metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(notFoundPatch)}::jsonb`,
      })
      .where(sql`${bronzeContacts.id} = ${jobData.bronzeContactId}`);
  }

  // GAP-B4: Also update silverCompanies.metadata on not_found
  if (jobData.companyId) {
    await db
      .update(silverCompanies)
      .set({
        metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(notFoundPatch)}::jsonb`,
      })
      .where(sql`${silverCompanies.id} = ${jobData.companyId}`);
  }
}

async function updateAnafCompany(
  jobData: CuiAnafJobData,
  cleanedCui: string,
  companyData: AnafCompanyResult,
  nrRegCom: { raw: string | null; canonical: string | null },
  patch: Record<string, unknown>,
) {
  if (!jobData.companyId) {
    return;
  }

  const denumireAnaf = typeof companyData.denumire === "string" ? companyData.denumire : null;
  await db
    .update(silverCompanies)
    .set({
      denumire: denumireAnaf ?? sql`${silverCompanies.denumire}`,
      cui: cleanedCui,
      nrRegCom: nrRegCom.canonical ?? sql`${silverCompanies.nrRegCom}`,
      nrRegComOriginal: nrRegCom.raw ?? sql`${silverCompanies.nrRegComOriginal}`,
      metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
    })
    .where(sql`${silverCompanies.id} = ${jobData.companyId}`);
  await upsertCompanyIdentityKey({
    tenantId: jobData.tenantId,
    companyId: jobData.companyId,
    keyType: "cui",
    keyValueCanonical: cleanedCui,
    keyValueOriginal: cleanedCui,
    sourceAuthority: "anaf",
    isAuthoritative: true,
    sourceBronzeId: jobData.bronzeContactId,
  });
  if (nrRegCom.canonical) {
    await upsertCompanyIdentityKey({
      tenantId: jobData.tenantId,
      companyId: jobData.companyId,
      keyType: "nr_reg_com",
      keyValueCanonical: nrRegCom.canonical,
      keyValueOriginal: nrRegCom.raw,
      sourceAuthority: "anaf",
      sourceBronzeId: jobData.bronzeContactId,
    });
  }
}

async function updateAnafBronzeContact(
  jobData: CuiAnafJobData,
  cleanedCui: string,
  companyData: AnafCompanyResult,
  nrRegCom: { raw: string | null; canonical: string | null },
  patch: Record<string, unknown>,
) {
  if (!jobData.bronzeContactId) {
    return;
  }

  const denumireAnaf = typeof companyData.denumire === "string" ? companyData.denumire : null;
  await db
    .update(bronzeContacts)
    .set({
      extractedName: denumireAnaf,
      extractedCuiRaw: cleanedCui,
      extractedCui: cleanedCui,
      extractedNrRegComRaw: nrRegCom.raw ?? sql`${bronzeContacts.extractedNrRegComRaw}`,
      extractedNrRegCom: nrRegCom.canonical ?? sql`${bronzeContacts.extractedNrRegCom}`,
      metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
    })
    .where(sql`${bronzeContacts.id} = ${jobData.bronzeContactId}`);
}

async function enqueueAnafPromotion(
  jobData: CuiAnafJobData,
  cleanedCui: string,
  companyData: AnafCompanyResult,
) {
  if (!jobData.bronzeContactId) {
    return;
  }

  try {
    const promotionQueue = createQueue("pipeline:promote:bronze-silver");
    await promotionQueue.add(
      `promote-${jobData.bronzeContactId}`,
      {
        tenantId: jobData.tenantId,
        bronzeContactId: jobData.bronzeContactId,
        cui: cleanedCui,
        correlationId: jobData.correlationId,
        anafData: companyData,
      },
      { jobId: `promote-${jobData.bronzeContactId}` },
    );
    await promotionQueue.close();
  } catch {
    // Non-critical: promotion can be triggered manually if auto-enqueue fails
  }
}

async function logAnafValidation(
  job: {
    data: CuiAnafJobData;
    id?: string | number;
  },
  cleanedCui: string,
  companyData: AnafCompanyResult,
  startedAt: number,
) {
  const entityId = job.data.companyId ?? job.data.bronzeContactId;
  if (!entityId) {
    return;
  }

  await db.insert(silverEnrichmentLog).values({
    tenantId: job.data.tenantId,
    entityType: job.data.companyId ? "company" : "contact",
    entityId,
    source: "anaf_cui_validation",
    operation: "validate",
    requestPayload: { cui: cleanedCui },
    responsePayload: { status: "valid", denumire: companyData.denumire },
    fieldsUpdated: ["metadata", "denumire", "cui", "nrRegCom"],
    correlationId: job.data.correlationId,
    jobId: String(job.id ?? ""),
    durationMs: Date.now() - startedAt,
  });
}

export const cuiAnafValidatorProcessor: Processor<CuiAnafJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  if (!cleanedCui) {
    return { ok: false, status: "invalid", reason: "missing_cui", source: "anaf" };
  }

  await setSessionTenantId(job.data.tenantId);
  const companyData = await anafBreaker.fire(cleanedCui);
  if (!companyData) {
    await persistAnafNotFound(job.data, cleanedCui);
    return {
      ok: true,
      status: "not_found",
      source: "anaf",
      cleanedCui,
    };
  }

  const patch = buildAnafPatch(cleanedCui, companyData);
  const nrRegCom = extractNrRegCom(companyData);
  await updateAnafCompany(job.data, cleanedCui, companyData, nrRegCom, patch);
  await updateAnafBronzeContact(job.data, cleanedCui, companyData, nrRegCom, patch);
  await enqueueAnafPromotion(job.data, cleanedCui, companyData);
  await logAnafValidation(job, cleanedCui, companyData, startedAt);

  return {
    ok: true,
    status: "valid",
    source: "anaf",
    cleanedCui,
    companyData,
  };
};
