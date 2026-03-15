import type { Processor } from "bullmq";
import { createCircuitBreaker, createQueue, normalizeNrRegCom } from "@cerniq/worker-shared";
import {
  and,
  bronzeContacts,
  db,
  eq,
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

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${jobData.tenantId}, true)`);
    if (jobData.bronzeContactId) {
      await tx
        .update(bronzeContacts)
        .set({
          metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(notFoundPatch)}::jsonb`,
        })
        .where(sql`${bronzeContacts.id} = ${jobData.bronzeContactId}`);
    }
    // GAP-B4: Also update silverCompanies.metadata on not_found
    if (jobData.companyId) {
      await tx
        .update(silverCompanies)
        .set({
          metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(notFoundPatch)}::jsonb`,
        })
        .where(sql`${silverCompanies.id} = ${jobData.companyId}`);
    }
  });
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
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${jobData.tenantId}, true)`);
    await tx
      .update(silverCompanies)
      .set({
        denumire: denumireAnaf ?? sql`${silverCompanies.denumire}`,
        cui: cleanedCui,
        nrRegCom: nrRegCom.canonical ?? sql`${silverCompanies.nrRegCom}`,
        nrRegComOriginal: nrRegCom.raw ?? sql`${silverCompanies.nrRegComOriginal}`,
        metadata: sql`COALESCE(${silverCompanies.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      })
      .where(sql`${silverCompanies.id} = ${jobData.companyId}`);
  });
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
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${jobData.tenantId}, true)`);
    await tx
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
  });
}

async function fanOutAnafResultToSiblings(
  tenantId: string,
  cleanedCui: string,
  originContactId: string | undefined,
  companyData: AnafCompanyResult,
  nrRegCom: { raw: string | null; canonical: string | null },
  patch: Record<string, unknown>,
) {
  if (!originContactId) return;

  const siblings = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    return tx
      .select({ id: bronzeContacts.id })
      .from(bronzeContacts)
      .where(
        and(
          eq(bronzeContacts.tenantId, tenantId),
          eq(bronzeContacts.extractedCui, cleanedCui),
          sql`${bronzeContacts.id} != ${originContactId}`,
          sql`(${bronzeContacts.metadata}->'anafValidation'->>'status') IS DISTINCT FROM 'valid'`,
        ),
      );
  });

  if (siblings.length === 0) return;

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
    await tx
      .update(bronzeContacts)
      .set({
        extractedCuiRaw: cleanedCui,
        extractedCui: cleanedCui,
        extractedNrRegComRaw: nrRegCom.raw ?? sql`${bronzeContacts.extractedNrRegComRaw}`,
        extractedNrRegCom: nrRegCom.canonical ?? sql`${bronzeContacts.extractedNrRegCom}`,
        metadata: sql`COALESCE(${bronzeContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      })
      .where(
        and(
          eq(bronzeContacts.tenantId, tenantId),
          eq(bronzeContacts.extractedCui, cleanedCui),
          sql`${bronzeContacts.id} != ${originContactId}`,
          sql`(${bronzeContacts.metadata}->'anafValidation'->>'status') IS DISTINCT FROM 'valid'`,
        ),
      );
  });

  // Enqueue promotion for each sibling contact
  const promotionQueue = createQueue("pipeline:promote:bronze-silver");
  for (const sibling of siblings) {
    await promotionQueue.add(
      `promote-${sibling.id}`,
      {
        tenantId,
        bronzeContactId: sibling.id,
        cui: cleanedCui,
        correlationId: `fanout-${originContactId}`,
        anafData: companyData,
      },
      { jobId: `promote-${sibling.id}` },
    );
  }
  await promotionQueue.close();
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

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${job.data.tenantId}, true)`);
    await tx.insert(silverEnrichmentLog).values({
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
  });
}

export const cuiAnafValidatorProcessor: Processor<CuiAnafJobData> = async (job) => {
  const startedAt = Date.now();
  const cleanedCui = sanitizeCui(job.data.cui);
  if (!cleanedCui) {
    return { ok: false, status: "invalid", reason: "missing_cui", source: "anaf" };
  }

  // CUI dedup: check if another contact with same CUI was already validated via ANAF
  const alreadyValidated = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${job.data.tenantId}, true)`);
    return tx.query.bronzeContacts.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.tenantId, job.data.tenantId),
          eq(t.extractedCui, cleanedCui),
          sql`(${t.metadata}->'anafValidation'->>'status') = 'valid'`,
        ),
      columns: { id: true, metadata: true },
    });
  });

  if (alreadyValidated && alreadyValidated.id !== job.data.bronzeContactId) {
    const existingMeta = (alreadyValidated.metadata ?? {}) as Record<string, unknown>;
    const existingAnaf = existingMeta.anafValidation as Record<string, unknown> | undefined;
    if (existingAnaf) {
      const patch = { anafValidation: existingAnaf };
      const reusedCompanyData = (existingAnaf.response ?? null) as AnafCompanyResult | null;
      const nrRegCom = reusedCompanyData
        ? extractNrRegCom(reusedCompanyData)
        : { raw: null, canonical: null };
      await updateAnafBronzeContact(
        job.data,
        cleanedCui,
        reusedCompanyData ?? ({} as AnafCompanyResult),
        nrRegCom,
        patch,
      );
      await enqueueAnafPromotion(
        job.data,
        cleanedCui,
        reusedCompanyData ?? ({} as AnafCompanyResult),
      );
      return {
        ok: true,
        status: "valid",
        source: "anaf_dedup_reuse",
        cleanedCui,
        reusedFrom: alreadyValidated.id,
      };
    }
  }

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
  // Fan-out: update all sibling bronze contacts with same CUI that haven't been validated yet
  await fanOutAnafResultToSiblings(
    job.data.tenantId,
    cleanedCui,
    job.data.bronzeContactId,
    companyData,
    nrRegCom,
    patch,
  );
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
